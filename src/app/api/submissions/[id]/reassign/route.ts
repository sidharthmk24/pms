import { z } from "zod";
import { fail, handler, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireApiCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stamp } from "@/lib/time";

import { hasRole } from "@/lib/roles";

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

  return ok({ success: true });
});
