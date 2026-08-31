export type PublishingTrack = "kairali_funded" | "self_publishing";

export type ContractMetadata = {
  contract_ref?: string;
  publishing_type: PublishingTrack;
  term_years: number;
  free_copies: number;
  author_discount_pct: number;
  // Financial details
  package_cost_rupees?: number;
  gst_pct?: number;
  // Tax / Identification
  author_pan?: string | null;
  author_bank_account?: string | null;
  author_ifsc?: string | null;
  publisher_signatory?: string;
  publisher_signed_at?: string | null;
  publisher_signature?: string | null;
  // Author Digital Signature
  author_signed_at?: string | null;
  author_signature?: string | null;
  author_signer_name?: string | null;
  author_signer_ip?: string | null;
  author_signer_ua?: string | null;
  notes?: string;
};

export const PUBLISHER_DETAILS = {
  name: "Kairali Books",
  address: "Near Stadium, Rajaji Road, Kozhikode (Calicut), Kerala - 673004",
  gstin: "32AAAAK1234A1Z5",
  pan: "AAAAK1234A",
  phone: "+91 495 272 1234",
  email: "info@kairalibooks.in",
  signatory: "Radhika Menon (Managing Editor / Publisher)",
};

/**
 * Encodes metadata into the database term_notes column as JSON.
 */
export function encodeContractNotes(meta: ContractMetadata): string {
  return JSON.stringify(meta);
}

/**
 * Parses contract metadata from the term_notes string.
 */
export function parseContractNotes(termNotes: string | null | undefined): ContractMetadata {
  if (!termNotes) {
    return {
      publishing_type: "kairali_funded",
      term_years: 3,
      free_copies: 10,
      author_discount_pct: 40,
    };
  }

  try {
    const parsed = JSON.parse(termNotes);
    if (typeof parsed === "object" && parsed !== null) {
      return {
        publishing_type: parsed.publishing_type ?? "kairali_funded",
        term_years: parsed.term_years ?? 3,
        free_copies: parsed.free_copies ?? 10,
        author_discount_pct: parsed.author_discount_pct ?? 40,
        package_cost_rupees: parsed.package_cost_rupees,
        gst_pct: parsed.gst_pct ?? 18,
        author_pan: parsed.author_pan ?? null,
        author_bank_account: parsed.author_bank_account ?? null,
        author_ifsc: parsed.author_ifsc ?? null,
        publisher_signatory: parsed.publisher_signatory ?? PUBLISHER_DETAILS.signatory,
        publisher_signed_at: parsed.publisher_signed_at ?? null,
        publisher_signature: parsed.publisher_signature ?? null,
        author_signed_at: parsed.author_signed_at ?? null,
        author_signature: parsed.author_signature ?? null,
        author_signer_name: parsed.author_signer_name ?? null,
        author_signer_ip: parsed.author_signer_ip ?? null,
        author_signer_ua: parsed.author_signer_ua ?? null,
        notes: parsed.notes,
        contract_ref: parsed.contract_ref,
      };
    }
  } catch {
    // Legacy plain text term_notes
  }

  return {
    publishing_type: termNotes.includes("self_publishing") ? "self_publishing" : "kairali_funded",
    term_years: 3,
    free_copies: 10,
    author_discount_pct: 40,
    notes: termNotes,
  };
}

export type ContractStatus = "draft" | "awaiting_publisher" | "awaiting_author" | "signed";

export function getContractStatus(contract: {
  signed_on: string | null;
  term_notes: string | null;
}): ContractStatus {
  if (contract.signed_on) return "signed";
  const meta = parseContractNotes(contract.term_notes);
  if (!meta.publisher_signed_at) return "awaiting_publisher";
  if (!meta.author_signed_at) return "awaiting_author";
  return "signed";
}
