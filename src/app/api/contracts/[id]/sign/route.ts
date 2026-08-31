import { z } from "zod";
import { fail, handler, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
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
    // Author Digital Signing
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
      userId: null,
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

  return ok({
    success: true,
    contract: updated,
    isDualSigned,
    status: isDualSigned ? "signed" : data.party === "publisher" ? "awaiting_author" : "awaiting_publisher",
  });
});
