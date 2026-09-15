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

const ReviewSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("decline"),
  }),
  z.object({
    action: z.literal("revision"),
    feedback: z.string().min(5, "Feedback must be at least 5 characters"),
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
    await prisma.submissions.update({
      where: { id },
      data: {
        status: "declined",
        decided_on: now,
        updated_at: now,
      },
    });

    const mail = declineEmail({ authorName: sub.author_name, refNo: sub.ref_no, title: sub.title });
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
      detail: { ref_no: sub.ref_no, title: sub.title },
    });

    return ok({ success: true });
  }

  if (data.action === "revision") {
    await prisma.submissions.update({
      where: { id },
      data: {
        status: "needs_revision",
        review_notes: data.feedback,
        updated_at: now,
      },
    });

    const mail = needsRevisionEmail({
      authorName: sub.author_name,
      refNo: sub.ref_no,
      title: sub.title,
      feedback: data.feedback,
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
      detail: { ref_no: sub.ref_no, title: sub.title, feedback_summary: data.feedback.slice(0, 100) },
    });

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

    return ok({ success: true, contractId });
  }

  return fail(400, "Invalid action");
});
