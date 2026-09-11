"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { SmoothDropdown } from "@/components/dropdown";
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
  const [sortBy, setSortBy] = useState<string>("recent");
  const [viewingContract, setViewingContract] = useState<EnrichedContract | null>(null);
  const [signingContract, setSigningContract] = useState<EnrichedContract | null>(null);
  const [publisherSignature, setPublisherSignature] = useState("Radhika Menon");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const enrichedContracts = useMemo(() => {
    return contracts.map((c) => {
      const meta = parseContractNotes(c.term_notes);
      const status = getContractStatus(c);
      return { ...c, meta, status };
    });
  }, [contracts]);

  const filtered = useMemo(() => {
    return enrichedContracts
      .filter((c) => {
        const matchesSearch =
          c.titles.name.toLowerCase().includes(search.toLowerCase()) ||
          c.authors.name.toLowerCase().includes(search.toLowerCase()) ||
          (c.meta.contract_ref && c.meta.contract_ref.toLowerCase().includes(search.toLowerCase()));

        const matchesStatus = statusFilter === "all" || c.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "recent") {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortBy === "oldest") {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (sortBy === "title_asc") {
          return a.titles.name.localeCompare(b.titles.name);
        }
        if (sortBy === "title_desc") {
          return b.titles.name.localeCompare(a.titles.name);
        }
        if (sortBy === "author_asc") {
          return a.authors.name.localeCompare(b.authors.name);
        }
        if (sortBy === "author_desc") {
          return b.authors.name.localeCompare(a.authors.name);
        }
        if (sortBy === "royalty_desc") {
          return b.royalty_pct - a.royalty_pct;
        }
        if (sortBy === "advance_desc") {
          return b.advance_paise - a.advance_paise;
        }
        return 0;
      });
  }, [enrichedContracts, search, statusFilter, sortBy]);

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
        <div className="rounded-2xl border border-[#7e2562]/15 bg-white p-4.5 shadow-2xs">
          <span className="text-xs font-bold text-muted-foreground">Total Contracts</span>
          <p className="mt-1 text-2xl font-black text-foreground">{totalCount}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4.5 shadow-2xs">
          <span className="text-xs font-bold text-emerald-800">Fully Dual-Signed</span>
          <p className="mt-1 text-2xl font-black text-emerald-900">{signedCount}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4.5 shadow-2xs">
          <span className="text-xs font-bold text-amber-800">Awaiting Author Sign</span>
          <p className="mt-1 text-2xl font-black text-amber-900">{pendingAuthorCount}</p>
        </div>
        <div className="rounded-2xl border border-[#7e2562]/20 bg-[#faedf5]/60 p-4.5 shadow-2xs">
          <span className="text-xs font-bold text-[#7e2562]">Awaiting Publisher</span>
          <p className="mt-1 text-2xl font-black text-[#7e2562]">{pendingPublisherCount}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="relative z-20 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by title, author, or contract ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-black/12 bg-surface px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-foreground/40 focus:ring-2 focus:ring-foreground/5 dark:border-white/15"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-44">
            <SmoothDropdown
              size="sm"
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as any)}
              ariaLabel="Filter by status"
              options={[
                { value: "all", label: "All Statuses" },
                { value: "signed", label: "Fully Signed" },
                { value: "awaiting_author", label: "Awaiting Author" },
                { value: "awaiting_publisher", label: "Awaiting Publisher" },
              ]}
            />
          </div>

          <div className="w-48">
            <SmoothDropdown
              size="sm"
              value={sortBy}
              onChange={(val) => setSortBy(val)}
              ariaLabel="Sort contracts"
              options={[
                { value: "recent", label: "Newest Created" },
                { value: "oldest", label: "Oldest Created" },
                { value: "title_asc", label: "Title (A → Z)" },
                { value: "title_desc", label: "Title (Z → A)" },
                { value: "author_asc", label: "Author (A → Z)" },
                { value: "author_desc", label: "Author (Z → A)" },
                { value: "royalty_desc", label: "Royalty (High → Low)" },
                { value: "advance_desc", label: "Advance (High → Low)" },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Contracts Table */}
      <section className="relative z-10 overflow-hidden rounded-3xl border border-[#7e2562]/15 bg-white shadow-plum-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#7e2562]/10 bg-[#faf6f9]/60 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Contract / Title</th>
                <th className="px-6 py-4 whitespace-nowrap">Author</th>
                <th className="px-6 py-4 whitespace-nowrap">Track & Terms</th>
                <th className="px-6 py-4 whitespace-nowrap">Advance (₹)</th>
                <th className="px-6 py-4 whitespace-nowrap">Signing Status</th>
                <th className="px-6 py-4 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#7e2562]/8">
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
                    <tr key={c.id} className="transition-colors hover:bg-[#faf6f9]/50">
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
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-300 shadow-2xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            Dual-Signed
                          </span>
                        )}
                        {isAwaitingAuthor && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                            Awaiting Author
                          </span>
                        )}
                        {isAwaitingPublisher && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#faedf5] px-3 py-1 text-xs font-bold text-[#7e2562] border border-[#7e2562]/25">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#7e2562]" />
                            Awaiting Publisher
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewingContract(c)}
                            className="apple-button inline-flex items-center gap-1 rounded-xl border border-[#7e2562]/25 bg-white px-3 py-1.5 text-xs font-bold text-[#7e2562] shadow-2xs hover:bg-[#faedf5] hover:border-[#7e2562]/40 transition-all cursor-pointer"
                          >
                            View Agreement
                          </button>

                          {isAwaitingPublisher && (
                            <button
                              onClick={() => {
                                setSigningContract(c);
                                setPublisherSignature(currentUserName);
                              }}
                              className="apple-button inline-flex items-center gap-1.5 rounded-xl bg-[#7e2562] px-3.5 py-1.5 text-xs font-bold text-white shadow-plum-sm hover:bg-[#681b50] active:scale-[0.98] transition-all cursor-pointer"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              <span>Publisher Sign</span>
                            </button>
                          )}

                          <button
                            onClick={() => copyAuthorLink(c.id)}
                            title="Copy secure author signing link"
                            className={`apple-button inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                              copiedId === c.id
                                ? "border-emerald-600 bg-emerald-600 text-white shadow-2xs"
                                : "border-black/15 bg-white text-muted-foreground hover:text-foreground hover:bg-black/5 hover:border-black/25 shadow-2xs"
                            }`}
                          >
                            <svg className="h-3.5 w-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>{copiedId === c.id ? "Copied!" : "Author Link"}</span>
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
            <div className="printable-contract flex-1 overflow-y-auto p-8 space-y-6 text-sm text-foreground/90 leading-relaxed ">
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
                    <strong>Publishing Model Track:</strong> {viewingContract.meta.publishing_type === "self_publishing" ? "Self-Publishing" : "Kairali Books Publishing"}.
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
