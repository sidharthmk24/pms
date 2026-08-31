"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect } from "react";
import { formatPaise } from "@/lib/money";
import {
  parseContractNotes,
  getContractStatus,
  PUBLISHER_DETAILS,
  type ContractMetadata,
  type ContractStatus,
} from "@/lib/contracts";

type ContractItem = {
  id: string;
  title_id: string;
  author_id: string;
  royalty_pct: number;
  basis: string;
  advance_paise: number;
  signed_on: string | null;
  term_notes: string | null;
  created_at: string;
  authors: {
    id: string;
    name: string;
    name_ml: string | null;
    email: string | null;
    phone: string | null;
    pan: string | null;
    address: string | null;
  };
  titles: {
    id: string;
    name: string;
    name_ml: string | null;
    category: string | null;
    language: string | null;
    stock: number;
    status: string;
  };
};

type EnrichedContract = ContractItem & {
  meta: ContractMetadata;
  status: ContractStatus;
};

export default function ContractsClient({
  contracts,
  currentUserId,
  currentUserName,
}: {
  contracts: ContractItem[];
  currentUserId: string;
  currentUserName: string;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewingContract, setViewingContract] = useState<EnrichedContract | null>(null);
  const [signingContract, setSigningContract] = useState<EnrichedContract | null>(null);
  const [publisherSignature, setPublisherSignature] = useState("Radhika Menon");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const enrichedContracts = contracts.map((c) => {
    const meta = parseContractNotes(c.term_notes);
    const status = getContractStatus(c);
    return { ...c, meta, status };
  });

  const filtered = enrichedContracts.filter((c) => {
    const matchesSearch =
      c.titles.name.toLowerCase().includes(search.toLowerCase()) ||
      c.authors.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.meta.contract_ref && c.meta.contract_ref.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalCount = contracts.length;
  const signedCount = enrichedContracts.filter((c) => c.status === "signed").length;
  const pendingAuthorCount = enrichedContracts.filter((c) => c.status === "awaiting_author").length;
  const pendingPublisherCount = enrichedContracts.filter((c) => c.status === "awaiting_publisher").length;

  async function handlePublisherSign(e: React.FormEvent) {
    e.preventDefault();
    if (!signingContract) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/contracts/${signingContract.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          party: "publisher",
          signerName: publisherSignature,
          signature: `Digitally Authorized by ${publisherSignature} (Kairali Books)`,
          agreed: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data?.error ?? "Failed to sign contract");
      } else {
        setSigningContract(null);
        router.refresh();
      }
    } catch {
      alert("Network error while signing");
    } finally {
      setLoading(false);
    }
  }

  function copyAuthorLink(contractId: string) {
    const url = `${window.location.origin}/publish/contract/${contractId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(contractId);
    setTimeout(() => setCopiedId(null), 2500);
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <div className="rounded-2xl border border-black/10 bg-surface p-4.5 dark:border-white/10">
          <span className="text-xs font-bold text-muted-foreground">Total Contracts</span>
          <p className="mt-1 text-2xl font-black text-foreground">{totalCount}</p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-surface p-4.5 dark:border-white/10">
          <span className="text-xs font-bold text-success">Fully Dual-Signed</span>
          <p className="mt-1 text-2xl font-black text-foreground">{signedCount}</p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-surface p-4.5 dark:border-white/10">
          <span className="text-xs font-bold text-warning">Awaiting Author Sign</span>
          <p className="mt-1 text-2xl font-black text-foreground">{pendingAuthorCount}</p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-surface p-4.5 dark:border-white/10">
          <span className="text-xs font-bold text-muted-foreground">Awaiting Publisher</span>
          <p className="mt-1 text-2xl font-black text-foreground">{pendingPublisherCount}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by title, author, or contract ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-black/12 bg-surface px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-foreground/40 focus:ring-2 focus:ring-foreground/5 dark:border-white/15"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className="rounded-xl border border-black/12 bg-surface px-3 py-2 text-xs font-bold text-foreground outline-none dark:border-white/15"
          >
            <option value="all">All Statuses</option>
            <option value="signed">Fully Signed</option>
            <option value="awaiting_author">Awaiting Author</option>
            <option value="awaiting_publisher">Awaiting Publisher</option>
          </select>
        </div>
      </div>

      {/* Contracts Table */}
      <section className="overflow-hidden rounded-3xl border border-black/10 bg-surface dark:border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/[0.06] bg-black/[0.02] text-xs font-bold uppercase tracking-wider text-muted-foreground dark:border-white/[0.08] dark:bg-white/[0.02]">
              <tr>
                <th className="px-6 py-4">Contract / Title</th>
                <th className="px-6 py-4">Author</th>
                <th className="px-6 py-4">Track & Terms</th>
                <th className="px-6 py-4">Advance (₹)</th>
                <th className="px-6 py-4">Signing Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">
                    No publishing contracts found matching your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const isSigned = c.status === "signed";
                  const isAwaitingAuthor = c.status === "awaiting_author";
                  const isAwaitingPublisher = c.status === "awaiting_publisher";

                  return (
                    <tr key={c.id} className="transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.02]">
                      {/* Contract Ref & Title */}
                      <td className="px-6 py-4">
                        <div>
                          <span className="text-[11px] font-mono font-bold text-muted-foreground">
                            {c.meta.contract_ref || "CON-2026-0001"}
                          </span>
                          <p className="font-bold text-foreground">{c.titles.name}</p>
                          <span className="text-xs text-muted-foreground">
                            Created {c.created_at.slice(0, 10)}
                          </span>
                        </div>
                      </td>

                      {/* Author */}
                      <td className="px-6 py-4">
                        <p className="font-bold text-foreground">{c.authors.name}</p>
                        <span className="text-xs text-muted-foreground">{c.authors.email || "No email"}</span>
                      </td>

                      {/* Track & Terms */}
                      <td className="px-6 py-4">
                        <div>
                          <span className="inline-flex items-center rounded-lg bg-black/[0.05] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-foreground dark:bg-white/[0.08]">
                            {c.meta.publishing_type === "self_publishing" ? "Self-Publishing" : "Kairali-Funded"}
                          </span>
                          <p className="mt-1 text-xs font-semibold text-muted-foreground">
                            {c.royalty_pct}% on {c.basis.toUpperCase()} · {c.meta.term_years} Yrs
                          </p>
                        </div>
                      </td>

                      {/* Advance */}
                      <td className="px-6 py-4 font-semibold text-foreground">
                        {c.advance_paise > 0 ? formatPaise(c.advance_paise) : "—"}
                      </td>

                      {/* Signing Status */}
                      <td className="px-6 py-4">
                        {isSigned && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-bold text-success">
                            <span className="h-1.5 w-1.5 rounded-full bg-success" />
                            Dual-Signed
                          </span>
                        )}
                        {isAwaitingAuthor && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-bold text-warning">
                            <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                            Awaiting Author
                          </span>
                        )}
                        {isAwaitingPublisher && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/10 px-2.5 py-1 text-xs font-bold text-foreground dark:bg-white/10">
                            <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
                            Awaiting Publisher
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewingContract(c)}
                            className="apple-button rounded-xl border border-black/10 bg-surface px-3 py-1.5 text-xs font-bold text-foreground hover:bg-black/5 dark:border-white/15 dark:bg-surface-muted/60"
                          >
                            View Agreement
                          </button>

                          {isAwaitingPublisher && (
                            <button
                              onClick={() => {
                                setSigningContract(c);
                                setPublisherSignature(currentUserName);
                              }}
                              className="apple-button rounded-xl bg-foreground px-3 py-1.5 text-xs font-bold text-background shadow-xs hover:opacity-90"
                            >
                              Publisher Sign
                            </button>
                          )}

                          <button
                            onClick={() => copyAuthorLink(c.id)}
                            title="Copy secure author signing link"
                            className={`apple-button rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                              copiedId === c.id
                                ? "border-success bg-success text-white"
                                : "border-black/10 bg-surface text-foreground hover:bg-black/5 dark:border-white/15"
                            }`}
                          >
                            {copiedId === c.id ? "Link Copied!" : "Author Link"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODAL: Full Legal Agreement Viewer */}
      {viewingContract && mounted && createPortal(
        <div className="printable-contract-container fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/15 dark:bg-black/40">
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-black/10 bg-surface dark:border-white/15">
            {/* Header (Hidden on Print) */}
            <div className="no-print flex items-center justify-between border-b border-black/[0.06] px-6 py-4 dark:border-white/[0.08]">
              <div>
                <span className="text-xs font-mono font-bold text-muted-foreground">
                  {viewingContract.meta.contract_ref || "CON-2026-0001"}
                </span>
                <h3 className="text-lg font-bold tracking-tight text-foreground">
                  Publishing Agreement · {viewingContract.titles.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingContract(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-muted-foreground transition-colors hover:bg-black/10 hover:text-foreground dark:bg-white/10 dark:hover:bg-white/20"
              >
                ✕
              </button>
            </div>

            {/* Agreement Content (Printable Legal Document) */}
            <div className="printable-contract flex-1 overflow-y-auto p-8 space-y-6 text-sm text-foreground/90 leading-relaxed font-serif">
              {/* Document Letterhead */}
              <div className="text-center pb-5 border-b border-black/15 dark:border-white/15">
                <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase tracking-widest block mb-1">
                  Contract Ref: {viewingContract.meta.contract_ref || "CON-2026-0001"}
                </span>
                <h2 className="text-xl font-bold uppercase tracking-wider font-sans text-foreground">
                  Book Publishing & Royalty Agreement
                </h2>
                <p className="text-xs text-muted-foreground font-sans mt-1">
                  <strong>KAIRALI BOOKS</strong> · Near Stadium, Rajaji Road, Kozhikode, Kerala - 673004
                </p>
                <p className="text-[11px] text-muted-foreground font-sans">
                  GSTIN: {PUBLISHER_DETAILS.gstin} · PAN: {PUBLISHER_DETAILS.pan}
                </p>
              </div>

              {/* Preamble */}
              <p>
                This Agreement is made and entered into on <strong>{viewingContract.created_at.slice(0, 10)}</strong> by and between:
              </p>
              <div className="parties-box rounded-2xl border border-black/10 bg-black/[0.02] p-4 text-xs font-sans space-y-2 dark:border-white/10 dark:bg-white/[0.02]">
                <p>
                  <strong>1. PUBLISHER:</strong> <strong>{PUBLISHER_DETAILS.name}</strong>, having its principal office at {PUBLISHER_DETAILS.address} (GSTIN: {PUBLISHER_DETAILS.gstin}, PAN: {PUBLISHER_DETAILS.pan}), represented by {PUBLISHER_DETAILS.signatory} (hereinafter called the <em>"Publisher"</em>).
                </p>
                <p>
                  <strong>2. AUTHOR:</strong> <strong>{viewingContract.authors.name}</strong>, residing at {viewingContract.authors.address || "Kerala, India"} (Email: {viewingContract.authors.email || "—"}, PAN: {viewingContract.meta.author_pan || viewingContract.authors.pan || "On Record"}) (hereinafter called the <em>"Author"</em>).
                </p>
              </div>

              {/* Articles */}
              <div className="space-y-4">
                <h4 className="font-bold font-sans text-foreground text-sm uppercase tracking-wide">Article 1 — Grant of Rights</h4>
                <p>
                  The Author hereby grants and assigns to the Publisher the exclusive license and right to print, publish, sell, and distribute the literary work provisionally titled <strong>"{viewingContract.titles.name}"</strong> in the Malayalam language throughout the world.
                </p>

                <h4 className="font-bold font-sans text-foreground text-sm uppercase tracking-wide">Article 2 — Commercial & Royalty Terms</h4>
                <ul className="list-disc pl-5 space-y-1.5 font-sans text-xs">
                  <li>
                    <strong>Publishing Model Track:</strong> {viewingContract.meta.publishing_type === "self_publishing" ? "Author-Funded Self-Publishing" : "Traditional Kairali-Funded Publishing"}.
                  </li>
                  <li>
                    <strong>Royalty Rate:</strong> <strong>{viewingContract.royalty_pct}%</strong> calculated on the <strong>{viewingContract.basis.toUpperCase()}</strong> of all printed copies sold.
                  </li>
                  <li>
                    <strong>Advance on Signing:</strong> <strong>{formatPaise(viewingContract.advance_paise)}</strong> (non-refundable, deductible against future royalties).
                  </li>
                  <li>
                    <strong>Author Free Copies:</strong> The Author shall receive <strong>{viewingContract.meta.free_copies} complimentary copies</strong> upon publication.
                  </li>
                  <li>
                    <strong>Author Discount:</strong> The Author is entitled to purchase additional copies at a <strong>{viewingContract.meta.author_discount_pct}% discount</strong> off the printed MRP.
                  </li>
                </ul>

                <h4 className="font-bold font-sans text-foreground text-sm uppercase tracking-wide">Article 3 — Term & Exclusivity</h4>
                <p>
                  This Agreement shall remain in force for an initial period of <strong>{viewingContract.meta.term_years} years</strong> from the date of signing, and shall automatically renew for successive one-year terms unless either party gives 60 days prior written notice.
                </p>

                <h4 className="font-bold font-sans text-foreground text-sm uppercase tracking-wide">Article 4 — Proofreading & Editorial Review</h4>
                <p>
                  The Publisher shall undertake DTP typesetting, page layout, and cover design. Galley proofs shall be submitted to the Author, who will have a 14-day window to approve or submit editorial corrections prior to mass printing.
                </p>

                <h4 className="font-bold font-sans text-foreground text-sm uppercase tracking-wide">Article 5 — Copyright & Reversion</h4>
                <p>
                  Copyright in the literary content of the Work remains solely with the Author © {new Date().getFullYear()} {viewingContract.authors.name}. If the Work remains out of print for a continuous period of 12 months after written demand by the Author, all publishing rights shall revert to the Author.
                </p>

                <h4 className="font-bold font-sans text-foreground text-sm uppercase tracking-wide">Article 6 — Tax & Jurisdiction</h4>
                <p>
                  Royalties are subject to Indian Income Tax TDS under Section 194J. Any legal disputes arising out of this Agreement shall be subject to the exclusive jurisdiction of the Courts in <strong>Kozhikode (Calicut), Kerala</strong>.
                </p>
              </div>

              {/* Signature Blocks */}
              <div className="pt-6 border-t border-black/10 grid grid-cols-2 gap-6 font-sans dark:border-white/10">
                <div className="signature-box rounded-2xl border border-black/10 p-4 bg-black/[0.015] dark:border-white/10 dark:bg-white/[0.015]">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Signed on Behalf of Publisher</span>
                  <p className="mt-2 text-sm font-bold text-foreground">{viewingContract.meta.publisher_signatory || "Radhika Menon"}</p>
                  <p className="text-xs text-muted-foreground">Kairali Books, Kozhikode</p>
                  {viewingContract.meta.publisher_signed_at ? (
                    <div className="mt-3 text-[11px] text-success font-semibold border-t border-black/5 pt-2">
                      ✓ Digitally Certified: {viewingContract.meta.publisher_signed_at.slice(0, 16)}
                    </div>
                  ) : (
                    <div className="mt-3 text-[11px] text-warning font-semibold border-t border-black/5 pt-2">
                      Pending Publisher Signature
                    </div>
                  )}
                </div>

                <div className="signature-box rounded-2xl border border-black/10 p-4 bg-black/[0.015] dark:border-white/10 dark:bg-white/[0.015]">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Signed by Author</span>
                  <p className="mt-2 text-sm font-bold text-foreground">{viewingContract.authors.name}</p>
                  <p className="text-xs text-muted-foreground">PAN: {viewingContract.meta.author_pan || viewingContract.authors.pan || "On Record"}</p>
                  {viewingContract.meta.author_signed_at ? (
                    <div className="mt-3 text-[11px] text-success font-semibold border-t border-black/5 pt-2">
                      ✓ Digitally Certified: {viewingContract.meta.author_signed_at.slice(0, 16)}
                      <span className="block text-[10px] text-muted-foreground font-mono">
                        IP: {viewingContract.meta.author_signer_ip || "Verified"}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-3 text-[11px] text-warning font-semibold border-t border-black/5 pt-2">
                      Pending Author Signature
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer (Hidden on Print) */}
            <div className="no-print border-t border-black/[0.06] bg-surface p-4 flex items-center justify-between dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => copyAuthorLink(viewingContract.id)}
                className="apple-button rounded-xl border border-black/10 px-4 py-2 text-xs font-bold text-foreground hover:bg-black/5 dark:border-white/15"
              >
                Copy Author Signing Link
              </button>

              <button
                type="button"
                onClick={() => window.open(`/contracts/${viewingContract.id}/print`, "_blank")}
                className="apple-button rounded-xl bg-foreground px-4 py-2 text-xs font-bold text-background shadow-xs hover:opacity-90"
              >
                Print / Save Official PDF
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: Publisher Digital Sign */}
      {signingContract && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/15 dark:bg-black/40">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-black/10 bg-surface dark:border-white/15">
            <div className="flex items-center justify-between border-b border-black/[0.06] px-6 py-4 dark:border-white/[0.08]">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-foreground">Sign as Publisher</h3>
                <p className="text-xs text-muted-foreground">{signingContract.titles.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSigningContract(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-muted-foreground transition-colors hover:bg-black/10 hover:text-foreground dark:bg-white/10 dark:hover:bg-white/20"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePublisherSign} className="p-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground/80">
                  Authorized Signatory Name
                </label>
                <input
                  type="text"
                  required
                  value={publisherSignature}
                  onChange={(e) => setPublisherSignature(e.target.value)}
                  className="w-full rounded-xl border border-black/12 bg-black/[0.02] px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all dark:border-white/15 dark:bg-white/[0.03]"
                />
              </div>

              <div className="rounded-xl border border-black/10 bg-black/[0.02] p-4 text-xs text-muted-foreground dark:border-white/10 dark:bg-white/[0.02]">
                By clicking below, you affix the digital authorization seal of Kairali Books to this publishing agreement.
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSigningContract(null)}
                  className="apple-button flex-1 rounded-xl border border-black/12 bg-black/[0.02] py-2.5 text-xs font-bold text-foreground hover:bg-black/[0.05] dark:border-white/15 dark:bg-white/[0.04]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="apple-button flex-1 rounded-xl bg-foreground py-2.5 text-xs font-bold text-background shadow-xs hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? "Signing..." : "Affix Digital Signature"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
