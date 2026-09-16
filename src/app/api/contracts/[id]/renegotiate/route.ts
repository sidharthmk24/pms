import { z } from "zod";
import { fail, handler, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { encodeContractNotes, parseContractNotes } from "@/lib/contracts";
import { prisma } from "@/lib/prisma";
import { stamp } from "@/lib/time";
import { queueEmail } from "@/lib/mail";

import { notifyRoles, notifyAuthorByEmail } from "@/lib/notifications";

const RenegotiateSchema = z.object({
  feedback: z.string().trim().min(5, "Please provide specific details on what terms you would like reviewed or modified (at least 5 characters)."),
});

export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const json = await req.json().catch(() => null);
  const data = RenegotiateSchema.parse(json);

  const contract = await prisma.contracts.findUnique({
    where: { id },
    include: {
      authors: true,
      titles: true,
    },
  });

  if (!contract) {
    return fail(404, "Contract not found");
  }

  if (contract.signed_on) {
    return fail(400, "This contract has already been legally signed and executed. Please reach out to the editorial team directly.");
  }

  const now = stamp();
  const currentMeta = parseContractNotes(contract.term_notes);

  currentMeta.renegotiation_requested = true;
  currentMeta.author_feedback = data.feedback;
  currentMeta.renegotiation_requested_at = now;
  currentMeta.status = "renegotiation_requested";

  if (!currentMeta.submission_id) {
    const sub = await prisma.submissions.findFirst({
      where: {
        OR: [
          { title: { equals: contract.titles.name, mode: "insensitive" } },
          { email: { equals: contract.authors.email || "", mode: "insensitive" } },
        ],
      },
      select: { id: true, ref_no: true },
    });
    if (sub) {
      currentMeta.submission_id = sub.id;
      currentMeta.submission_ref = sub.ref_no;
    }
  }

  const updated = await prisma.contracts.update({
    where: { id },
    data: {
      term_notes: encodeContractNotes(currentMeta),
    },
  });

  // Extract client IP
  const forwardedFor = req.headers.get("x-forwarded-for");
  const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";

  await audit({
    userId: null,
    action: "contract_renegotiation_requested",
    entity: "contract",
    entityId: id,
    detail: {
      contract_ref: currentMeta.contract_ref,
      title: contract.titles.name,
      author: contract.authors.name,
      feedback: data.feedback,
      ip: clientIp,
    },
  });

  // In-app notifications
  await notifyRoles(["owner", "accounts"], {
    title: "Contract Revisions Requested",
    message: `"${contract.titles.name}" — ${contract.authors.name} requested changes to publishing terms.`,
    type: "CONTRACT",
    link: `/contracts`,
  });

  if (contract.authors.email) {
    await notifyAuthorByEmail(contract.authors.email, {
      title: "Terms Review Request Received",
      message: `Your requested revisions for the publishing agreement on "${contract.titles.name}" were received.`,
      type: "CONTRACT",
      link: `/author`,
    });
  }

  // Optional: Send acknowledgment notification email to author
  if (contract.authors.email) {
    await queueEmail({
      to: contract.authors.email,
      toName: contract.authors.name,
      subject: `Terms Review Request Received — "${contract.titles.name}" (${currentMeta.contract_ref || "Kairali Books"})`,
      text: `Dear ${contract.authors.name},\n\nWe have received your requested revisions for the publishing agreement on "${contract.titles.name}".\n\nOur editorial and publishing team is reviewing your notes:\n"${data.feedback}"\n\nYour assigned editor will review these terms and follow up shortly with revised terms.\n\nWarm regards,\nKairali Books Editorial Board`,
      html: `
<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1c1a17;max-width:540px">
  <p>Dear ${contract.authors.name},</p>
  <p>We have safely received your requested revisions for the publishing agreement on &ldquo;<strong>${contract.titles.name}</strong>&rdquo;.</p>
  <div style="background:#faf4f8;border:1px solid #e7d5e2;border-radius:12px;padding:14px;margin:16px 0;font-size:13px;color:#3b122e">
    <strong>Your Requested Changes:</strong><br>
    <em>&ldquo;${data.feedback}&rdquo;</em>
  </div>
  <p>Your manuscript acceptance remains safe with us. Our editorial director will review your feedback and either re-issue an updated agreement or reach out to discuss further.</p>
  <p style="color:#6b6559;margin-top:24px">Warm regards,<br><strong>Kairali Books Editorial Board</strong></p>
</div>`.trim(),
      template: "contract_renegotiation_requested",
      refType: "contract",
      refId: id,
    });
  }

  return ok({
    success: true,
    meta: currentMeta,
  });
});

