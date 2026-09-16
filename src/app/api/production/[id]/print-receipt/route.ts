import { randomUUID } from "node:crypto";
import { z } from "zod";
import { fail, handler, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireApiCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stamp, dateOnly } from "@/lib/time";
import { rupeesToPaise } from "@/lib/money";
import { nextDocNo } from "@/lib/counters";
import { queueEmail, productionStageCompletedEmail } from "@/lib/mail";
import { notifyRoles, notifyAuthorByEmail } from "@/lib/notifications";

const PrintJobSchema = z.object({
  qty: z.number().positive("Quantity ordered must be a positive number"),
  paper: z.string().min(2, "Paper specs are required"),
  binding: z.string().min(2, "Binding details are required"),
  vendor: z.string().min(2, "Printing vendor is required"),
  costRupees: z.number().nonnegative("Cost must be non-negative"),
  notes: z.string().optional(),
});

export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireApiCapability("production_pipeline.manage");
  const { id } = await params;

  const json = await req.json().catch(() => null);
  const data = PrintJobSchema.parse(json);

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

  let finalPrintJobId = "";

  await prisma.$transaction(async (tx) => {
    // 1. Generate print job doc number and record the print job
    const jobNo = await nextDocNo(tx, "print_job", "PRT");
    const printJob = await tx.print_jobs.create({
      data: {
        id: randomUUID(),
        job_no: jobNo,
        title_id: proj.title_id,
        qty: data.qty,
        paper: data.paper,
        binding: data.binding,
        vendor: data.vendor,
        cost_paise: rupeesToPaise(data.costRupees),
        status: "completed",
        raised_on: today,
        received_on: today,
        notes: data.notes || `Offset print run executed by ${data.vendor} for ${data.qty} copies.`,
        created_by: user.id,
        created_at: now,
      },
    });
    finalPrintJobId = printJob.id;

    // 2. Advance production project to POST_PRODUCTION stage (NOT completed)
    await tx.production_projects.update({
      where: { id },
      data: {
        status: "post_production",
        print_job_id: printJob.id,
        print_completed_at: now,
        updated_at: now,
      },
    });
  });

    await audit({
    userId: user.id,
    action: "complete_production_printing",
    entity: "production_project",
    entityId: id,
    detail: {
      project_id: id,
      print_job_id: finalPrintJobId,
      ordered_qty: data.qty,
      vendor: data.vendor,
      cost_rupees: data.costRupees,
    },
  });

  // Notify author of printing completion and transition to post-production
  let authorEmail = proj.titles.authors?.email || null;
  const authorName = proj.titles.authors?.name || "Author";
  if (!authorEmail && proj.titles.contracts?.term_notes) {
    const emailMatch = proj.titles.contracts.term_notes.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) authorEmail = emailMatch[0];
  }

  // In-app notifications to store, accounts, and production
  await notifyRoles(["store", "accounts", "production", "owner"], {
    title: "Print Stock Received",
    message: `${data.qty} copies of "${proj.titles.name}" received from ${data.vendor || "printer"} into warehouse inventory.`,
    type: "STOCK",
    link: `/production/${id}`,
  }, user.id);

  if (authorEmail) {
    await notifyAuthorByEmail(authorEmail, {
      title: "Books Printed & Received at Warehouse",
      message: `${data.qty} copies of "${proj.titles.name}" printed and received at our central warehouse!`,
      type: "STOCK",
      link: `/author`,
    });

    const host = req.headers.get("host") || "localhost:3000";
    const protoHeader = req.headers.get("x-forwarded-proto");
    const protocol = protoHeader || (host.includes("localhost") ? "http" : "https");
    const baseUrl = `${protocol}://${host}`;
    const authorTrackingUrl = `${baseUrl}/author`;

    const mail = productionStageCompletedEmail({
      authorName,
      title: proj.titles.name,
      completedStageName: "Offset Printing Press Run",
      nextStageName: "Post-Production Intake & Warehouse Delivery",
      stageNote: `Offset printing press run of ${data.qty} copies is complete! Physical stock is en route to our central warehouse for QC and courier dispatch.`,
      trackingUrl: authorTrackingUrl,
    });

    await queueEmail({
      to: authorEmail,
      toName: authorName,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      template: "production_printing_complete",
      refType: "production_project",
      refId: id,
    });
  }

  return ok({
    success: true,
    printJobId: finalPrintJobId,
    status: "post_production",
  });
});

