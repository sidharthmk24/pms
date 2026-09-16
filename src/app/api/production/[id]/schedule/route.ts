import { z } from "zod";
import { fail, handler, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireApiCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stamp } from "@/lib/time";

import { notifyUsers, notifyAuthorOfTitle } from "@/lib/notifications";

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

function parseAssignees(val: string | string[] | null | undefined): { primary: string | null; all: string | null; list: string[] } {
  if (!val) return { primary: null, all: null, list: [] };
  const arr = Array.isArray(val)
    ? val.map((v) => v.trim()).filter(Boolean)
    : val.split(",").map((v) => v.trim()).filter(Boolean);
  if (arr.length === 0) return { primary: null, all: null, list: [] };
  return { primary: arr[0], all: arr.join(","), list: arr };
}

export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireApiCapability("production_pipeline.write");
  const { id } = await params;

  const json = await req.json().catch(() => null);
  const data = ScheduleSchema.parse(json);

  const proj = await prisma.production_projects.findUnique({
    where: { id },
    include: {
      titles: {
        include: {
          authors: true,
        },
      },
    },
  });
  if (!proj) return fail(404, "Production project not found");

  const titleName = proj.titles?.name || "Book";
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

  // Notify DTP assignees
  if (dtp.list.length > 0) {
    await notifyUsers(dtp.list, {
      title: "Task Assigned: Typesetting & Layout (DTP)",
      message: `You have been assigned to typesetting for "${titleName}"${data.dtpDeadline ? ` (Deadline: ${data.dtpDeadline})` : ""}.`,
      type: "TASK",
      link: `/production/${id}`,
    }, user.id);
  }

  // Notify Editing assignees
  if (editing.list.length > 0) {
    await notifyUsers(editing.list, {
      title: "Task Assigned: Editorial Review",
      message: `You have been assigned to editorial review for "${titleName}"${data.editingDeadline ? ` (Deadline: ${data.editingDeadline})` : ""}.`,
      type: "TASK",
      link: `/production/${id}`,
    }, user.id);
  }

  // Notify Cover design assignees
  if (cover.list.length > 0) {
    await notifyUsers(cover.list, {
      title: "Task Assigned: Cover Design",
      message: `You have been assigned to cover art design for "${titleName}"${data.coverDeadline ? ` (Deadline: ${data.coverDeadline})` : ""}.`,
      type: "TASK",
      link: `/production/${id}`,
    }, user.id);
  }

  // Notify ISBN assignees
  if (isbn.list.length > 0) {
    await notifyUsers(isbn.list, {
      title: "Task Assigned: ISBN & CIP Registration",
      message: `You have been assigned to ISBN registration for "${titleName}"${data.isbnDeadline ? ` (Deadline: ${data.isbnDeadline})` : ""}.`,
      type: "TASK",
      link: `/production/${id}`,
    }, user.id);
  }

  // Notify Proofreader assignees
  if (proof.list.length > 0) {
    await notifyUsers(proof.list, {
      title: "Task Assigned: Final Proof Inspection",
      message: `You have been assigned to proofreading for "${titleName}"${data.proofDeadline ? ` (Deadline: ${data.proofDeadline})` : ""}.`,
      type: "TASK",
      link: `/production/${id}`,
    }, user.id);
  }

  // Notify author that production schedule has been established
  await notifyAuthorOfTitle(proj.title_id, {
    title: "Production Pipeline Scheduled",
    message: `Production schedule & milestones for "${titleName}" have been configured.`,
    type: "PRODUCTION",
    link: `/author`,
  });

  return ok({ success: true });
});

