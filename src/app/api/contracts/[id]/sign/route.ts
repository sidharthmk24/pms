import { randomUUID } from "node:crypto";
import { z } from "zod";
import { fail, handler, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { queueEmail } from "@/lib/mail";
import { getSessionUser } from "@/lib/session";
import { encodeContractNotes, parseContractNotes } from "@/lib/contracts";
import { prisma } from "@/lib/prisma";
import { stamp } from "@/lib/time";

const SignSchema = z.object({
  party: z.enum(["publisher", "author"]),
  signerName: z.string().trim().min(2, "Signer name required"),
  signature: z.string().min(1, "Signature required"),
  pan: z.string().trim().optional(),
  bankAccount: z.string().trim().optional(),
  ifsc: z.string().trim().optional(),
  agreed: z.literal(true, { message: "You must accept the legal agreement terms" }),
});

export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const json = await req.json().catch(() => null);
  const data = SignSchema.parse(json);

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

  const now = stamp();
  const currentMeta = parseContractNotes(contract.term_notes);

  // Extract client IP and User Agent for legal e-signature compliance audit
  const forwardedFor = req.headers.get("x-forwarded-for");
  const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "Web Client";

  if (data.party === "publisher") {
    const user = await getSessionUser();
    if (!user) {
      return fail(401, "Authentication required for publisher signature");
    }

    currentMeta.publisher_signatory = data.signerName;
    currentMeta.publisher_signed_at = now;
    currentMeta.publisher_signature = data.signature;

    await audit({
      userId: user.id,
      action: "sign_contract_publisher",
      entity: "contract",
      entityId: id,
      detail: { contract_ref: currentMeta.contract_ref, title: contract.titles.name, signer: data.signerName },
    });
  } else {
    // Author Digital Signing: require valid session matching the author's email
    const user = await getSessionUser();
    if (!user) {
      return fail(401, "Author authentication required. Please log in to execute this publishing agreement.");
    }

    if (
      contract.authors.email &&
      user.email.toLowerCase() !== contract.authors.email.toLowerCase() &&
      !["owner", "admin", "publisher", "editor"].includes(user.role)
    ) {
      return fail(
        403,
        `Unauthorized account. Please log in with the author account associated with this contract (${contract.authors.email}).`
      );
    }

    currentMeta.author_signer_name = data.signerName;
    currentMeta.author_signed_at = now;
    currentMeta.author_signature = data.signature;
    currentMeta.author_signer_ip = clientIp;
    currentMeta.author_signer_ua = userAgent;

    if (data.pan) {
      currentMeta.author_pan = data.pan;
      // Update PAN on authors record if not already set
      await prisma.authors.update({
        where: { id: contract.author_id },
        data: { pan: data.pan },
      });
    }

    if (data.bankAccount) currentMeta.author_bank_account = data.bankAccount;
    if (data.ifsc) currentMeta.author_ifsc = data.ifsc;

    await audit({
      userId: user.id,
      action: "sign_contract_author",
      entity: "contract",
      entityId: id,
      detail: { contract_ref: currentMeta.contract_ref, title: contract.titles.name, signer: data.signerName, ip: clientIp },
    });
  }

  // Check if both parties have signed
  const isDualSigned = !!(currentMeta.publisher_signed_at && currentMeta.author_signed_at);
  const signedOn = isDualSigned ? (contract.signed_on || now) : null;

  const updated = await prisma.contracts.update({
    where: { id },
    data: {
      signed_on: signedOn,
      term_notes: encodeContractNotes(currentMeta),
    },
  });

  // Seamless pipeline transition when contract is dual signed
  if (isDualSigned) {
    const existingProject = await prisma.production_projects.findFirst({
      where: { title_id: contract.title_id },
    });

    if (!existingProject) {
      await prisma.production_projects.create({
        data: {
          id: randomUUID(),
          title_id: contract.title_id,
          status: "under_contract",
          created_at: now,
          updated_at: now,
        },
      });
    }

    // Send execution confirmation email to author
    if (data.party === "author" && contract.authors?.email) {
      const host = req.headers.get("host") || "localhost:3000";
      const protocol = req.headers.get("x-forwarded-proto") || "http";
      const contractUrl = `${protocol}://${host}/publish/contract/${id}`;
      const setupUrl = `${protocol}://${host}/author/setup?email=${encodeURIComponent(contract.authors.email)}&contract=${id}`;

      await queueEmail({
        to: contract.authors.email,
        toName: contract.authors.name,
        subject: `Contract Executed — ${contract.titles.name} (${currentMeta.contract_ref || "Kairali Books"})`,
        text: `Dear ${contract.authors.name},\n\nThank you for digitally signing the publishing agreement for "${contract.titles.name}".\n\nThe agreement is now legally executed and sealed by both parties. Your book has entered our Production & DTP Typesetting Pipeline.\n\nWarm regards,\nKairali Books Editorial Team`,
        html: `
<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1c1a17;max-width:520px">
  <p>Dear ${contract.authors.name},</p>
  <p>Thank you for digitally signing the publishing agreement for "<strong>${contract.titles.name}</strong>".</p>
  <p>The contract is now legally executed and sealed by both parties. Your book has officially moved into our <strong>Production &amp; DTP Pipeline</strong>.</p>
  <p>Our editorial and design teams will begin typesetting and layout formatting. You can monitor progress on your Author Dashboard.</p>
  <p style="color:#6b6559;margin-top:24px">Warm regards,<br><strong>Kairali Books Editorial Team</strong></p>
</div>`.trim(),
        template: "contract_signed",
        refType: "contract",
        refId: id,
      });
    }
  }

  return ok({
    success: true,
    contract: updated,
    isDualSigned,
    status: isDualSigned ? "signed" : data.party === "publisher" ? "awaiting_author" : "awaiting_publisher",
  });
});

