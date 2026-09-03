import { z } from "zod";
import { fail, handler, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireApiCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stamp } from "@/lib/time";

const AssigneeField = z.union([z.string(), z.array(z.string())]).nullable().optional();

const ScheduleSchema = z.object({
  dtpAssignedTo: AssigneeField,
  dtpDeadline: z.string().nullable().optional(),
  editingAssignedTo: AssigneeField,
  editingDeadline: z.string().nullable().optional(),
  coverAssignedTo: AssigneeField,
  coverDeadline: z.string().nullable().optional(),
  isbnAssignedTo: AssigneeField,
  isbnDeadline: z.string().nullable().optional(),
  proofAssignedTo: AssigneeField,
  proofDeadline: z.string().nullable().optional(),
});

function parseAssignees(val: string | string[] | null | undefined): { primary: string | null; all: string | null } {
  if (!val) return { primary: null, all: null };
  const arr = Array.isArray(val)
    ? val.map((v) => v.trim()).filter(Boolean)
    : val.split(",").map((v) => v.trim()).filter(Boolean);
  if (arr.length === 0) return { primary: null, all: null };
  return { primary: arr[0], all: arr.join(",") };
}

export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireApiCapability("production_pipeline.write");
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

  const dtp = parseAssignees(data.dtpAssignedTo);
  const editing = parseAssignees(data.editingAssignedTo);
  const cover = parseAssignees(data.coverAssignedTo);
  const isbn = parseAssignees(data.isbnAssignedTo);
  const proof = parseAssignees(data.proofAssignedTo);

  await prisma.production_projects.update({
    where: { id },
    data: {
      status: newStatus,
      dtp_assigned_to: dtp.primary,
      dtp_assignees: dtp.all,
      dtp_deadline: data.dtpDeadline ?? null,
      editing_assigned_to: editing.primary,
      editing_assignees: editing.all,
      editing_deadline: data.editingDeadline ?? null,
      cover_assigned_to: cover.primary,
      cover_assignees: cover.all,
      cover_deadline: data.coverDeadline ?? null,
      isbn_assigned_to: isbn.primary,
      isbn_assignees: isbn.all,
      isbn_deadline: data.isbnDeadline ?? null,
      proof_assigned_to: proof.primary,
      proof_assignees: proof.all,
      proof_deadline: data.proofDeadline ?? null,
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
