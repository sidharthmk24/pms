import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { fail, handler, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireApiCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stamp } from "@/lib/time";
import { resolveManuscript } from "@/lib/storage";
import { queueEmail, proofApprovalEmail } from "@/lib/mail";
import { notifyAuthorByEmail } from "@/lib/notifications";

export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireApiCapability("production_pipeline.write");
  const { id } = await params;

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

  if (proj.status !== "final_proof") {
    return fail(400, "Proof approval emails can only be sent during the Final Proof stage");
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

  if (!authorEmail) {
    return fail(400, "No email address found for the author of this title");
  }

  const proofToken = proj.proof_token || randomUUID();

  // Prepare proofreading layout PDF attachment
  let attachments: Array<{ filename: string; path?: string; contentType?: string }> | undefined = undefined;
  let hasAttachment = false;

  if (proj.final_layout_path) {
    if (proj.final_layout_path.startsWith("http://") || proj.final_layout_path.startsWith("https://")) {
      attachments = [
        {
          filename: `${proj.titles.name.replace(/[^a-zA-Z0-9_-]/g, "_")}_proof.pdf`,
          path: proj.final_layout_path,
          contentType: "application/pdf",
        },
      ];
      hasAttachment = true;
    } else {
      const fullPath = resolveManuscript(proj.final_layout_path);
      if (existsSync(fullPath)) {
        attachments = [
          {
            filename: `${proj.titles.name.replace(/[^a-zA-Z0-9_-]/g, "_")}_proof.pdf`,
            path: fullPath,
            contentType: "application/pdf",
          },
        ];
        hasAttachment = true;
      }
    }
  }

  const approvalUrl = `${baseUrl}/publish/proof-approval/${id}?token=${proofToken}`;
  const mail = proofApprovalEmail({
    authorName,
    title: proj.titles.name,
    isbn: proj.titles.isbn || proj.isbn_registered,
    approvalUrl,
    hasAttachment,
    trackingUrl: authorTrackingUrl,
  });

  await queueEmail({
    to: authorEmail,
    toName: authorName,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
    template: "final_proof_signoff",
    refType: "production_project",
    refId: id,
    attachments,
  });

  await notifyAuthorByEmail(authorEmail, {
    title: "Galley Proof Ready for Approval",
    message: `Digital galley proof for "${proj.titles.name}" is ready for your sign-off!`,
    type: "PROOF",
    link: `/author`,
  });

  await prisma.production_projects.update({
    where: { id },
    data: {
      proof_token: proofToken,
      proof_email_sent_at: now,
      updated_at: now,
    },
  });

  await audit({
    userId: user.id,
    action: "send_proof_email",
    entity: "production_project",
    entityId: id,
    detail: { project_id: id, email: authorEmail, has_attachment: hasAttachment },
  });

  return ok({
    success: true,
    email: authorEmail,
    hasAttachment,
    sentAt: now,
  });
});
