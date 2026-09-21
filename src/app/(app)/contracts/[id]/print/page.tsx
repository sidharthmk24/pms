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
        <div className="flex justify-center mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Kairali Books Logo"
            className="h-10 w-auto object-contain"
          />
        </div>
        <span className="text-xs font-mono font-bold   tracking-widest text-gray-500 block mb-1">
          Official Publishing Contract · {meta.contract_ref || "CON-2026-0001"}
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold   tracking-wider font-sans text-gray-900">
          Book Publishing &amp; Royalty Agreement
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
            <h2 className="font-sans font-bold text-sm   tracking-wide text-gray-900 mb-1">
              Article 1 — Grant of Rights
            </h2>
            <p>
              The Author grants and assigns to the Publisher the exclusive right to print, publish, sell, and distribute the original literary work provisionally titled <strong>"{contract.titles.name}"</strong> in Malayalam throughout the world.
            </p>
          </div>

          <div>
            <h2 className="font-sans font-bold text-sm   tracking-wide text-gray-900 mb-1">
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
            <h2 className="font-sans font-bold text-sm   tracking-wide text-gray-900 mb-1">
              Article 3 — Term & Exclusivity
            </h2>
            <p>
              This Agreement shall remain in force for an initial period of <strong>{meta.term_years} years</strong> from the date of signing, and shall automatically renew for successive one-year terms unless either party gives 60 days prior written notice.
            </p>
          </div>

          <div>
            <h2 className="font-sans font-bold text-sm   tracking-wide text-gray-900 mb-1">
              Article 4 — Proofreading & Editorial Review
            </h2>
            <p>
              The Publisher shall undertake DTP typesetting, page layout, and cover design. Galley proofs shall be submitted to the Author, who will have a 14-day window to approve or submit editorial corrections prior to mass printing.
            </p>
          </div>

          <div>
            <h2 className="font-sans font-bold text-sm   tracking-wide text-gray-900 mb-1">
              Article 5 — Copyright & Reversion of Rights
            </h2>
            <p>
              Copyright in the text and literary content remains solely with the Author © {new Date().getFullYear()} {contract.authors.name}. If the Work remains out of print for a continuous period of 12 months after written demand by the Author, all publishing rights shall revert to the Author.
            </p>
          </div>

          <div>
            <h2 className="font-sans font-bold text-sm   tracking-wide text-gray-900 mb-1">
              Article 6 — Indian Tax Compliance & Jurisdiction
            </h2>
            <p>
              Author royalties are subject to Indian Income Tax TDS under Section 194J. Any legal disputes arising out of this Agreement shall be subject to the exclusive jurisdiction of the Courts in <strong>Kozhikode (Calicut), Kerala</strong>.
            </p>
          </div>
        </div>

        {/* Dual Signature Certification */}
        <div className="pt-8 mt-8 border-t-2 border-gray-900 grid grid-cols-2 gap-8 font-sans break-inside-avoid">
          {/* Publisher Signature Block */}
          <div className="border border-gray-300 rounded-xl p-5 bg-gray-50/75 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-gray-500   tracking-widest block mb-3">
                Signed on Behalf of Publisher
              </span>
              
              <div className="h-16 flex items-end pb-1 border-b border-gray-400 mb-2">
                <span className="font-serif italic text-lg text-gray-800 font-bold">
                  {meta.publisher_signatory || PUBLISHER_DETAILS.signatory}
                </span>
              </div>
              
              <p className="text-sm font-bold text-gray-900">{meta.publisher_signatory || PUBLISHER_DETAILS.signatory}</p>
              <p className="text-xs text-gray-600">Managing Director · Kairali Books</p>
            </div>

            <div className="mt-4 text-[11px] text-green-800 font-semibold border-t border-gray-200 pt-2 flex items-center gap-1.5">
              <span>✓ Digitally Certified:</span>
              <span className="font-mono text-[10px]">
                {meta.publisher_signed_at ? meta.publisher_signed_at.slice(0, 16) : contract.created_at.slice(0, 16)}
              </span>
            </div>
          </div>

          {/* Author Signature Block */}
          <div className="border border-gray-300 rounded-xl p-5 bg-gray-50/75 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-gray-500   tracking-widest block mb-3">
                Signed by Author
              </span>
              
              {/* Signature Photo / Ink Graphic */}
              <div className="min-h-16 flex items-end pb-1 border-b border-gray-400 mb-2">
                {meta.author_signature?.startsWith("data:image/") ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={meta.author_signature}
                    alt="Author Official Signature"
                    className="max-h-16 max-w-[240px] object-contain"
                  />
                ) : meta.author_signature ? (
                  <span className="font-serif italic text-lg text-gray-800 font-bold">
                    {meta.author_signature}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 italic">
                    (Sign with pen above if executing on paper)
                  </span>
                )}
              </div>
              
              <p className="text-sm font-bold text-gray-900">{contract.authors.name}</p>
              <p className="text-xs text-gray-600">PAN: {meta.author_pan || contract.authors.pan || "On Record"}</p>
            </div>

            <div className="mt-4 text-[11px] text-green-800 font-semibold border-t border-gray-200 pt-2 flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <span>✓ Execution Certified:</span>
                <span className="font-mono text-[10px]">
                  {meta.author_signed_at ? meta.author_signed_at.slice(0, 16) : "Timestamp Certified"}
                </span>
              </div>
              {meta.author_signer_ip && (
                <span className="text-[10px] text-gray-500 font-mono">
                  Signer Audit IP: {meta.author_signer_ip}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Legal Disclaimer Footer */}
        <div className="mt-10 pt-4 border-t border-gray-200 text-center text-[9px] text-gray-500 font-mono">
          This document is an official legally binding electronic contract executed pursuant to the Information Technology Act, 2000 (India).
        </div>
      </div>
    </div>
  );
}
