import { randomUUID } from "node:crypto";
import { z } from "zod";
import { fail, handler, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireApiCapability } from "@/lib/auth";
import { declineEmail, needsRevisionEmail, acceptEmail, queueEmail } from "@/lib/mail";
import { rupeesToPaise } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { stamp } from "@/lib/time";

import { encodeContractNotes } from "@/lib/contracts";
import { hasRole } from "@/lib/roles";
import { notifyRoles, notifyAuthorByEmail } from "@/lib/notifications";

const ReviewSectionSchema = z.object({
  id: z.string().optional(),
  section: z.string().min(1, "Section name is required"),
  severity: z.enum(["critical", "major", "minor", "suggestion"]).default("major"),
  feedback: z.string().min(1, "Feedback is required for section"),
});

const ReviewSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("decline"),
    declineMessage: z.string().optional(),
  }),
  z.object({
    action: z.literal("revision"),
    feedback: z.string().optional(),
    overallSummary: z.string().optional(),
    sections: z.array(ReviewSectionSchema).optional(),
  }),
  z.object({
    action: z.literal("accept"),
    publishingType: z.enum(["kairali_funded", "self_publishing"]),
    royaltyPct: z.number().min(0).max(100),
    basis: z.enum(["mrp", "net"]),
    advanceRupees: z.number().nonnegative(),
    termYears: z.number().min(1).max(10).optional().default(3),
    freeCopies: z.number().min(0).max(100).optional().default(10),
    authorDiscountPct: z.number().min(0).max(100).optional().default(40),
    packageCostRupees: z.number().nonnegative().optional().default(0),
  }),
]);

