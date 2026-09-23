"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import ArrowRight from "@/components/ui/arrow-right";
import { SmoothDropdown } from "@/components/dropdown";
import { formatPaise } from "@/lib/money";
import { parseContractNotes, type ContractMetadata } from "@/lib/contracts";

export interface AuthorContractItem {
  id: string;
  signed_on: string | null;
  royalty_pct: number;
  basis?: string;
  advance_paise: number;
  created_at: string;
  term_notes: string | null;
  titles: {
    id: string;
    name: string;
    name_ml?: string | null;
    category?: string | null;
    language?: string | null;
  };
  authors?: {
    id: string;
    name: string;
    email: string | null;
  } | null;
}

type EnrichedAuthorContract = AuthorContractItem & {
  meta: ContractMetadata;
  isSigned: boolean;
  isRenegotiation: boolean;
  isDeclined: boolean;
};

export function AuthorContractsClient({
  contracts,
}: {
  contracts: AuthorContractItem[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");

  const enrichedContracts: EnrichedAuthorContract[] = useMemo(() => {
    return contracts.map((c) => {
      const meta: ContractMetadata = parseContractNotes(c.term_notes);
      const isSigned = Boolean(c.signed_on || (meta.author_signed_at && meta.publisher_signed_at));
      const isRenegotiation = Boolean(meta.renegotiation_requested);
      const isDeclined = meta.status === "declined" || Boolean(meta.declined_at);
      return { ...c, meta, isSigned, isRenegotiation, isDeclined };
    });
  }, [contracts]);

  const filteredContracts = useMemo(() => {
    return enrichedContracts
      .filter((c) => {
        const matchesSearch =
          c.titles.name.toLowerCase().includes(search.toLowerCase()) ||
          (c.titles.name_ml && c.titles.name_ml.toLowerCase().includes(search.toLowerCase())) ||
          (c.meta.contract_ref && c.meta.contract_ref.toLowerCase().includes(search.toLowerCase()));

        let matchesStatus = true;
        if (statusFilter === "signed") matchesStatus = c.isSigned;
        else if (statusFilter === "pending") matchesStatus = !c.isSigned && !c.isRenegotiation && !c.isDeclined;
        else if (statusFilter === "renegotiation") matchesStatus = c.isRenegotiation;
        else if (statusFilter === "declined") matchesStatus = c.isDeclined;

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
  const signedCount = enrichedContracts.filter((c) => c.isSigned).length;
  const pendingCount = enrichedContracts.filter((c) => !c.isSigned && !c.isRenegotiation && !c.isDeclined).length;
  const renegotiationCount = enrichedContracts.filter((c) => c.isRenegotiation).length;

  return (
    <div className="space-y-6 pb-12 animate-apple-in">
      {/* Header Banner */}
      <header className="relative overflow-hidden rounded-[28px] border border-[#7e2562]/15 bg-white p-6 shadow-plum-sm sm:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
         
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              My Contracts &amp; Agreements
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-2xl">
              View, review, and digitally execute your publishing agreements, commercial royalty terms, and legal rights documents.
            </p>
          </div>

          <Link
            href="/author"
            className="apple-button inline-flex items-center gap-2 rounded-xl border border-[#7e2562]/20 bg-white px-4 py-2.5 text-xs font-bold text-[#7e2562] shadow-2xs hover:bg-[#faedf5] shrink-0"
          >
            <svg className="h-4 w-4 shrink-0 text-[#7e2562]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </header>

      {/* Owner-style Metric Summary Tiles */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <div className="rounded-2xl border border-[#7e2562]/15 bg-white p-4.5 shadow-2xs">
          <span className="text-xs font-bold text-muted-foreground">Total Contracts</span>
          <p className="mt-1 text-2xl font-black text-foreground">{totalCount}</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4.5 shadow-2xs">
          <span className="text-xs font-bold text-emerald-800">Fully Dual-Signed</span>
          <p className="mt-1 text-2xl font-black text-emerald-900">{signedCount}</p>
        </div>

        <div className={`rounded-2xl border p-4.5 shadow-2xs ${renegotiationCount > 0 ? "border-amber-400 bg-amber-50/70" : "border-amber-200 bg-amber-50/50"}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800">Terms Review</span>
            {renegotiationCount > 0 && (
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white animate-pulse">
                Action Req.
              </span>
            )}
          </div>
          <p className="mt-1 text-2xl font-black text-amber-950">{renegotiationCount}</p>
        </div>

        <div className="rounded-2xl border border-[#7e2562]/20 bg-[#faedf5]/60 p-4.5 shadow-2xs">
          <span className="text-xs font-bold text-[#7e2562]">Awaiting Signature</span>
          <p className="mt-1 text-2xl font-black text-[#7e2562]">{pendingCount}</p>
        </div>
      </div>

      {/* Owner-style Search & Filter Bar */}
      {(() => {
        const hasFilter = Boolean(search || statusFilter !== "all" || (sortBy && sortBy !== "recent"));
        return (
          <div className={`relative z-20 flex flex-col gap-3 rounded-2xl border bg-white p-4 transition-all duration-200 sm:flex-row sm:items-center sm:justify-between ${
            hasFilter ? "border-[#7e2562]/35 shadow-plum-md" : "border-[#7e2562]/15 shadow-plum-sm"
          }`}>
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search by title or contract reference ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-background px-3.5 py-2 text-xs font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-[#7e2562] focus:ring-2 focus:ring-[#7e2562]/20"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="w-48">
                <SmoothDropdown
                  size="sm"
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val as any)}
                  ariaLabel="Filter by status"
                  buttonClassName={
                    statusFilter && statusFilter !== "all"
                      ? "!border-[#7e2562] !ring-2 !ring-[#7e2562]/30 !shadow-plum-sm font-bold bg-[#faedf5]/40 text-black"
                      : ""
                  }
                  options={[
                    { value: "all", label: "All Statuses" },
                    { value: "signed", label: "Fully Signed" },
                    { value: "pending", label: "Awaiting Signature" },
                    { value: "renegotiation", label: "Terms Review" },
                    { value: "declined", label: "Declined / Concluded" },
                  ]}
                />
              </div>

              <div className="w-48">
                <SmoothDropdown
                  size="sm"
                  value={sortBy}
                  onChange={(val) => setSortBy(val)}
                  ariaLabel="Sort contracts"
                  buttonClassName="!border-[#7e2562] !ring-2 !ring-[#7e2562]/30 !shadow-plum-sm font-bold bg-[#faedf5]/40 text-black"
                  options={[
                    { value: "recent", label: "Newest Created" },
                    { value: "oldest", label: "Oldest Created" },
                    { value: "title_asc", label: "Title (A → Z)" },
                    { value: "title_desc", label: "Title (Z → A)" },
                    { value: "royalty_desc", label: "Royalty (High → Low)" },
                    { value: "advance_desc", label: "Advance (High → Low)" },
                  ]}
                />
              </div>

              {hasFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setSortBy("recent");
                  }}
                  className="apple-button inline-flex items-center gap-1.5 rounded-xl border border-[#7e2562]/20 bg-[#faedf5]/30 px-3 py-1.5 text-xs font-bold text-[#7e2562] shadow-2xs hover:bg-[#faedf5] transition-all cursor-pointer"
                >
                  <span className="text-sm">✕</span>
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Owner-style Contracts Table Container */}
      <section className="relative z-10 overflow-hidden rounded-3xl border border-[#7e2562]/15 bg-white shadow-plum-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#7e2562]/10 bg-[#faf6f9]/60 text-xs font-bold tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Contract / Title</th>
                <th className="px-6 py-4 whitespace-nowrap">Publishing Track &amp; Terms</th>
                <th className="px-6 py-4 whitespace-nowrap">Advance (₹)</th>
                <th className="px-6 py-4 whitespace-nowrap">Signing Status</th>
                <th className="px-6 py-4 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#7e2562]/8">
              {filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-muted-foreground">
                    No publishing contracts found matching your search or filters.
                  </td>
                </tr>
              ) : (
                filteredContracts.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-[#faf6f9]/50">
                    {/* Contract Ref & Title */}
                    <td className="px-6 py-4">
                      <div>
                        <span className="text-[11px] font-mono font-bold text-muted-foreground">
                          {c.meta.contract_ref || "CON-2026-0001"}
                        </span>
                        <p className="font-extrabold text-foreground text-base leading-snug">{c.titles.name}</p>
                        {c.titles.name_ml && (
                          <p className="text-xs text-muted-foreground font-ml">{c.titles.name_ml}</p>
                        )}
                        <span className="text-xs text-muted-foreground mt-0.5 block">
                          Created {c.created_at.slice(0, 10)}
                        </span>
                      </div>
                    </td>

                    {/* Track & Commercial Terms */}
                    <td className="px-6 py-4">
                      <div>
                        <span className="inline-flex items-center rounded-lg bg-[#faedf5] px-2.5 py-0.5 text-[11px] font-bold text-[#7e2562] border border-[#7e2562]/20">
                          {c.meta.publishing_type === "self_publishing" ? "Self-Publishing Track" : "Kairali-Funded Track"}
                        </span>
                        <p className="mt-1.5 text-xs font-bold text-foreground">
                          {c.royalty_pct}% Royalty · {c.meta.term_years ?? 3} Years · {c.meta.free_copies ?? 10} Copies
                        </p>
                        {c.meta.author_discount_pct && (
                          <span className="text-[11px] text-muted-foreground block">
                            {c.meta.author_discount_pct}% Author Purchase Discount
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Advance Amount */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-extrabold text-foreground text-sm">
                        {c.advance_paise > 0 ? formatPaise(c.advance_paise) : "—"}
                      </span>
                    </td>

                    {/* Signing Status */}
                    <td className="px-6 py-4">
                      <div className="space-y-1.5 max-w-xs">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border whitespace-nowrap ${
                            c.isSigned
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs"
                              : c.isRenegotiation
                              ? "bg-amber-50 text-amber-900 border-amber-300 animate-pulse shadow-2xs"
                              : c.isDeclined
                              ? "bg-rose-50 text-rose-800 border-rose-300"
                              : "bg-[#faedf5] text-[#7e2562] border-[#7e2562]/25"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              c.isSigned ? "bg-emerald-600" : c.isRenegotiation ? "bg-amber-600" : c.isDeclined ? "bg-rose-600" : "bg-[#7e2562]"
                            }`}
                          />
                          <span>
                            {c.isSigned
                              ? "Dual-Signed & Executed"
                              : c.isRenegotiation
                              ? "Terms Review Requested"
                              : c.isDeclined
                              ? "Offer Concluded / Declined"
                              : "Awaiting Signature"}
                          </span>
                        </span>

                        {c.signed_on && (
                          <span className="text-[11px] text-muted-foreground block">
                            Executed on {c.signed_on.slice(0, 10)}
                          </span>
                        )}

                        {c.meta.author_feedback && (
                          <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-950">
                            <span className="font-bold text-amber-900 block text-[11px]">Your Requested Adjustments:</span>
                            <p className="mt-0.5 italic leading-tight text-xs line-clamp-2">&ldquo;{c.meta.author_feedback}&rdquo;</p>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/publish/contract/${c.id}`}
                          className="apple-button inline-flex items-center gap-1.5 rounded-xl bg-[#7e2562] px-4 py-2 text-xs font-bold text-white shadow-plum-sm hover:bg-[#681b50] transition-all"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>{c.isSigned ? "View Agreement" : c.isRenegotiation ? "Check Status" : "Review & Sign"}</span>
                          <ArrowRight size={12} />
                        </Link>

                        <Link
                          href={`/publish/contract/${c.id}/print`}
                          target="_blank"
                          className="apple-button inline-flex items-center justify-center p-2 rounded-xl border border-black/10 bg-white text-muted-foreground hover:text-foreground hover:bg-black/5 transition-all"
                          title="Print / View PDF Document"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
