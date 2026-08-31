import "server-only";
import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { stamp } from "@/lib/time";

export type QueuedEmail = {
  to: string;
  toName?: string | null;
  subject: string;
  text: string;
  html?: string;
  template?: string;
  refType?: string;
  refId?: string;
};

/**
 * Creates a Nodemailer transporter instance if SMTP is configured.
 */
function getTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

/**
 * Queues mail into email_outbox and attempts immediate dispatch via Nodemailer.
 */
export async function queueEmail(msg: QueuedEmail): Promise<string | null> {
  const id = randomUUID();
  const createdAt = stamp();

  try {
    // 1. Insert into outbox table
    await prisma.email_outbox.create({
      data: {
        id,
        to_email: msg.to,
        to_name: msg.toName ?? null,
        subject: msg.subject,
        body_text: msg.text,
        body_html: msg.html ?? null,
        template: msg.template ?? null,
        ref_type: msg.refType ?? null,
        ref_id: msg.refId ?? null,
        status: "pending",
        created_at: createdAt,
      },
    });

    // 2. Dispatch via Nodemailer if SMTP configured
    const transporter = getTransporter();
    if (transporter) {
      try {
        const from = process.env.SMTP_FROM || `Kairali Books <${process.env.SMTP_USER}>`;
        await transporter.sendMail({
          from,
          to: msg.toName ? `"${msg.toName}" <${msg.to}>` : msg.to,
          subject: msg.subject,
          text: msg.text,
          html: msg.html,
        });

        await prisma.email_outbox.update({
          where: { id },
          data: {
            status: "sent",
            sent_at: stamp(),
          },
        });
        console.log(`\n[mail:sent] to=${msg.to} subject="${msg.subject}" id=${id}\n`);
      } catch (sendErr: any) {
        console.error("[mail:send-error]", sendErr);
        await prisma.email_outbox.update({
          where: { id },
          data: {
            attempts: { increment: 1 },
            last_error: String(sendErr?.message || sendErr),
          },
        });
      }
    } else {
      if (process.env.NODE_ENV !== "production") {
        console.log(`\n[mail:queued-dry-run] to=${msg.to} subject="${msg.subject}"\n${msg.text}\n`);
      }
    }

    return id;
  } catch (err) {
    console.error("[mail] failed to queue", { to: msg.to, subject: msg.subject }, err);
    return null;
  }
}


