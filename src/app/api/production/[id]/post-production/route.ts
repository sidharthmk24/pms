import { randomUUID } from "node:crypto";
import { z } from "zod";
import { fail, handler, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireApiCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stamp, dateOnly } from "@/lib/time";
import { parseContractNotes } from "@/lib/contracts";
import { queueEmail, publicationCelebrationEmail } from "@/lib/mail";

const PostProductionSchema = z.object({
  receivedQty: z.number().positive("Delivered quantity must be greater than 0"),
  damagedQty: z.number().nonnegative("Transit/binder damaged quantity cannot be negative").default(0),
  authorCopiesQty: z.number().nonnegative("Author copies cannot be negative").optional(),
  authorDispatchImmediate: z.boolean().default(true),
  authorDispatchTracking: z.string().optional(),
  qcPassed: z.boolean().default(true),
  qcNotes: z.string().optional(),
  channels: z.array(z.string()).default(["retail", "dealer", "fair", "online"]),
});

export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireApiCapability("production_pipeline.manage");
  const { id } = await params;

  const json = await req.json().catch(() => null);
  const data = PostProductionSchema.parse(json);

  if (!data.qcPassed) {
    return fail(422, "Quality Control (QC) inspection must pass before stock can be released into warehouse inventory.");
  }

  const proj = await prisma.production_projects.findUnique({
    where: { id },
    include: {
      titles: {
        include: {
          contracts: true,
          authors: true,
        },
      },
      print_jobs: true,
    },
  });
  if (!proj) return fail(404, "Production project not found");

  if (proj.status !== "post_production" && proj.status !== "printing") {
    return fail(422, "This project must be in the post-production stage to complete warehouse handover");
  }

  const now = stamp();
  const receivedQty = data.receivedQty;
  const damagedQty = data.damagedQty;

  if (damagedQty > receivedQty) {
    return fail(422, "Damaged copies cannot exceed physically delivered quantity at warehouse");
  }

  const usableCopies = receivedQty - damagedQty;

  // Track resolution: Kairali Books Publishing vs Self-Publishing
  const contract = proj.titles.contracts;
  const contractMeta = parseContractNotes(contract?.term_notes);
  const publishingType = contractMeta.publishing_type ?? "kairali_funded";
  const isSelfPublishing = publishingType === "self_publishing";

  let authorCopies = 0;
  if (data.authorCopiesQty !== undefined) {
    authorCopies = data.authorCopiesQty;
  } else if (isSelfPublishing) {
    authorCopies = Math.min(contractMeta.free_copies || 100, usableCopies);
  } else {
    authorCopies = Math.min(contractMeta.free_copies || 10, usableCopies);
  }

  if (authorCopies > usableCopies) {
    return fail(422, `Author copies (${authorCopies}) cannot exceed usable copies (${usableCopies})`);
  }

  const commercialWarehouseCopies = usableCopies - authorCopies;

  await prisma.$transaction(async (tx) => {
    // 1. Fetch current title stock balance
    const title = await tx.titles.findUnique({
      where: { id: proj.title_id },
    });
    if (!title) throw new Error("Linked Title record not found");

    let runningBalance = title.stock;

    // Movement 1: Inward delivery of entire received shipment
    runningBalance += receivedQty;
    await tx.stock_movements.create({
      data: {
        id: randomUUID(),
        title_id: proj.title_id,
        qty_delta: receivedQty,
        reason: "print_receipt",
        ref_type: "production_project",
        ref_id: proj.id,
        balance_after: runningBalance,
        note: `Delivered at Warehouse from press: ${receivedQty} copies`,
        user_id: user.id,
        at: now,
      },
    });

    // Movement 2: Transit / Binder damages segregation
    if (damagedQty > 0) {
      runningBalance -= damagedQty;
      await tx.stock_movements.create({
        data: {
          id: randomUUID(),
          title_id: proj.title_id,
          qty_delta: -damagedQty,
          reason: "damage",
          ref_type: "production_project",
          ref_id: proj.id,
          balance_after: runningBalance,
          note: `QC & Inspection: ${damagedQty} transit / binder damages segregated. Notes: ${data.qcNotes || "None"}`,
          user_id: user.id,
          at: now,
        },
      });
    }

    // Movement 3: Author complimentary copies allocation
    if (authorCopies > 0) {
      runningBalance -= authorCopies;
      const trackingNote = data.authorDispatchTracking
        ? ` (Courier Tracking: ${data.authorDispatchTracking})`
        : "";
      await tx.stock_movements.create({
        data: {
          id: randomUUID(),
          title_id: proj.title_id,
          qty_delta: -authorCopies,
          reason: "adjustment",
          ref_type: "production_project",
          ref_id: proj.id,
          balance_after: runningBalance,
          note: `${isSelfPublishing ? "Self-publishing author package copies" : "Kairali Books Publishing author complimentary copies"} allocated${trackingNote}`,
          user_id: user.id,
          at: now,
        },
      });
    }

    // Update Title with resulting stock and make status active
    await tx.titles.update({
      where: { id: proj.title_id },
      data: {
        stock: runningBalance,
        status: "active",
      },
    });

    // 4. Update Production Project to completed
    await tx.production_projects.update({
      where: { id },
      data: {
        status: "completed",
        post_production_completed_at: now,
        handover_completed_at: now,
        qc_passed_at: now,
        qc_notes: data.qcNotes || "QC Inspection Passed & Verified OK",
        damaged_qty: damagedQty,
        author_copies_qty: authorCopies,
        author_copies_dispatched_at: data.authorDispatchImmediate ? now : null,
        author_dispatch_tracking: data.authorDispatchTracking || null,
        warehouse_received_qty: commercialWarehouseCopies,
        channels_activated: (data.channels || ["retail", "dealer", "fair", "online"]).join(","),
        updated_at: now,
      },
    });
  });

  await audit({
    userId: user.id,
    action: "complete_post_production_and_handover",
    entity: "production_project",
    entityId: id,
    detail: {
      project_id: id,
      received_qty: receivedQty,
      damaged_qty: damagedQty,
      author_copies: authorCopies,
      warehouse_stock_added: commercialWarehouseCopies,
      channels_activated: data.channels,
      courier_tracking: data.authorDispatchTracking,
    },
  });

  // Trigger celebration email to author
  let authorEmail = proj.titles.authors?.email || null;
  const authorName = proj.titles.authors?.name || "Author";
  if (!authorEmail && proj.titles.contracts?.term_notes) {
    const emailMatch = proj.titles.contracts.term_notes.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) authorEmail = emailMatch[0];
  }

  if (authorEmail) {
    const host = req.headers.get("host") || "localhost:3000";
    const protoHeader = req.headers.get("x-forwarded-proto");
    const protocol = protoHeader || (host.includes("localhost") ? "http" : "https");
    const baseUrl = `${protocol}://${host}`;
    const authorTrackingUrl = `${baseUrl}/author`;

    const mail = publicationCelebrationEmail({
      authorName,
      title: proj.titles.name,
      isbn: proj.titles.isbn || proj.isbn_registered,
      authorCopiesQty: authorCopies,
      courierTracking: data.authorDispatchTracking,
      channels: data.channels,
      trackingUrl: authorTrackingUrl,
    });

    await queueEmail({
      to: authorEmail,
      toName: authorName,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      template: "publication_celebration",
      refType: "production_project",
      refId: id,
    });
  }

  return ok({
    success: true,
    warehouseAdded: commercialWarehouseCopies,
    authorCopies,
    status: "completed",
  });
});

const UpdateDispatchSchema = z.object({
  tracking: z.string().min(2, "Courier and tracking docket details are required"),
  dispatchedAt: z.string().optional(),
});

export const PATCH = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireApiCapability("production_pipeline.manage");
  const { id } = await params;

  const json = await req.json().catch(() => null);
  const data = UpdateDispatchSchema.parse(json);

  const proj = await prisma.production_projects.findUnique({
    where: { id },
  });
  if (!proj) return fail(404, "Production project not found");

  const now = stamp();
  const dispatchedAt = data.dispatchedAt || now;

  await prisma.production_projects.update({
    where: { id },
    data: {
      author_copies_dispatched_at: dispatchedAt,
      author_dispatch_tracking: data.tracking,
      updated_at: now,
    },
  });

  await audit({
    userId: user.id,
    action: "dispatch_author_copies",
    entity: "production_project",
    entityId: id,
    detail: {
      project_id: id,
      tracking: data.tracking,
      dispatched_at: dispatchedAt,
    },
  });

  return ok({ success: true, tracking: data.tracking, dispatchedAt });
});
