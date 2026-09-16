import { z } from "zod";
import { fail, handler, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireApiCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stamp } from "@/lib/time";

import { hasRole } from "@/lib/roles";
import { createNotification, notifyRoles, notifyAuthorByEmail } from "@/lib/notifications";

const ReassignSchema = z.object({
  editorId: z.string().nullable(),
});

export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireApiCapability("submissions.manage");
  const { id } = await params;

  const json = await req.json().catch(() => null);
  const { editorId } = ReassignSchema.parse(json);

  const sub = await prisma.submissions.findUnique({
    where: { id },
  });
  if (!sub) return fail(404, "Submission not found");

  let editorUser: { id: string; name: string } | null = null;
  if (editorId) {
    const editor = await prisma.users.findFirst({
      where: {
        id: editorId,
        active: true,
        role: { not: "author" },
      },
    });
    if (!editor || (!hasRole(editor.role, "editor") && !hasRole(editor.role, "owner"))) {
      return fail(422, "Invalid editor selected: user must have an active Editor account");
    }
    editorUser = { id: editor.id, name: editor.name };
  }

  const now = stamp();
  await prisma.submissions.update({
    where: { id },
    data: {
      reviewed_by: editorId,
      assigned_at: editorId ? now : null,
      status: editorId ? "under_review" : "new",
      updated_at: now,
    },
  });

  await audit({
    userId: user.id,
    action: "reassign_submission",
    entity: "submission",
    entityId: id,
    detail: { ref_no: sub.ref_no, title: sub.title, previous_editor: sub.reviewed_by, new_editor: editorId },
  });

  if (editorId && editorUser) {
    // Notify the assigned editor
    await createNotification(editorId, {
      title: "Manuscript Assigned",
      message: `You have been assigned to evaluate "${sub.title}" (${sub.ref_no}).`,
      type: "TASK",
      link: `/submissions/${sub.id}`,
    });

    // Notify author of progress
    await notifyAuthorByEmail(sub.email, {
      title: "Manuscript Under Evaluation",
      message: `Your manuscript "${sub.title}" has been assigned to an editor for review.`,
      type: "SUBMISSION",
      link: `/author`,
    });

    // Notify owners if reassigned by someone else
    await notifyRoles(["owner"], {
      title: "Manuscript Assigned",
      message: `"${sub.title}" assigned to ${editorUser.name} by ${user.name}.`,
      type: "SUBMISSION",
      link: `/submissions/${sub.id}`,
    }, user.id);
  }

  return ok({ success: true });
});

