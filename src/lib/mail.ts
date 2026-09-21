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
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer | string;
    contentType?: string;
  }>;
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
          attachments: msg.attachments,
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
  declineMessage?: string;
}): { subject: string; text: string; html: string } {
  const { authorName, refNo, title, declineMessage } = input;
  const subject = `Update on your manuscript submission — ${refNo}`;

  const textLines = [
    `Dear ${authorName},`,
    ``,
    `Thank you for submitting your manuscript "${title}" (Reference: ${refNo}) to Kairali Books.`,
    ``,
    `Our editors have carefully read and considered your work. Regrettably, we have decided not to proceed with publication at this time. We receive many submissions and must make difficult choices based on our current list and publishing schedule.`,
  ];

  if (declineMessage && declineMessage.trim()) {
    textLines.push(
      ``,
      `Editorial Remarks:`,
      declineMessage.trim(),
    );
  }

  textLines.push(
    ``,
    `You retain all rights to your work, and we encourage you to seek publication elsewhere. We wish you the best of luck with your writing.`,
    ``,
    `Sincerely,`,
    `Kairali Books`,
  );

  const text = textLines.join("\n");

  const messageHtmlBlock = declineMessage && declineMessage.trim()
    ? `<div style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px 14px;margin:20px 0;border-radius:0 8px 8px 0">
        <h4 style="margin:0 0 6px 0;color:#991b1b;font-size:14px">Editorial Notes &amp; Feedback</h4>
        <p style="margin:0;white-space:pre-wrap;color:#374151;font-size:13px;line-height:1.5">${escapeHtml(declineMessage.trim())}</p>
      </div>`
    : "";

  const html = `
<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1c1a17;max-width:520px">
  <p>Dear ${escapeHtml(authorName)},</p>
  <p>Thank you for submitting your manuscript "<strong>${escapeHtml(title)}</strong>" (Reference: ${escapeHtml(refNo)}) to Kairali Books.</p>
  <p>Our editors have carefully read and considered your work. Regrettably, we have decided not to proceed with publication at this time. We receive many submissions and must make difficult choices based on our current list and publishing schedule.</p>
  ${messageHtmlBlock}
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

  // Parse if JSON structured section-wise
  let plainFeedbackText = feedback;
  let formattedHtmlFeedback = "";

  if (feedback.trim().startsWith("{") && feedback.trim().endsWith("}")) {
    try {
      const parsed = JSON.parse(feedback.trim());
      if (parsed.type === "section_wise" || Array.isArray(parsed.sections)) {
        const sections = parsed.sections || [];
        const parts: string[] = [];
        const htmlParts: string[] = [];

        if (parsed.overallSummary && parsed.overallSummary.trim()) {
          parts.push(`[Overall Summary]: ${parsed.overallSummary.trim()}`);
          htmlParts.push(`
            <div style="margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #fed7aa">
              <strong style="color:#9a3412">Overall Summary:</strong>
              <p style="margin:4px 0 0 0;color:#374151;font-size:13px">${escapeHtml(parsed.overallSummary.trim())}</p>
            </div>
          `);
        }

        if (sections.length > 0) {
          parts.push(`[Section-by-Section Revisions]:`);
          sections.forEach((s: any, i: number) => {
            const sev = s.severity ? ` (${String(s.severity).toUpperCase()})` : "";
            parts.push(`${i + 1}. ${s.section}${sev}:\n   ${s.feedback}`);
            htmlParts.push(`
              <div style="margin-bottom:10px;padding:8px 10px;background:#ffffff;border:1px solid #fed7aa;border-radius:6px">
                <div style="font-weight:600;font-size:13px;color:#9a3412">${i + 1}. ${escapeHtml(s.section)} <span style="font-size:11px;color:#c2410c">(${escapeHtml(s.severity || "revision")})</span></div>
                <div style="font-size:12px;color:#374151;margin-top:4px;white-space:pre-wrap">${escapeHtml(s.feedback)}</div>
              </div>
            `);
          });
        }

        plainFeedbackText = parts.join("\n\n");
        formattedHtmlFeedback = htmlParts.join("");
      }
    } catch {
      // plain text fallback
    }
  }

  if (!formattedHtmlFeedback) {
    formattedHtmlFeedback = `<p style="margin:0;white-space:pre-wrap">${escapeHtml(feedback)}</p>`;
  }

  const text = [
    `Dear ${authorName},`,
    ``,
    `Thank you for submitting your manuscript "${title}" (Reference: ${refNo}) to Kairali Books.`,
    ``,
    `Our editors have reviewed your work and see great potential. However, we feel some revisions are needed before we can make a final decision.`,
    ``,
    `Editor's Feedback:`,
    plainFeedbackText,
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
  <div style="background:#fff7ed;border-left:4px solid #ea580c;padding:14px;margin:20px 0;border-radius:0 8px 8px 0">
    <h4 style="margin:0 0 8px 0;color:#c2410c;font-size:14px">Editorial Feedback &amp; Revision Directives</h4>
    ${formattedHtmlFeedback}
  </div>
  <p>You can view this detailed breakdown and upload your revised manuscript by logging into your author portal:</p>
  <p><a href="${escapeHtml(trackingUrl)}" style="display:inline-block;background:#7e2562;color:#ffffff;padding:10px 18px;text-decoration:none;border-radius:6px;font-weight:600;font-size:13px">Access Author Portal &amp; Submit Revision</a></p>
  <p>We look forward to reading your updated work.</p>
  <p style="color:#6b6559">Sincerely,<br>Kairali Books</p>
</div>`.trim();

  return { subject, text, html };
}

export function acceptEmail(input: {
  authorName: string;
  refNo: string;
  title: string;
  contractUrl?: string;
  trackingUrl?: string;
}): { subject: string; text: string; html: string } {
  const { authorName, refNo, title, trackingUrl } = input;
  const primarySigningUrl = input.contractUrl || trackingUrl || "#";

  const subject = `Congratulations! Your manuscript has been accepted — ${refNo} (${title})`;
  const text = [
    `Dear ${authorName},`,
    ``,
    `We are thrilled to inform you that your manuscript "${title}" (Reference: ${refNo}) has been accepted for publication by Kairali Books!`,
    ``,
    `We have generated your dedicated publishing agreement and contract terms. Please review the terms and digitally sign your publishing agreement:`,
    primarySigningUrl,
    ...(trackingUrl ? [``, `You can also track your manuscript status anytime at:`, trackingUrl] : []),
    ``,
    `Once signed, your manuscript will transition into our production pipeline. We are excited to partner with you to bring your book to readers.`,
    ``,
    `Congratulations once again!`,
    ``,
    `Sincerely,`,
    `Kairali Books Editorial Team`,
  ].join("\n");

  const html = `
<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1c1a17;max-width:520px">
  <p>Dear ${escapeHtml(authorName)},</p>
  <p>We are thrilled to inform you that your manuscript "<strong>${escapeHtml(title)}</strong>" (Reference: ${escapeHtml(refNo)}) has been accepted for publication by Kairali Books!</p>
  <p>We have generated your dedicated publishing agreement and royalty schedule. Please review the terms and digitally sign the agreement for this book:</p>
  <p><a href="${escapeHtml(primarySigningUrl)}" style="display:inline-block;background:#7e2562;color:#ffffff;padding:11px 22px;text-decoration:none;border-radius:8px;font-weight:700">Review &amp; Sign Agreement</a></p>
  ${trackingUrl ? `<p style="font-size:13px;color:#6b6559">You can also track your submission progress anytime on the <a href="${escapeHtml(trackingUrl)}" style="color:#7e2562;font-weight:600">Author Tracking Portal</a>.</p>` : ""}
  <p>Once digitally signed, your book will officially move into our production and typesetting pipeline.</p>
  <p>Congratulations once again!</p>
  <p style="color:#6b6559;margin-top:24px">Sincerely,<br><strong>Kairali Books Editorial Team</strong></p>
</div>`.trim();

  return { subject, text, html };
}

/**
 * Triggered automatically when each production stage completes.
 */
export function productionStageCompletedEmail(input: {
  authorName: string;
  title: string;
  completedStageName: string;
  nextStageName: string;
  stageNote?: string;
  trackingUrl: string;
}): { subject: string; text: string; html: string } {
  const { authorName, title, completedStageName, nextStageName, stageNote, trackingUrl } = input;
  const subject = `Production Update: "${title}" — ${completedStageName} Completed`;

  const text = [
    `Dear ${authorName},`,
    ``,
    `We are pleased to update you that your book "${title}" has successfully completed the "${completedStageName}" stage in our production pipeline.`,
    ``,
    stageNote ? `Note: ${stageNote}\n` : ``,
    `Next Stage: ${nextStageName}`,
    ``,
    `You can track the live progress and milestones of your book anytime at:`,
    trackingUrl,
    ``,
    `Warm regards,`,
    `Production Department`,
    `Kairali Books · കൈരളി ബുക്സ്`,
  ].filter(Boolean).join("\n");

  const html = `
<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1c1a17;max-width:540px;background:#ffffff;padding:24px;border:1px solid #e8e6e1;border-radius:12px">
  <div style="border-bottom:2px solid #0f5d55;padding-bottom:12px;margin-bottom:18px">
    <span style="font-size:18px;font-weight:700;color:#0f5d55">Kairali Books</span>
    <span style="font-size:14px;color:#6b6559;margin-left:8px">കൈരളി ബുക്സ് · Production Department</span>
  </div>
  <p>Dear ${escapeHtml(authorName)},</p>
  <p>We are delighted to inform you that your book "<strong>${escapeHtml(title)}</strong>" has reached a new publishing milestone.</p>
  
  <div style="background:#f4f9f7;border:1px solid #c9e4dc;border-radius:10px;padding:16px;margin:20px 0">
    <div style="display:flex;align-items:center;margin-bottom:8px">
      <span style="background:#0f5d55;color:#ffffff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:20px;text-transform: ;letter-spacing:0.5px">Completed Milestone</span>
      <span style="font-weight:700;color:#0f5d55;margin-left:10px;font-size:15px">✓ ${escapeHtml(completedStageName)}</span>
    </div>
    <div style="font-size:13px;color:#4a453e;margin-top:10px;border-top:1px dashed #c9e4dc;padding-top:10px">
      <strong>Next Active Stage:</strong> ${escapeHtml(nextStageName)}
    </div>
    ${stageNote ? `<div style="font-size:12px;color:#6b6559;margin-top:6px;font-style:italic">${escapeHtml(stageNote)}</div>` : ""}
  </div>

  <p>You can follow the real-time pipeline status and deliverables on your live author dashboard:</p>
  <p style="margin:24px 0">
    <a href="${escapeHtml(trackingUrl)}" style="display:inline-block;background:#0f5d55;color:#ffffff;padding:11px 22px;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">
      Track Book Progress →
    </a>
  </p>
  <p style="font-size:12px;color:#8c867a;margin-top:28px;border-top:1px solid #f0eee9;padding-top:14px">
    Kairali Books Publishing Division · Kozhikode, Kerala
  </p>
</div>`.trim();

  return { subject, text, html };
}

/**
 * Final Proof Sign-Off Email with PDF Attachment & 1-Click Approval Link.
 */
export function proofApprovalEmail(input: {
  authorName: string;
  title: string;
  isbn?: string | null;
  approvalUrl: string;
  hasAttachment: boolean;
  trackingUrl: string;
}): { subject: string; text: string; html: string } {
  const { authorName, title, isbn, approvalUrl, hasAttachment, trackingUrl } = input;
  const subject = `Action Required: Final Proof Approval for "${title}" — Kairali Books`;

  const text = [
    `Dear ${authorName},`,
    ``,
    `Your book "${title}" has completed typesetting, editorial review, cover design, and ISBN registration${isbn ? ` (ISBN: ${isbn})` : ""}.`,
    ``,
    `It is now ready for your final proof inspection and digital sign-off before we queue it for the offset printing press run.`,
    ``,
    hasAttachment 
      ? `We have attached the complete proofreading layout PDF directly to this email for your convenience.`
      : `The proofreading layout PDF is available for inspection in your review portal.`,
    ``,
    `Please inspect the text, layout, and formatting. To approve the title for printing, click the secure link below:`,
    approvalUrl,
    ``,
    `If revisions are needed, you can also submit your feedback comments directly on the approval page.`,
    ``,
    `Author Portal: ${trackingUrl}`,
    ``,
    `Warm regards,`,
    `Editorial & Production Team`,
    `Kairali Books`,
  ].join("\n");

  const html = `
<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1c1a17;max-width:560px;background:#ffffff;padding:26px;border:1px solid #e8e6e1;border-radius:12px">
  <div style="border-bottom:2px solid #b3541e;padding-bottom:12px;margin-bottom:18px">
    <span style="font-size:18px;font-weight:700;color:#0f5d55">Kairali Books</span>
    <span style="font-size:14px;color:#6b6559;margin-left:8px">കൈരളി ബുക്സ് · Final Proofing</span>
  </div>
  
  <p>Dear ${escapeHtml(authorName)},</p>
  <p>We are delighted to share that the layout, cover artwork, and official ISBN registration${isbn ? ` (<strong>ISBN: ${escapeHtml(isbn)}</strong>)` : ""} for your book "<strong>${escapeHtml(title)}</strong>" are complete!</p>
  
  <div style="background:#fcf9f5;border:1px solid #f0e1d5;border-left:4px solid #b3541e;padding:16px;border-radius:0 10px 10px 0;margin:20px 0">
    <h4 style="margin:0 0 6px 0;color:#b3541e;font-size:15px">Action Required: Author Final Sign-Off</h4>
    <p style="margin:0;font-size:13px;color:#4a453e">
      Before we schedule and send the title to the offset printing press, we require your final digital review and sign-off.
    </p>
    ${hasAttachment ? `
    <p style="margin:10px 0 0 0;font-size:12px;color:#0f5d55;font-weight:600">
      📎 The complete proofreading layout PDF is attached to this email for your offline review.
    </p>` : ""}
  </div>

  <p>Please review the proofreading PDF. When you are satisfied with the text and layout, click the button below to approve:</p>

  <div style="text-align:center;margin:28px 0">
    <a href="${escapeHtml(approvalUrl)}" style="display:inline-block;background:#0f5d55;color:#ffffff;padding:13px 28px;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;box-shadow:0 2px 4px rgba(15,93,85,0.2)">
      ✓ Accept &amp; Approve Final Proof →
    </a>
    <div style="margin-top:10px;font-size:11px;color:#6b6559">
      Clicking this link opens your secure approval page to confirm sign-off or request revisions.
    </div>
  </div>

  <p style="font-size:12px;color:#8c867a;margin-top:32px;border-top:1px solid #f0eee9;padding-top:14px">
    If you need any corrections, you can submit revision notes on the link above.<br>
    Kairali Books Publishing Division · Kozhikode, Kerala
  </p>
</div>`.trim();

  return { subject, text, html };
}

/**
 * Triggered upon post-production completion & book launch.
 */
export function publicationCelebrationEmail(input: {
  authorName: string;
  title: string;
  isbn?: string | null;
  authorCopiesQty: number;
  courierTracking?: string | null;
  channels: string[];
  trackingUrl: string;
}): { subject: string; text: string; html: string } {
  const { authorName, title, isbn, authorCopiesQty, courierTracking, channels, trackingUrl } = input;
  const subject = `Congratulations! "${title}" is Published & Live — Kairali Books`;

  const text = [
    `Dear ${authorName},`,
    ``,
    `Heartiest congratulations! Your book "${title}"${isbn ? ` (ISBN: ${isbn})` : ""} has completed all post-production stages, quality inspection, and warehouse intake.`,
    ``,
    authorCopiesQty > 0 ? `Your ${authorCopiesQty} author complimentary copies have been allocated.${courierTracking ? ` Courier / Dispatch Details: ${courierTracking}` : ""}` : ``,
    ``,
    `Distribution Channels Activated: ${channels.join(", ")}`,
    ``,
    `You can view sales and royalty reports anytime on your author portal:`,
    trackingUrl,
    ``,
    `We wish your book tremendous success and look forward to reaching readers together!`,
    ``,
    `Warmest congratulations,`,
    `Kairali Books · കൈരളി ബുക്സ്`,
  ].filter(Boolean).join("\n");

  const html = `
<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1c1a17;max-width:560px;background:#ffffff;padding:26px;border:1px solid #e8e6e1;border-radius:12px">
  <div style="border-bottom:2px solid #0f5d55;padding-bottom:12px;margin-bottom:18px">
    <span style="font-size:20px;font-weight:700;color:#0f5d55">Kairali Books</span>
    <span style="font-size:14px;color:#6b6559;margin-left:8px">കൈരളി ബുക്സ്</span>
  </div>
  
  <p style="font-size:16px;font-weight:700;color:#0f5d55;margin-bottom:8px">🎉 Your Book is Officially Published!</p>
  <p>Dear ${escapeHtml(authorName)},</p>
  <p>We are absolutely delighted to celebrate the successful publication of your book "<strong>${escapeHtml(title)}</strong>"${isbn ? ` (ISBN: ${escapeHtml(isbn)})` : ""}.</p>
  
  <div style="background:#f4f9f7;border:1px solid #c9e4dc;padding:16px;border-radius:10px;margin:20px 0">
    <h4 style="margin:0 0 10px 0;color:#0f5d55;font-size:14px">Post-Production &amp; Dispatch Summary</h4>
    ${authorCopiesQty > 0 ? `
      <div style="font-size:13px;color:#4a453e;margin-bottom:6px">
        <strong>Author Copies:</strong> ${authorCopiesQty} copies segregated for delivery
      </div>
      ${courierTracking ? `
      <div style="font-size:13px;color:#4a453e;margin-bottom:6px">
        <strong>Courier Docket / Tracking:</strong> ${escapeHtml(courierTracking)}
      </div>` : ""}
    ` : ""}
    <div style="font-size:13px;color:#4a453e;margin-top:8px">
      <strong>Active Distribution Channels:</strong> ${escapeHtml(channels.join(" · "))}
    </div>
  </div>

  <p>Your book is now live across our retail bookstores, distributor network, and online catalog. You can track ongoing inventory and sales on your author portal:</p>

  <p style="margin:24px 0">
    <a href="${escapeHtml(trackingUrl)}" style="display:inline-block;background:#0f5d55;color:#ffffff;padding:11px 24px;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">
      Access Author Portal →
    </a>
  </p>

  <p>Thank you for trusting Kairali Books as your publishing home. We wish your work the very best!</p>
  <p style="color:#6b6559;margin-top:20px">Kairali Books Editorial &amp; Distribution Team</p>
</div>`.trim();

  return { subject, text, html };
}

/**
 * Renders and sends password reset emails with a secure, 1-hour valid creation link.
 */
export function renderPasswordResetEmail({
  recipientName,
  resetUrl,
}: {
  recipientName?: string | null;
  resetUrl: string;
}): { subject: string; text: string; html: string } {
  const name = recipientName?.trim() || "User";
  const subject = `Reset Your Kairali Books Account Password`;

  const text = [
    `Hello ${name},`,
    ``,
    `We received a request to reset the password for your Kairali Books account.`,
    ``,
    `Create your new password using this link:`,
    resetUrl,
    ``,
    `Note: This link is valid for 1 hour and will automatically expire once used.`,
    ``,
    `If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.`,
    ``,
    `Warm regards,`,
    `Kairali Books · കൈരളി ബുക്സ്`,
  ].join("\n");

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#1c1a17;max-width:540px;background:#ffffff;padding:32px 28px;border:1px solid #7e256220;border-radius:16px;margin:0 auto;box-shadow:0 4px 20px rgba(126,37,98,0.06)">
  <div style="border-bottom:2px solid #7e2562;padding-bottom:14px;margin-bottom:20px;display:flex;align-items:center;gap:10px">
    <span style="font-size:22px;font-weight:800;color:#7e2562;letter-spacing:-0.5px">Kairali Books</span>
    <span style="font-size:13px;font-weight:600;color:#7e256280;margin-left:8px">കൈരളി ബുക്സ്</span>
  </div>

  <h2 style="font-size:18px;font-weight:800;color:#1c1a17;margin:0 0 12px 0">Password Reset Request</h2>

  <p style="font-size:14px;color:#4a453e;margin:0 0 16px 0">Dear ${escapeHtml(name)},</p>

  <p style="font-size:14px;color:#4a453e;margin:0 0 20px 0">
    We received a request to reset the password for your account on the <strong>Kairali Books Publisher Management System</strong>.
  </p>

  <div style="text-align:center;margin:32px 0">
    <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${escapeHtml(resetUrl)}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="20%" stroke="f" fillcolor="#7e2562">
      <w:anchorlock/>
      <center style="color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:bold;">Create New Password →</center>
    </v:roundrect>
    <![endif]-->
    <!--[if !mso]><!-->
    <a href="${escapeHtml(resetUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#7e2562;color:#ffffff !important;padding:14px 34px;text-decoration:none !important;border-radius:10px;font-weight:700;font-size:14px;box-shadow:0 4px 12px rgba(126,37,98,0.25);letter-spacing:0.2px">
      Create New Password &rarr;
    </a>
    <!--<![endif]-->
  </div>

  <div style="background:#faedf5;border:1px solid #7e256225;padding:14px 16px;border-radius:10px;margin:24px 0">
    <p style="font-size:12px;color:#7e2562;margin:0;font-weight:600;display:flex;align-items:center;line-height:1.4">
      <svg style="width:15px;height:15px;margin-right:8px;vertical-align:-2px;display:inline-block;flex-shrink:0" fill="none" viewBox="0 0 24 24" stroke="#7e2562" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
      <span>This link is valid for <strong>1 hour</strong> and will automatically expire once used.</span>
    </p>
  </div>

  <hr style="border:none;border-top:1px solid #e7e5e4;margin:24px 0" />

  <p style="font-size:12px;color:#a8a29e;margin:0">
    If you did not request this password reset, you can safely disregard this email. Your account remains secure.
  </p>

  <p style="font-size:12px;color:#78716c;margin-top:16px;font-weight:600">
    Kairali Books Security &amp; Publishing Systems
  </p>
</div>`.trim();

  return { subject, text, html };
}

export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
}: {
  to: string;
  name?: string | null;
  resetUrl: string;
}): Promise<void> {
  const { subject, text, html } = renderPasswordResetEmail({ recipientName: name, resetUrl });
  await queueEmail({
    to,
    toName: name,
    subject,
    text,
    html,
    template: "password_reset",
    refType: "user_password_reset",
  });
}


