import { randomUUID } from "node:crypto";
import { z } from "zod";
import { fail, handler, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireApiCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stamp, dateOnly } from "@/lib/time";
import { rupeesToPaise } from "@/lib/money";
import { nextDocNo } from "@/lib/counters";
import { parseContractNotes } from "@/lib/contracts";

const PrintReceiptSchema = z.object({
  qty: z.number().positive("Quantity ordered must be a positive number"),
  receivedQty: z.number().positive("Received quantity must be positive").optional(),
  damagedQty: z.number().nonnegative("Damaged quantity cannot be negative").default(0),
  paper: z.string().min(2, "Paper specs are required"),
  binding: z.string().min(2, "Binding details are required"),
  vendor: z.string().min(2, "Printing vendor is required"),
  costRupees: z.number().nonnegative("Cost must be non-negative"),
  qcNotes: z.string().optional(),
  qcPassed: z.boolean().default(true),
  authorCopiesQty: z.number().nonnegative().optional(),
  authorDispatchImmediate: z.boolean().default(true),
  authorDispatchTracking: z.string().optional(),
  channels: z.array(z.string()).default(["retail", "dealer", "fair", "online"]),
});

export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireApiCapability("production_pipeline.manage");
  const { id } = await params;

  const json = await req.json().catch(() => null);
  const data = PrintReceiptSchema.parse(json);

  if (!data.qcPassed) {
    return fail(422, "Quality inspection (QC) must pass before stock can be received into inventory.");
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
    },
  });
  if (!proj) return fail(404, "Production project not found");

  if (proj.status !== "printing") {
    return fail(422, "This project is not in the printing stage");
  }

  const now = stamp();
  const today = dateOnly();

  const orderedQty = data.qty;
  const receivedQty = data.receivedQty ?? orderedQty;
  const damagedQty = data.damagedQty ?? 0;

  if (damagedQty > receivedQty) {
    return fail(422, "Damaged quantity cannot exceed physically received quantity");
  }

  const goodUsableCopies = receivedQty - damagedQty;

  // Track resolution: Kairali Books Publishing vs Self-Publishing
  const contract = proj.titles.contracts;
  const contractMeta = parseContractNotes(contract?.term_notes);
  const publishingType = contractMeta.publishing_type ?? "kairali_funded";
  const isSelfPublishing = publishingType === "self_publishing";

  // Calculate author copies allocation
  let authorCopies = 0;
  if (data.authorCopiesQty !== undefined) {
    authorCopies = data.authorCopiesQty;
  } else if (isSelfPublishing) {
    // For self-publishing: default author allocation or contract free copies
    authorCopies = Math.min(contractMeta.free_copies || 100, goodUsableCopies);
  } else {
    // Kairali Books Publishing: standard complimentary copies from contract
    authorCopies = Math.min(contractMeta.free_copies || 10, goodUsableCopies);
  }

  if (authorCopies > goodUsableCopies) {
    return fail(422, `Author copies (${authorCopies}) cannot exceed usable copies (${goodUsableCopies})`);
  }

  const commercialWarehouseCopies = goodUsableCopies - authorCopies;

  let finalPrintJobId = "";

  await prisma.$transaction(async (tx) => {
    // 1. Generate print job document number and record the print job
    const jobNo = await nextDocNo(tx, "print_job", "PRT");
    const printJob = await tx.print_jobs.create({
      data: {
        id: randomUUID(),
        job_no: jobNo,
        title_id: proj.title_id,
        qty: orderedQty,
        paper: data.paper,
        binding: data.binding,
        vendor: data.vendor,
        cost_paise: rupeesToPaise(data.costRupees),
        status: "completed",
        raised_on: today,
        received_on: today,
        notes: `Received from print run: ${receivedQty} delivered, ${damagedQty} transit damages, ${authorCopies} author allocation (${isSelfPublishing ? "Self-Publishing" : "Kairali Books Publishing"}), ${commercialWarehouseCopies} commercial warehouse intake.`,
        created_by: user.id,
        created_at: now,
      },
    });
    finalPrintJobId = printJob.id;

    // 2. Fetch current title stock balance
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
        ref_type: "print_job",
        ref_id: printJob.id,
        balance_after: runningBalance,
        note: `Physical books delivered from press job ${printJob.job_no}`,
        user_id: user.id,
        at: now,
      },
    });

    // Movement 2: If damages found during QC inspection
    if (damagedQty > 0) {
      runningBalance -= damagedQty;
      await tx.stock_movements.create({
        data: {
          id: randomUUID(),
          title_id: proj.title_id,
          qty_delta: -damagedQty,
          reason: "damage",
          ref_type: "print_job",
          ref_id: printJob.id,
          balance_after: runningBalance,
          note: `QC inspection: ${damagedQty} damaged copies segregated / written off. Notes: ${data.qcNotes || "None"}`,
          user_id: user.id,
          at: now,
        },
      });
    }

    // Movement 3: Author copies segregation / dispatch
    if (authorCopies > 0) {
      runningBalance -= authorCopies;
      const dispatchNote = data.authorDispatchImmediate && data.authorDispatchTracking
        ? ` (Dispatched via ${data.authorDispatchTracking})`
        : "";
      await tx.stock_movements.create({
        data: {
          id: randomUUID(),
          title_id: proj.title_id,
          qty_delta: -authorCopies,
          reason: "adjustment",
          ref_type: "print_job",
          ref_id: printJob.id,
          balance_after: runningBalance,
          note: `${isSelfPublishing ? "Self-publishing author package copies" : "Kairali Books Publishing complimentary author copies"} allocated${dispatchNote}`,
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

    // 4. Update Production Project to completed with all post-production milestone details
    await tx.production_projects.update({
      where: { id },
      data: {
        status: "completed",
        print_job_id: printJob.id,
        print_completed_at: now,
        qc_passed_at: now,
        qc_notes: data.qcNotes || "QC Inspection Passed & Verified OK",
        damaged_qty: damagedQty,
        author_copies_qty: authorCopies,
        author_copies_dispatched_at: data.authorDispatchImmediate ? now : null,
        author_dispatch_tracking: data.authorDispatchTracking || null,
        warehouse_received_qty: commercialWarehouseCopies,
        channels_activated: (data.channels || ["retail", "dealer", "fair", "online"]).join(","),
        handover_completed_at: now,
        updated_at: now,
      },
    });
  });

  await audit({
    userId: user.id,
    action: "complete_production_and_handover",
    entity: "production_project",
    entityId: id,
    detail: {
      project_id: id,
      print_job_id: finalPrintJobId,
      publishing_type: publishingType,
      ordered_qty: orderedQty,
      received_qty: receivedQty,
      damaged_qty: damagedQty,
      author_copies: authorCopies,
      warehouse_stock_added: commercialWarehouseCopies,
      channels_activated: data.channels,
      handover_completed: true,
    },
  });

  return ok({
    success: true,
    printJobId: finalPrintJobId,
    warehouseAdded: commercialWarehouseCopies,
    authorCopies,
  });
});

const UpdateDispatchSchema = z.object({
  tracking: z.string().min(2, "Courier and tracking details are required"),
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