export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireApiCapability("submissions.review");
  const { id } = await params;

  const json = await req.json().catch(() => null);
  const data = ReviewSchema.parse(json);

  const sub = await prisma.submissions.findUnique({
    where: { id },
  });
  if (!sub) return fail(404, "Submission not found");

  // Validate that current user has an editor or owner role, and is the assigned editor or owner
  if (!hasRole(user.role, "editor") && !hasRole(user.role, "owner")) {
    return fail(403, "Only an editor or owner can review submissions");
  }
  if (sub.reviewed_by !== user.id && !hasRole(user.role, "owner")) {
    return fail(403, "You are not the assigned editor for this submission");
  }

  const now = stamp();
  const host = req.headers.get("host") || "localhost:3000";
  const protocol = req.headers.get("x-forwarded-proto") || "http";
  const trackingUrl = `${protocol}://${host}/publish/status?ref=${sub.ref_no}&email=${encodeURIComponent(sub.email)}`;

  if (data.action === "decline") {
    const declineNote = data.declineMessage?.trim() || null;

    await prisma.submissions.update({
      where: { id },
      data: {
        status: "declined",
        review_notes: declineNote,
        decided_on: now,
        updated_at: now,
      },
    });

    const mail = declineEmail({
      authorName: sub.author_name,
      refNo: sub.ref_no,
      title: sub.title,
      declineMessage: declineNote || undefined,
    });
    await queueEmail({
      to: sub.email,
      toName: sub.author_name,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      template: "submission_declined",
      refType: "submission",
      refId: id,
    });

    await audit({
      userId: user.id,
      action: "decline_submission",
      entity: "submission",
      entityId: id,
      detail: { ref_no: sub.ref_no, title: sub.title, decline_message: declineNote },
    });

    await notifyAuthorByEmail(sub.email, {
      title: "Manuscript Evaluation Completed",
      message: declineNote
        ? `The editorial evaluation for "${sub.title}" (${sub.ref_no}) has been completed with remarks from the editorial board.`
        : `The editorial evaluation for "${sub.title}" (${sub.ref_no}) has been completed.`,
      type: "SUBMISSION",
      link: `/author`,
    });

    await notifyRoles(["owner"], {
      title: "Manuscript Declined",
      message: `"${sub.title}" (${sub.ref_no}) was declined by ${user.name}.`,
      type: "SUBMISSION",
      link: `/submissions/${id}`,
    }, user.id);

    return ok({ success: true });
  }

  if (data.action === "revision") {
    // Construct structured notes if section-wise or plain string
    let finalReviewNotes = "";

    if (data.sections && data.sections.length > 0) {
      finalReviewNotes = JSON.stringify({
        type: "section_wise",
        overallSummary: data.overallSummary || "",
        sections: data.sections,
        createdAt: now,
      });
    } else {
      finalReviewNotes = data.overallSummary || data.feedback || "";
    }

    if (!finalReviewNotes.trim()) {
      return fail(400, "Please provide editorial feedback or specify sections to revise");
    }

    await prisma.submissions.update({
      where: { id },
      data: {
        status: "needs_revision",
        review_notes: finalReviewNotes,
        updated_at: now,
      },
    });

    const mail = needsRevisionEmail({
      authorName: sub.author_name,
      refNo: sub.ref_no,
      title: sub.title,
      feedback: finalReviewNotes,
      trackingUrl,
    });
    await queueEmail({
      to: sub.email,
      toName: sub.author_name,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      template: "submission_revision",
      refType: "submission",
      refId: id,
    });

    await audit({
      userId: user.id,
      action: "request_submission_revision",
      entity: "submission",
      entityId: id,
      detail: {
        ref_no: sub.ref_no,
        title: sub.title,
        section_count: data.sections?.length || 0,
        feedback_summary: finalReviewNotes.slice(0, 150),
      },
    });

    await notifyAuthorByEmail(sub.email, {
      title: "Editorial Revisions Requested",
      message: data.sections && data.sections.length > 0
        ? `The editorial board requested revisions across ${data.sections.length} section(s) on "${sub.title}". Please review feedback and submit updated manuscript.`
        : `The editorial board requested revisions on "${sub.title}". Please review feedback and submit updated manuscript.`,
      type: "SUBMISSION",
      link: `/author`,
    });

    await notifyRoles(["owner"], {
      title: "Manuscript Revisions Requested",
      message: `Revisions requested for "${sub.title}" (${sub.ref_no}) by ${user.name}.`,
      type: "SUBMISSION",
      link: `/submissions/${id}`,
    }, user.id);

    return ok({ success: true });
  }

  if (data.action === "accept") {
    let authorId = "";
    let titleId = "";
    let contractId = "";

    await prisma.$transaction(async (tx) => {
      // 1. Resolve author (create if email doesn't exist)
      let author = await tx.authors.findFirst({
        where: { email: { equals: sub.email, mode: "insensitive" } },
      });

      if (!author) {
        author = await tx.authors.create({
          data: {
            id: randomUUID(),
            name: sub.author_name,
            email: sub.email,
            phone: sub.phone,
            notes: `Created from accepted submission ${sub.ref_no}`,
            created_at: now,
          },
        });
      }
      authorId = author.id;

      // 2. Create distinct title for this manuscript
      const title = await tx.titles.create({
        data: {
          id: randomUUID(),
          name: sub.title,
          author_id: author.id,
          category: sub.genre,
          language: sub.language,
          stock: 0,
          status: "active",
          created_at: now,
        },
      });
      titleId = title.id;

      // 3. Create distinct contract with specific terms for this manuscript
      contractId = randomUUID();
      const contractNotes = encodeContractNotes({
        contract_ref: `CON-${new Date().getFullYear()}-${sub.ref_no.replace(/[^0-9]/g, "").slice(-4) || "0001"}`,
        submission_id: sub.id,
        submission_ref: sub.ref_no,
        publishing_type: data.publishingType,
        term_years: data.termYears ?? 3,
        free_copies: data.freeCopies ?? 10,
        author_discount_pct: data.authorDiscountPct ?? 40,
        package_cost_rupees: data.packageCostRupees ?? 0,
        gst_pct: 18,
        publisher_signatory: user.name,
        publisher_signed_at: now,
        publisher_signature: "Digitally Authorized by Kairali Books",
      });

      await tx.contracts.create({
        data: {
          id: contractId,
          title_id: title.id,
          author_id: author.id,
          royalty_pct: data.royaltyPct,
          basis: data.basis,
          advance_paise: rupeesToPaise(data.advanceRupees),
          signed_on: null,
          term_notes: contractNotes,
          created_at: now,
        },
      });

      // 4. Update submission to accepted
      await tx.submissions.update({
        where: { id },
        data: {
          status: "accepted",
          publishing_type: data.publishingType,
          decided_on: now,
          updated_at: now,
        },
      });
    });

    const authorContractUrl = `${protocol}://${host}/publish/contract/${contractId}`;
    const mail = acceptEmail({
      authorName: sub.author_name,
      refNo: sub.ref_no,
      title: sub.title,
      contractUrl: authorContractUrl,
      trackingUrl,
    });
    await queueEmail({
      to: sub.email,
      toName: sub.author_name,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      template: "submission_accepted",
      refType: "submission",
      refId: id,
    });

    await audit({
      userId: user.id,
      action: "accept_submission",
      entity: "submission",
      entityId: id,
      detail: {
        ref_no: sub.ref_no,
        title: sub.title,
        author_id: authorId,
        title_id: titleId,
        contract_id: contractId,
      },
    });

    // Notify author of acceptance and contract
    await notifyAuthorByEmail(sub.email, {
      title: "Manuscript Accepted! Contract Ready",
      message: `Congratulations! "${sub.title}" has been accepted for publishing. Your publishing agreement is ready to sign.`,
      type: "CONTRACT",
      link: `/publish/contract/${contractId}`,
    });

    // Notify owners
    await notifyRoles(["owner"], {
      title: "Manuscript Accepted",
      message: `"${sub.title}" by ${sub.author_name} was accepted by ${user.name}. Contract drafted.`,
      type: "CONTRACT",
      link: `/contracts`,
    }, user.id);

    return ok({ success: true, contractId });
  }

  return fail(400, "Invalid action");
});