export function submissionReceivedEmail(input: {
  authorName: string;
  refNo: string;
  title: string;
  responseWeeks: number;
}): { subject: string; text: string; html: string } {
  const { authorName, refNo, title, responseWeeks } = input;
  const subject = `We received your manuscript — ${refNo}`;

  const text = [
    `Dear ${authorName},`,
    ``,
    `Thank you for sending your manuscript to Kairali Books.`,
    ``,
    `Reference number: ${refNo}`,
    `Manuscript: ${title}`,
    ``,
    `Our editorial team reads every submission. You can expect to hear from us`,
    `within ${responseWeeks} weeks. Please quote your reference number in any`,
    `correspondence about this submission.`,
    ``,
    `We are grateful for the chance to read your work.`,
    ``,
    `Kairali Books`,
    `കൈരളി ബുക്സ്`,
  ].join("\n");

  const html = `
<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1c1a17;max-width:520px">
  <p>Dear ${escapeHtml(authorName)},</p>
  <p>Thank you for sending your manuscript to Kairali Books.</p>
  <table style="border-collapse:collapse;margin:20px 0;background:#f7f6f2;border-radius:8px">
    <tr><td style="padding:10px 14px;color:#6b6559">Reference number</td>
        <td style="padding:10px 14px;font-weight:600">${escapeHtml(refNo)}</td></tr>
    <tr><td style="padding:10px 14px;color:#6b6559">Manuscript</td>
        <td style="padding:10px 14px;font-weight:600">${escapeHtml(title)}</td></tr>
  </table>
  <p>Our editorial team reads every submission. You can expect to hear from us
     within <strong>${responseWeeks} weeks</strong>. Please quote your reference
     number in any correspondence about this submission.</p>
  <p>We are grateful for the chance to read your work.</p>
  <p style="color:#6b6559">Kairali Books · കൈരളി ബുക്സ്</p>
</div>`.trim();

  return { subject, text, html };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

export function declineEmail(input: {
  authorName: string;
  refNo: string;
  title: string;
}): { subject: string; text: string; html: string } {
  const { authorName, refNo, title } = input;
  const subject = `Update on your manuscript submission — ${refNo}`;
  const text = [
    `Dear ${authorName},`,
    ``,
    `Thank you for submitting your manuscript "${title}" (Reference: ${refNo}) to Kairali Books.`,
    ``,
    `Our editors have carefully read and considered your work. Regrettably, we have decided not to proceed with publication at this time. We receive many submissions and must make difficult choices based on our current list and publishing schedule.`,
    ``,
    `You retain all rights to your work, and we encourage you to seek publication elsewhere. We wish you the best of luck with your writing.`,
    ``,
    `Sincerely,`,
    `Kairali Books`,
  ].join("\n");

  const html = `
<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1c1a17;max-width:520px">
  <p>Dear ${escapeHtml(authorName)},</p>
  <p>Thank you for submitting your manuscript "<strong>${escapeHtml(title)}</strong>" (Reference: ${escapeHtml(refNo)}) to Kairali Books.</p>
  <p>Our editors have carefully read and considered your work. Regrettably, we have decided not to proceed with publication at this time. We receive many submissions and must make difficult choices based on our current list and publishing schedule.</p>
  <p>You retain all rights to your work, and we encourage you to seek publication elsewhere. We wish you the best of luck with your writing.</p>
  <p style="color:#6b6559">Sincerely,<br>Kairali Books</p>
</div>`.trim();

  return { subject, text, html };
}

export function needsRevisionEmail(input: {
  authorName: string;
  refNo: string;
  title: string;
  feedback: string;
  trackingUrl: string;
}): { subject: string; text: string; html: string } {
  const { authorName, refNo, title, feedback, trackingUrl } = input;
  const subject = `Revision requested for your manuscript — ${refNo}`;
  const text = [
    `Dear ${authorName},`,
    ``,
    `Thank you for submitting your manuscript "${title}" (Reference: ${refNo}) to Kairali Books.`,
    ``,
    `Our editors have reviewed your work and see great potential. However, we feel some revisions are needed before we can make a final decision.`,
    ``,
    `Editor's Feedback:`,
    feedback,
    ``,
    `You can view this feedback and upload your revised manuscript by logging into your author portal at:`,
    trackingUrl,
    ``,
    `We look forward to reading your updated work.`,
    ``,
    `Sincerely,`,
    `Kairali Books`,
  ].join("\n");

  const html = `
<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1c1a17;max-width:520px">
  <p>Dear ${escapeHtml(authorName)},</p>
  <p>Thank you for submitting your manuscript "<strong>${escapeHtml(title)}</strong>" (Reference: ${escapeHtml(refNo)}) to Kairali Books.</p>
  <p>Our editors have reviewed your work and see great potential. However, we feel some revisions are needed before we can make a final decision.</p>
  <div style="background:#f7f6f2;border-left:4px solid #b3541e;padding:12px;margin:20px 0;border-radius:0 8px 8px 0">
    <h4 style="margin:0 0 6px 0;color:#b3541e">Editor's Feedback</h4>
    <p style="margin:0;white-space:pre-wrap">${escapeHtml(feedback)}</p>
  </div>
  <p>You can view this feedback and upload your revised manuscript by logging into your author portal:</p>
  <p><a href="${escapeHtml(trackingUrl)}" style="display:inline-block;background:#0f5d55;color:#ffffff;padding:10px 18px;text-decoration:none;border-radius:6px;font-weight:500">Access Author Portal</a></p>
  <p>We look forward to reading your updated work.</p>
  <p style="color:#6b6559">Sincerely,<br>Kairali Books</p>
</div>`.trim();

  return { subject, text, html };
}

export function acceptEmail(input: {
  authorName: string;
  refNo: string;
  title: string;
  trackingUrl: string;
}): { subject: string; text: string; html: string } {
  const { authorName, refNo, title, trackingUrl } = input;
  const subject = `Congratulations! Your manuscript has been accepted — ${refNo}`;
  const text = [
    `Dear ${authorName},`,
    ``,
    `We are thrilled to inform you that your manuscript "${title}" (Reference: ${refNo}) has been accepted for publication by Kairali Books!`,
    ``,
    `We have generated your contract and publishing terms. Please log into your author portal to review the terms and digitally sign the contract:`,
    trackingUrl,
    ``,
    `Once signed, your manuscript will transition to our production pipeline. We are excited to partner with you to bring your book to readers.`,
    ``,
    `Congratulations once again!`,
    ``,
    `Sincerely,`,
    `Kairali Books`,
  ].join("\n");

  const html = `
<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1c1a17;max-width:520px">
  <p>Dear ${escapeHtml(authorName)},</p>
  <p>We are thrilled to inform you that your manuscript "<strong>${escapeHtml(title)}</strong>" (Reference: ${escapeHtml(refNo)}) has been accepted for publication by Kairali Books!</p>
  <p>We have generated your contract and publishing terms. Please log into your author portal to review the terms and digitally sign the contract:</p>
  <p><a href="${escapeHtml(trackingUrl)}" style="display:inline-block;background:#0f5d55;color:#ffffff;padding:10px 18px;text-decoration:none;border-radius:6px;font-weight:500">Review & Sign Contract</a></p>
  <p>Once signed, your manuscript will transition to our production pipeline. We are excited to partner with you to bring your book to readers.</p>
  <p>Congratulations once again!</p>
  <p style="color:#6b6559">Sincerely,<br>Kairali Books</p>
</div>`.trim();

  return { subject, text, html };
}
