import { z } from "zod";
import { fail, handler, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireApiCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stamp } from "@/lib/time";

const ScheduleSchema = z.object({
  dtpAssignedTo: z.string().nullable(),
  dtpDeadline: z.string().nullable(),
  editingAssignedTo: z.string().nullable(),
  editingDeadline: z.string().nullable(),
  coverAssignedTo: z.string().nullable(),
  coverDeadline: z.string().nullable(),
  isbnAssignedTo: z.string().nullable(),
  isbnDeadline: z.string().nullable(),
  proofAssignedTo: z.string().nullable(),
  proofDeadline: z.string().nullable(),
});

export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireApiCapability("production_pipeline.manage");
  const { id } = await params;

  const json = await req.json().catch(() => null);
  const data = ScheduleSchema.parse(json);

  const proj = await prisma.production_projects.findUnique({
    where: { id },
  });
  if (!proj) return fail(404, "Production project not found");

  const now = stamp();
  
  // If project is brand new ('under_contract'), setting the schedule advances status to DTP
  const newStatus = proj.status === "under_contract" ? "dtp" : proj.status;

  await prisma.production_projects.update({
    where: { id },
    data: {
      status: newStatus,
      dtp_assigned_to: data.dtpAssignedTo,
      dtp_deadline: data.dtpDeadline,
      editing_assigned_to: data.editingAssignedTo,
      editing_deadline: data.editingDeadline,
      cover_assigned_to: data.coverAssignedTo,
      cover_deadline: data.coverDeadline,
      isbn_assigned_to: data.isbnAssignedTo,
      isbn_deadline: data.isbnDeadline,
      proof_assigned_to: data.proofAssignedTo,
      proof_deadline: data.proofDeadline,
      updated_at: now,
    },
  });

  await audit({
    userId: user.id,
    action: "update_production_schedule",
    entity: "production_project",
    entityId: id,
    detail: { project_id: id, status: newStatus },
  });

  return ok({ success: true });
});
