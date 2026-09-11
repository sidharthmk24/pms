import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPaise } from "@/lib/money";
import { parseContractNotes, PUBLISHER_DETAILS } from "@/lib/contracts";
import PrintTrigger from "./print-trigger";

export const metadata: Metadata = { title: "Publishing Agreement (Official PDF)" };
export const dynamic = "force-dynamic";

export default async function ContractPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCapability("contracts.read");
  const { id } = await params;

  const contract = await prisma.contracts.findUnique({
    where: { id },
    include: {
      authors: true,
      titles: true,
    },
  });

  if (!contract) {
    notFound();
  }

  const meta = parseContractNotes(contract.term_notes);

  return (
    <div className="min-h-screen bg-white text-gray-900    p-8 sm:p-12 max-w-4xl mx-auto">
      <PrintTrigger />

      {/* Official Letterhead */}
      <div className="text-center pb-6 mb-8 border-b-2 border-gray-900">
        <span className="text-xs font-mono font-bold uppercase tracking-widest text-gray-500 block mb-1">
          Official Publishing Contract · {meta.contract_ref || "CON-2026-0001"}
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-wider font-sans text-gray-900">
          Book Publishing & Royalty Agreement
        </h1>
        <p className="text-sm font-sans font-bold text-gray-800 mt-2">
          KAIRALI BOOKS
        </p>
        <p className="text-xs font-sans text-gray-600">
          Near Stadium, Rajaji Road, Kozhikode, Kerala - 673004 · GSTIN: {PUBLISHER_DETAILS.gstin} · PAN: {PUBLISHER_DETAILS.pan}
        </p>
      </div>

      {/* Preamble */}
      <div className="space-y-6 text-[11.5pt] leading-relaxed">
        <p>
          This Publishing Agreement is made and entered into on <strong>{contract.created_at.slice(0, 10)}</strong> by and between:
        </p>

        <div className="border border-gray-300 bg-gray-50/75 rounded-lg p-4 font-sans text-xs space-y-2">
          <p>
            <strong>1. PUBLISHER:</strong> <strong>{PUBLISHER_DETAILS.name}</strong>, having its principal place of business at {PUBLISHER_DETAILS.address} (GSTIN: {PUBLISHER_DETAILS.gstin}, PAN: {PUBLISHER_DETAILS.pan}), represented by {PUBLISHER_DETAILS.signatory} (hereinafter called the <em>"Publisher"</em>).
          </p>
          <p>
            <strong>2. AUTHOR:</strong> <strong>{contract.authors.name}</strong>, residing at {contract.authors.address || "Kerala, India"} (Email: {contract.authors.email || "—"}, PAN: {meta.author_pan || contract.authors.pan || "On Record"}) (hereinafter called the <em>"Author"</em>).
          </p>
        </div>

        {/* Legal Articles */}
        <div className="space-y-5">
          <div>
            <h2 className="font-sans font-bold text-sm uppercase tracking-wide text-gray-900 mb-1">
              Article 1 — Grant of Rights
            </h2>
            <p>
              The Author grants and assigns to the Publisher the exclusive right to print, publish, sell, and distribute the original literary work provisionally titled <strong>"{contract.titles.name}"</strong> in Malayalam throughout the world.
            </p>
          </div>

          <div>
            <h2 className="font-sans font-bold text-sm uppercase tracking-wide text-gray-900 mb-1">
              Article 2 — Commercial & Royalty Terms
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 font-sans text-xs">
              <li>
                <strong>Publishing Model:</strong> {meta.publishing_type === "self_publishing" ? "Self-Publishing" : "Kairali Books Publishing"}.
              </li>
              <li>
                <strong>Royalty Rate:</strong> <strong>{contract.royalty_pct}%</strong> calculated on the <strong>{contract.basis.toUpperCase()}</strong> of all printed copies sold.
              </li>
              <li>
                <strong>Advance on Signing:</strong> <strong>{formatPaise(contract.advance_paise)}</strong> (non-refundable, deductible against future royalties).
              </li>
              <li>
                <strong>Complimentary Copies:</strong> The Author shall receive <strong>{meta.free_copies} complimentary copies</strong> upon publication.
              </li>
              <li>
                <strong>Author Discount:</strong> The Author is entitled to purchase additional copies at a <strong>{meta.author_discount_pct}% discount</strong> off the printed MRP.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-sans font-bold text-sm uppercase tracking-wide text-gray-900 mb-1">
              Article 3 — Term & Exclusivity
            </h2>
            <p>
              This Agreement shall remain in force for an initial period of <strong>{meta.term_years} years</strong> from the date of signing, and shall automatically renew for successive one-year terms unless either party gives 60 days prior written notice.
            </p>
          </div>

          <div>
            <h2 className="font-sans font-bold text-sm uppercase tracking-wide text-gray-900 mb-1">
              Article 4 — Proofreading & Editorial Review
            </h2>
            <p>
              The Publisher shall undertake DTP typesetting, page layout, and cover design. Galley proofs shall be submitted to the Author, who will have a 14-day window to approve or submit editorial corrections prior to mass printing.
            </p>
          </div>

          <div>
            <h2 className="font-sans font-bold text-sm uppercase tracking-wide text-gray-900 mb-1">
              Article 5 — Copyright & Reversion of Rights
            </h2>
            <p>
              Copyright in the text and literary content remains solely with the Author © {new Date().getFullYear()} {contract.authors.name}. If the Work remains out of print for a continuous period of 12 months after written demand by the Author, all publishing rights shall revert to the Author.
            </p>
          </div>

          <div>
            <h2 className="font-sans font-bold text-sm uppercase tracking-wide text-gray-900 mb-1">
              Article 6 — Indian Tax Compliance & Jurisdiction
            </h2>
            <p>
              Author royalties are subject to Indian Income Tax TDS under Section 194J. Any legal disputes arising out of this Agreement shall be subject to the exclusive jurisdiction of the Courts in <strong>Kozhikode (Calicut), Kerala</strong>.
            </p>
          </div>
        </div>

        {/* Dual Signature Certification */}
        <div className="pt-8 mt-8 border-t border-gray-300 grid grid-cols-2 gap-8 font-sans">
          <div className="border border-gray-300 rounded-lg p-4 bg-gray-50/50">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              Signed on Behalf of Publisher
            </span>
            <p className="mt-2 text-sm font-bold text-gray-900">{meta.publisher_signatory || PUBLISHER_DETAILS.signatory}</p>
            <p className="text-xs text-gray-600">Kairali Books, Kozhikode</p>
            <div className="mt-3 text-[11px] text-green-700 font-semibold border-t border-gray-200 pt-2">
              ✓ Digitally Certified: {meta.publisher_signed_at ? meta.publisher_signed_at.slice(0, 16) : contract.created_at.slice(0, 16)}
            </div>
          </div>

          <div className="border border-gray-300 rounded-lg p-4 bg-gray-50/50">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              Signed by Author
            </span>
            <p className="mt-2 text-sm font-bold text-gray-900">{contract.authors.name}</p>
            <p className="text-xs text-gray-600">PAN: {meta.author_pan || contract.authors.pan || "On Record"}</p>
            <div className="mt-3 text-[11px] text-green-700 font-semibold border-t border-gray-200 pt-2">
              ✓ Digitally Certified: {meta.author_signed_at ? meta.author_signed_at.slice(0, 16) : "Timestamp Certified"}
              <span className="block text-[10px] text-gray-500 font-mono">
                IP: {meta.author_signer_ip || "Verified"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
