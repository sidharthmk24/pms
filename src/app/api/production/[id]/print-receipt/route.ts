import { randomUUID } from "node:crypto";
import { z } from "zod";
import { fail, handler, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireApiCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stamp, dateOnly } from "@/lib/time";
import { rupeesToPaise } from "@/lib/money";
import { nextDocNo } from "@/lib/counters";

const PrintReceiptSchema = z.object({
  qty: z.number().positive("Quantity must be a positive number"),
  paper: z.string().min(2, "Paper specs are required"),
  binding: z.string().min(2, "Binding details are required"),
  vendor: z.string().min(2, "Printing vendor is required"),
  costRupees: z.number().nonnegative("Cost must be non-negative"),
});

export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireApiCapability("production_pipeline.manage");
  const { id } = await params;

  const json = await req.json().catch(() => null);
  const data = PrintReceiptSchema.parse(json);

  const proj = await prisma.production_projects.findUnique({
    where: { id },
  });
  if (!proj) return fail(404, "Production project not found");

  if (proj.status !== "printing") {
    return fail(422, "This project is not ready for print receipt");
  }

  const now = stamp();
  const today = dateOnly();

  let finalPrintJobId = "";
  let compCopiesCount = 0;

  await prisma.$transaction(async (tx) => {
    // 1. Generate print job document number and record the print job
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
        notes: `Automatically received and completed from production project ${proj.id}`,
        created_by: user.id,
        created_at: now,
      },
    });
    finalPrintJobId = printJob.id;

    // 2. Fetch title stock to update it
    const title = await tx.titles.findUnique({
      where: { id: proj.title_id },
    });
    if (!title) throw new Error("Linked Title record not found");

    const initialStock = title.stock;
    const stockAfterReceipt = initialStock + data.qty;

    // Update Title Stock with printed quantity
    await tx.titles.update({
      where: { id: proj.title_id },
      data: { stock: stockAfterReceipt },
    });

    // Write stock receipt movement log
    await tx.stock_movements.create({
      data: {
        id: randomUUID(),
        title_id: proj.title_id,
        qty_delta: data.qty,
        reason: "print_receipt",
        ref_type: "print_job",
        ref_id: printJob.id,
        balance_after: stockAfterReceipt,
        note: `Printed copies delivered from job ${printJob.job_no}`,
        user_id: user.id,
        at: now,
      },
    });

    // 3. System auto-logs complimentary copies: 5 copies per 200 printed
    const compCopies = Math.floor(data.qty / 200) * 5;
    compCopiesCount = compCopies;

    if (compCopies > 0) {
      const stockAfterComp = stockAfterReceipt - compCopies;

      // Update Title Stock with deduction
      await tx.titles.update({
        where: { id: proj.title_id },
        data: { stock: stockAfterComp },
      });

      // Write adjustment stock movement log for complimentary copies
      await tx.stock_movements.create({
        data: {
          id: randomUUID(),
          title_id: proj.title_id,
          qty_delta: -compCopies,
          reason: "adjustment",
          ref_type: "print_job",
          ref_id: printJob.id,
          balance_after: stockAfterComp,
          note: `Complimentary copies auto-deducted (5 per 200 printed from job ${printJob.job_no})`,
          user_id: user.id,
          at: now,
        },
      });
    }

    // 4. Update the Production project to Completed status
    await tx.production_projects.update({
      where: { id },
      data: {
        status: "completed",
        print_job_id: printJob.id,
        print_completed_at: now,
        updated_at: now,
      },
    });
  });

  await audit({
    userId: user.id,
    action: "complete_production_print_receipt",
    entity: "production_project",
    entityId: id,
    detail: {
      project_id: id,
      print_job_id: finalPrintJobId,
      qty_printed: data.qty,
      comp_copies_logged: compCopiesCount,
    },
  });

  return ok({ success: true });
});
