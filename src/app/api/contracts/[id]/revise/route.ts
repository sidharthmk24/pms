import { z } from "zod";
import { fail, handler, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireApiCapability } from "@/lib/auth";
import { encodeContractNotes, parseContractNotes } from "@/lib/contracts";
import { prisma } from "@/lib/prisma";
import { rupeesToPaise } from "@/lib/money";
import { stamp } from "@/lib/time";
import { queueEmail } from "@/lib/mail";

const ReviseSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("accept"),
    notes: z.string().optional(),
  }),
  z.object({
    action: z.literal("revise"),
    publishingType: z.enum(["kairali_funded", "self_publishing"]).optional(),
    royaltyPct: z.number().min(0).max(100),
    basis: z.enum(["mrp", "net"]),
    advanceRupees: z.number().nonnegative(),
    termYears: z.number().min(1).max(10).default(3),
    freeCopies: z.number().min(0).max(100).default(10),
    authorDiscountPct: z.number().min(0).max(100).default(40),
    packageCostRupees: z.number().nonnegative().optional().default(0),
    editorNotes: z.string().optional(),
  }),
  z.object({
    action: z.literal("decline"),
    reason: z.string().optional(),
  }),
]);

export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireApiCapability("submissions.review");
  const { id } = await params;
  const json = await req.json().catch(() => null);
  const data = ReviseSchema.parse(json);

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
    return fail(400, "Cannot modify or decline an already dual-signed and executed contract");
  }

  const now = stamp();
  const currentMeta = parseContractNotes(contract.term_notes);
  const host = req.headers.get("host") || "localhost:3000";
  const protocol = req.headers.get("x-forwarded-proto") || "http";
  const contractUrl = `${protocol}://${host}/publish/contract/${id}`;

  if (data.action === "decline") {
    currentMeta.renegotiation_requested = false;
    currentMeta.declined_at = now;
    currentMeta.decline_reason = data.reason || "Publisher and author could not reach agreement on publishing terms.";
    currentMeta.status = "declined";

    await prisma.contracts.update({
      where: { id },
      data: {
        term_notes: encodeContractNotes(currentMeta),
      },
    });

    // If associated with a submission, update its status
    if (currentMeta.submission_id) {
      await prisma.submissions.update({
        where: { id: currentMeta.submission_id },
        data: {
          status: "declined",
          decided_on: now,
          updated_at: now,
        },
      }).catch(() => null);
    }

    await audit({
      userId: user.id,
      action: "decline_contract_offer",
      entity: "contract",
      entityId: id,
      detail: {
        contract_ref: currentMeta.contract_ref,
        title: contract.titles.name,
        author: contract.authors.name,
        reason: data.reason,
      },
    });

    // Notify author by email
    if (contract.authors.email) {
      await queueEmail({
        to: contract.authors.email,
        toName: contract.authors.name,
        subject: `Publishing Agreement Status Update — "${contract.titles.name}"`,
        text: `Dear ${contract.authors.name},\n\nFollowing our review of the proposed terms for "${contract.titles.name}", we regret to inform you that we are unable to proceed with publishing under the requested terms at this time.\n\n${data.reason ? `Note: ${data.reason}\n\n` : ""}We wish you the very best with your literary work.\n\nWarm regards,\nKairali Books Editorial Board`,
        html: `
<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1c1a17;max-width:540px">
  <p>Dear ${contract.authors.name},</p>
  <p>Following review of the proposed terms for &ldquo;<strong>${contract.titles.name}</strong>&rdquo;, we regret to inform you that we are unable to proceed with publication under the requested terms at this time.</p>
  ${data.reason ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:12px;margin:16px 0;font-size:13px;color:#991b1b"><strong>Note from Editorial Desk:</strong><br>${data.reason}</div>` : ""}
  <p>We thank you for sharing your manuscript with Kairali Books and wish you every success in your writing endeavors.</p>
  <p style="color:#6b6559;margin-top:24px">Warm regards,<br><strong>Kairali Books Editorial Board</strong></p>
</div>`.trim(),
        template: "contract_declined",
        refType: "contract",
        refId: id,
      });
    }

    return ok({ success: true, status: "declined" });
  }

  if (data.action === "accept") {
    currentMeta.renegotiation_requested = false;
    currentMeta.declined_at = null;
    currentMeta.decline_reason = null;
    currentMeta.publisher_signatory = user.name;
    currentMeta.publisher_signed_at = now;
    currentMeta.publisher_signature = `Digitally Authorized by ${user.name} (Kairali Books)`;
    currentMeta.status = "awaiting_author";
    if (data.notes) {
      currentMeta.notes = data.notes;
    }

    const updated = await prisma.contracts.update({
      where: { id },
      data: {
        term_notes: encodeContractNotes(currentMeta),
      },
    });

    // If associated with a submission, ensure status is accepted
    if (currentMeta.submission_id) {
      await prisma.submissions.update({
        where: { id: currentMeta.submission_id },
        data: {
          status: "accepted",
          updated_at: now,
        },
      }).catch(() => null);
    }

    await audit({
      userId: user.id,
      action: "accept_contract_request",
      entity: "contract",
      entityId: id,
      detail: {
        contract_ref: currentMeta.contract_ref,
        title: contract.titles.name,
        author: contract.authors.name,
        notes: data.notes,
      },
    });

    // Notify author of acceptance
    if (contract.authors.email) {
      await queueEmail({
        to: contract.authors.email,
        toName: contract.authors.name,
        subject: `Terms Review Accepted — "${contract.titles.name}" (${currentMeta.contract_ref || "Kairali Books"})`,
        text: `Dear ${contract.authors.name},\n\nGreat news! Kairali Books has accepted your request regarding the publishing agreement for "${contract.titles.name}".\n\n${data.notes ? `Note from Editor:\n"${data.notes}"\n\n` : ""}You may now proceed to review and digitally sign your publishing agreement at:\n${contractUrl}\n\nWarm regards,\nKairali Books Editorial Board`,
        html: `
<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1c1a17;max-width:540px">
  <p>Dear ${contract.authors.name},</p>
  <p>Great news! Kairali Books has accepted your request regarding the publishing agreement for &ldquo;<strong>${contract.titles.name}</strong>&rdquo;.</p>
  ${data.notes ? `<div style="background:#faf4f8;border:1px solid #e7d5e2;border-radius:12px;padding:12px;margin:16px 0;font-size:13px;color:#591443"><strong>Note from Editorial Desk:</strong><br>${data.notes}</div>` : ""}
  <div style="text-align:center;margin:24px 0;">
    <a href="${contractUrl}" style="display:inline-block;background:#7e2562;color:#ffffff;font-weight:bold;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;">
      Proceed to Digitally Sign Agreement &rarr;
    </a>
  </div>
  <p style="font-size:12px;color:#6b6559;">Direct Link: <a href="${contractUrl}" style="color:#7e2562;">${contractUrl}</a></p>
  <p style="color:#6b6559;margin-top:24px">Warm regards,<br><strong>Kairali Books Editorial Board</strong></p>
</div>`.trim(),
        template: "contract_accepted",
        refType: "contract",
        refId: id,
      });
    }

    return ok({ success: true, contract: updated, status: "awaiting_author" });
  }

  if (data.action === "revise") {
    if (data.publishingType) {
      currentMeta.publishing_type = data.publishingType;
    }
    currentMeta.term_years = data.termYears;
    currentMeta.free_copies = data.freeCopies;
    currentMeta.author_discount_pct = data.authorDiscountPct;
    if (data.packageCostRupees !== undefined) {
      currentMeta.package_cost_rupees = data.packageCostRupees;
    }
    currentMeta.renegotiation_requested = false;
    currentMeta.declined_at = null;
    currentMeta.decline_reason = null;
    currentMeta.publisher_signatory = user.name;
    currentMeta.publisher_signed_at = now;
    currentMeta.publisher_signature = `Digitally Re-authorized by ${user.name} (Kairali Books)`;
    currentMeta.status = "awaiting_author";
    if (data.editorNotes) {
      currentMeta.notes = data.editorNotes;
    }

    const updated = await prisma.contracts.update({
      where: { id },
      data: {
        royalty_pct: data.royaltyPct,
        basis: data.basis,
        advance_paise: rupeesToPaise(data.advanceRupees),
        term_notes: encodeContractNotes(currentMeta),
      },
    });

    // If associated with a submission, ensure status is accepted
    if (currentMeta.submission_id) {
      await prisma.submissions.update({
        where: { id: currentMeta.submission_id },
        data: {
          status: "accepted",
          updated_at: now,
        },
      }).catch(() => null);
    }

    await audit({
      userId: user.id,
      action: "reassign_contract_terms",
      entity: "contract",
      entityId: id,
      detail: {
        contract_ref: currentMeta.contract_ref,
        title: contract.titles.name,
        author: contract.authors.name,
        royalty_pct: data.royaltyPct,
        basis: data.basis,
        advance_rupees: data.advanceRupees,
        term_years: data.termYears,
        free_copies: data.freeCopies,
      },
    });

    // Notify author of revised agreement
    if (contract.authors.email) {
      await queueEmail({
        to: contract.authors.email,
        toName: contract.authors.name,
        subject: `Revised Publishing Agreement Ready — "${contract.titles.name}" (${currentMeta.contract_ref || "Kairali Books"})`,
        text: `Dear ${contract.authors.name},\n\nOur editorial team has reviewed your requested changes and re-assigned an updated publishing agreement for "${contract.titles.name}".\n\nUpdated Terms Summary:\n• Royalty: ${data.royaltyPct}% on ${data.basis.toUpperCase()}\n• Advance: ₹${data.advanceRupees}\n• Term: ${data.termYears} Years\n• Free Copies: ${data.freeCopies}\n\nPlease review and digitally sign your agreement at:\n${contractUrl}\n\nWarm regards,\nKairali Books Editorial Board`,
        html: `
<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1c1a17;max-width:540px">
  <p>Dear ${contract.authors.name},</p>
  <p>Our editorial team has reviewed your feedback and re-assigned an updated publishing agreement for &ldquo;<strong>${contract.titles.name}</strong>&rdquo; with revised commercial terms.</p>
  
  <div style="background:#faf4f8;border:1px solid #e7d5e2;border-radius:14px;padding:16px;margin:16px 0;">
    <h4 style="margin:0 0 10px;color:#7e2562;font-size:14px;">Updated Terms Summary:</h4>
    <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.6;color:#1c1a17;">
      <li><strong>Royalty:</strong> ${data.royaltyPct}% on ${data.basis.toUpperCase()}</li>
      <li><strong>Advance on Signing:</strong> ₹${data.advanceRupees.toLocaleString("en-IN")}</li>
      <li><strong>Contract Term:</strong> ${data.termYears} Years</li>
      <li><strong>Complimentary Author Copies:</strong> ${data.freeCopies} Copies</li>
      <li><strong>Author Extra Copy Discount:</strong> ${data.authorDiscountPct}%</li>
    </ul>
    ${data.editorNotes ? `<p style="margin:12px 0 0;padding-top:10px;border-top:1px dashed #e7d5e2;font-size:12px;color:#591443;"><strong>Note from Editor:</strong> <em>&ldquo;${data.editorNotes}&rdquo;</em></p>` : ""}
  </div>

  <div style="text-align:center;margin:24px 0;">
    <a href="${contractUrl}" style="display:inline-block;background:#7e2562;color:#ffffff;font-weight:bold;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;">
      Review &amp; Digitally Sign Updated Agreement &rarr;
    </a>
  </div>

  <p style="font-size:12px;color:#6b6559;">Direct Link: <a href="${contractUrl}" style="color:#7e2562;">${contractUrl}</a></p>
  <p style="color:#6b6559;margin-top:24px">Warm regards,<br><strong>Kairali Books Editorial Board</strong></p>
</div>`.trim(),
        template: "contract_revised",
        refType: "contract",
        refId: id,
      });
    }

    return ok({ success: true, contract: updated, status: "awaiting_author" });
  }

  return fail(400, "Invalid action");
});
