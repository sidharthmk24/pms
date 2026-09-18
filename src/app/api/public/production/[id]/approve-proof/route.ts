import { z } from "zod";
import { fail, handler, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { stamp } from "@/lib/time";
import { getSessionUser } from "@/lib/session";
import { queueEmail, productionStageCompletedEmail } from "@/lib/mail";

import { notifyRoles, notifyUsers, notifyAuthorByEmail } from "@/lib/notifications";

function getAssignees(primary: string | null, assignees: string | null): string[] {
  const ids: string[] = [];
  if (primary) ids.push(primary);
  if (assignees) ids.push(...assignees.split(",").map((s) => s.trim()).filter(Boolean));
  return Array.from(new Set(ids));
}

const ApproveProofSchema = z.object({
  token: z.string().min(1, "Approval token is required"),
  action: z.enum(["approve", "rework"]).default("approve"),
  notes: z.string().optional(),
});

export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const json = await req.json().catch(() => null);
  const data = ApproveProofSchema.parse(json);

  const proj = await prisma.production_projects.findUnique({
    where: { id },
    include: {
      titles: {
        include: {
          authors: true,
          contracts: true,
        },
      },
    },
  });
  if (!proj) return fail(404, "Production project not found");

  // Validate security token or active session
  const sessionUser = await getSessionUser();
  let isAuthorized = false;

  if (proj.proof_token && data.token === proj.proof_token) {
    isAuthorized = true;
  } else if (sessionUser) {
    if (sessionUser.role === "owner" || sessionUser.role === "editor" || sessionUser.role === "production") {
      isAuthorized = true;
    } else {
      const isLinkedAuthor = await prisma.contracts.findFirst({
        where: {
          title_id: proj.title_id,
          authors: { email: { equals: sessionUser.email, mode: "insensitive" } },
        },
      });
      if (isLinkedAuthor) isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return fail(403, "Invalid or expired proof approval token");
  }

  if (proj.status !== "final_proof") {
    return fail(400, `This title is currently in '${proj.status}' stage and cannot accept proof sign-off`);
  }

  const now = stamp();
  const host = req.headers.get("host") || "localhost:3000";
  const protoHeader = req.headers.get("x-forwarded-proto");
  const protocol = protoHeader || (host.includes("localhost") ? "http" : "https");
  const baseUrl = `${protocol}://${host}`;
  const authorTrackingUrl = `${baseUrl}/author`;

  let authorEmail = proj.titles.authors?.email || null;
  const authorName = proj.titles.authors?.name || "Author";
  if (!authorEmail && proj.titles.contracts?.term_notes) {
    const emailMatch = proj.titles.contracts.term_notes.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) authorEmail = emailMatch[0];
  }

  if (data.action === "rework") {
    const feedbackNotes = data.notes?.trim() || "Author requested corrections during proof review";

    await prisma.production_projects.update({
      where: { id },
      data: {
        status: "editing",
        editing_completed_at: null,
        proof_approved_at: null,
        proof_completed_at: null,
        proof_feedback: feedbackNotes,
        updated_at: now,
      },
    });

    await audit({
      userId: sessionUser?.id || "public-author",
      action: "author_request_proof_rework",
      entity: "production_project",
      entityId: id,
      detail: { project_id: id, notes: feedbackNotes },
    });

    // In-app notifications: notify editors, proofreaders, and owners
    const staffToNotify = [
      ...getAssignees(proj.proof_assigned_to, proj.proof_assignees),
      ...getAssignees(proj.editing_assigned_to, proj.editing_assignees),
    ];
    if (staffToNotify.length > 0) {
      await notifyUsers(staffToNotify, {
        title: "Proof Corrections Requested",
        message: `Author submitted proof correction notes for "${proj.titles.name}": "${feedbackNotes}"`,
        type: "PROOF",
        link: `/production/${id}`,
      });
    } else {
      await notifyRoles(["editor", "proofreader", "production", "owner"], {
        title: "Proof Corrections Requested",
        message: `Author submitted proof correction notes for "${proj.titles.name}": "${feedbackNotes}"`,
        type: "PROOF",
        link: `/production/${id}`,
      });
    }

    if (authorEmail) {
      await notifyAuthorByEmail(authorEmail, {
        title: "Proof Corrections Received",
        message: `Your proof revisions for "${proj.titles.name}" were received. Our editorial team is applying the requested adjustments.`,
        type: "PROOF",
        link: `/author`,
      });

      const mail = productionStageCompletedEmail({
        authorName,
        title: proj.titles.name,
        completedStageName: "Proof Inspection (Revision Requested)",
        nextStageName: "Editorial & Typesetting Adjustments",
        stageNote: `Your revision feedback has been received and routed to our editorial team: "${feedbackNotes}"`,
        trackingUrl: authorTrackingUrl,
      });
      await queueEmail({
        to: authorEmail,
        toName: authorName,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        template: "author_proof_rework",
        refType: "production_project",
        refId: id,
      });
    }

    return ok({ success: true, status: "editing", action: "rework" });
  }

  // Author digitally approved proof -> Record approval in final_proof stage
  await prisma.production_projects.update({
    where: { id },
    data: {
      status: "final_proof",
      proof_approved_at: now,
      proof_completed_at: now,
      proof_feedback: null,
      updated_at: now,
    },
  });

  await audit({
    userId: sessionUser?.id || "public-author",
    action: "author_approve_final_proof",
    entity: "production_project",
    entityId: id,
    detail: { project_id: id, approved_at: now },
  });

  // In-app notifications to staff
  await notifyRoles(["production", "proofreader", "store", "accounts", "owner"], {
    title: "Author Proof Sign-Off Received",
    message: `Author approved final proof for "${proj.titles.name}". Ready for staff to finish and publish.`,
    type: "PROOF",
    link: `/production/${id}`,
  });

  if (authorEmail) {
    await notifyAuthorByEmail(authorEmail, {
      title: "Proof Sign-Off Confirmed!",
      message: `Thank you! Your approval for "${proj.titles.name}" is recorded. The editorial team will finalize publication.`,
      type: "PROOF",
      link: `/author`,
    });

    const mail = productionStageCompletedEmail({
      authorName,
      title: proj.titles.name,
      completedStageName: "Author Digital Sign-Off Confirmed",
      nextStageName: "Final Publication & Catalog Listing",
      stageNote: "Thank you for confirming your sign-off! Your manuscript and jacket files have been verified for publication.",
      trackingUrl: authorTrackingUrl,
    });
    await queueEmail({
      to: authorEmail,
      toName: authorName,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      template: "author_proof_approved",
      refType: "production_project",
      refId: id,
    });
  }

  return ok({ success: true, status: "final_proof", action: "approve" });
});

