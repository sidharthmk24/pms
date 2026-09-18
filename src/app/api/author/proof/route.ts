import { z } from "zod";
import { fail, handler, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stamp } from "@/lib/time";

const ProofDecisionSchema = z.object({
  projectId: z.string().min(1),
  decision: z.enum(["approve", "reject", "rework"]),
  comment: z.string().optional().default(""),
});

export const POST = handler(async (req: Request) => {
  const user = await requireApiUser();
  const json = await req.json().catch(() => null);
  const data = ProofDecisionSchema.parse(json);

  const proj = await prisma.production_projects.findUnique({
    where: { id: data.projectId },
    include: {
      titles: {
        include: {
          authors: true,
        },
      },
    },
  });

  if (!proj) return fail(404, "Production project not found");

  // Validate that the user is the author of this title, or staff
  let isAuthorized = user.role === "owner" || user.role === "production" || user.role === "editor";
  if (!isAuthorized) {
    if (proj.titles?.authors?.email && proj.titles.authors.email.toLowerCase() === user.email.toLowerCase()) {
      isAuthorized = true;
    } else {
      const linkedContract = await prisma.contracts.findFirst({
        where: {
          title_id: proj.title_id,
          OR: [
            { authors: { email: { equals: user.email, mode: "insensitive" } } },
            { term_notes: { contains: user.email } },
          ],
        },
      });
      if (linkedContract) isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return fail(403, "You do not have permission to approve this production project");
  }

  const now = stamp();

  if (data.decision === "reject" || data.decision === "rework") {
    await prisma.production_projects.update({
      where: { id: data.projectId },
      data: {
        status: "editing",
        editing_completed_at: null,
        proof_approved_at: null,
        proof_completed_at: null,
        proof_feedback: data.comment.trim() || "Author requested revisions during final proof review",
        updated_at: now,
      },
    });

    await audit({
      userId: user.id,
      action: "author_reject_proof",
      entity: "production_project",
      entityId: data.projectId,
      detail: { project_id: data.projectId, comment: data.comment },
    });

    return ok({ success: true, status: "editing" });
  }

  // Approve proof and record author sign-off
  await prisma.production_projects.update({
    where: { id: data.projectId },
    data: {
      status: "final_proof",
      proof_approved_at: now,
      proof_completed_at: now,
      proof_feedback: data.comment || null,
      updated_at: now,
    },
  });

  await audit({
    userId: user.id,
    action: "author_approve_proof",
    entity: "production_project",
    entityId: data.projectId,
    detail: { project_id: data.projectId },
  });

  return ok({ success: true, status: "final_proof" });
});
