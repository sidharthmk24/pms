"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import ArrowRight from "@/components/ui/arrow-right";
import { SmoothDropdown } from "@/components/dropdown";
import { formatPaise, paiseToRupees } from "@/lib/money";
import {
  parseContractNotes,
  getContractStatus,
  PUBLISHER_DETAILS,
  type ContractMetadata,
  type ContractStatus,
  type PublishingTrack,
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

  // Owner Reassign / Revise / Decline Modal State
  const [revisingContract, setRevisingContract] = useState<EnrichedContract | null>(null);
  const [revPublishingType, setRevPublishingType] = useState<PublishingTrack>("kairali_funded");
  const [revRoyaltyPct, setRevRoyaltyPct] = useState<number>(10);
  const [revBasis, setRevBasis] = useState<"mrp" | "net">("mrp");
  const [revAdvanceRupees, setRevAdvanceRupees] = useState<number>(0);
  const [revTermYears, setRevTermYears] = useState<number>(3);
  const [revFreeCopies, setRevFreeCopies] = useState<number>(10);
  const [revAuthorDiscountPct, setRevAuthorDiscountPct] = useState<number>(40);
  const [revPackageCostRupees, setRevPackageCostRupees] = useState<number>(0);
  const [revEditorNotes, setRevEditorNotes] = useState<string>("");
  const [declineReason, setDeclineReason] = useState<string>("");
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [acceptNotes, setAcceptNotes] = useState<string>("");
  const [isSubmittingRevise, setIsSubmittingRevise] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function openReviseModal(c: EnrichedContract) {
    setRevisingContract(c);
    setRevPublishingType(c.meta.publishing_type || "kairali_funded");
    setRevRoyaltyPct(c.royalty_pct || 10);
    setRevBasis((c.basis === "net" ? "net" : "mrp"));
    setRevAdvanceRupees(paiseToRupees(c.advance_paise || 0));
    setRevTermYears(c.meta.term_years || 3);
    setRevFreeCopies(c.meta.free_copies || 10);
    setRevAuthorDiscountPct(c.meta.author_discount_pct || 40);
    setRevPackageCostRupees(c.meta.package_cost_rupees || 0);
    setRevEditorNotes(c.meta.notes || "");
    setDeclineReason("");
    setAcceptNotes("");
    setShowDeclineConfirm(false);
    setShowAcceptConfirm(false);
  }

  function openAcceptModal(c: EnrichedContract) {
    openReviseModal(c);
    setShowAcceptConfirm(true);
    setShowDeclineConfirm(false);
  }

  function openDeclineModal(c: EnrichedContract) {
    openReviseModal(c);
    setShowDeclineConfirm(true);
    setShowAcceptConfirm(false);
  }

  function openCounterModal(c: EnrichedContract) {
    openReviseModal(c);
    setShowAcceptConfirm(false);
    setShowDeclineConfirm(false);
  }

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
  const renegotiationCount = enrichedContracts.filter((c) => c.status === "renegotiation_requested").length;
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

  async function handleReviseSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!revisingContract) return;

    setIsSubmittingRevise(true);
    try {
      const res = await fetch(`/api/contracts/${revisingContract.id}/revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "revise",
          publishingType: revPublishingType,
          royaltyPct: Number(revRoyaltyPct),
          basis: revBasis,
          advanceRupees: Number(revAdvanceRupees) || 0,
          termYears: Number(revTermYears) || 3,
          freeCopies: Number(revFreeCopies) || 10,
          authorDiscountPct: Number(revAuthorDiscountPct) || 40,
          packageCostRupees: Number(revPackageCostRupees) || 0,
          editorNotes: revEditorNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data?.error ?? "Failed to update contract terms");
      } else {
        setRevisingContract(null);
        router.refresh();
      }
    } catch {
      alert("Network error while updating contract");
    } finally {
      setIsSubmittingRevise(false);
    }
  }

  async function handleDeclineSubmit() {
    if (!revisingContract) return;

    setIsSubmittingRevise(true);
    try {
      const res = await fetch(`/api/contracts/${revisingContract.id}/revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "decline",
          reason: declineReason.trim() || "Publisher and author could not reach agreement on publishing terms.",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data?.error ?? "Failed to decline contract offer");
      } else {
        setRevisingContract(null);
        setShowDeclineConfirm(false);
        router.refresh();
      }
    } catch {
      alert("Network error while declining contract");
    } finally {
      setIsSubmittingRevise(false);
    }
  }

  async function handleAcceptSubmit() {
    if (!revisingContract) return;

    setIsSubmittingRevise(true);
    try {
      const res = await fetch(`/api/contracts/${revisingContract.id}/revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "accept",
          notes: acceptNotes.trim() || "Publisher accepted author terms request.",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data?.error ?? "Failed to accept contract terms");
      } else {
        setRevisingContract(null);
        setShowAcceptConfirm(false);
        router.refresh();
      }
    } catch {
      alert("Network error while accepting contract");
    } finally {
      setIsSubmittingRevise(false);
    }
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
        <div className={`rounded-2xl border p-4.5 shadow-2xs ${renegotiationCount > 0 ? "border-amber-400 bg-amber-50/70" : "border-amber-200 bg-amber-50/50"}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800">Review Requested</span>
            {renegotiationCount > 0 && (
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white animate-pulse">
                Action Req.
              </span>
            )}
          </div>
          <p className="mt-1 text-2xl font-black text-amber-950">{renegotiationCount}</p>
        </div>
        <div className="rounded-2xl border border-[#7e2562]/20 bg-[#faedf5]/60 p-4.5 shadow-2xs">
          <span className="text-xs font-bold text-[#7e2562]">Awaiting Author</span>
          <p className="mt-1 text-2xl font-black text-[#7e2562]">{pendingAuthorCount}</p>
        </div>
      </div>

      {/* Filter Bar */}
      {(() => {
        const hasFilter = Boolean(search || statusFilter !== "all" || (sortBy && sortBy !== "recent"));
        return (
          <div className={`relative z-20 flex flex-col gap-3 rounded-2xl border bg-white p-4 transition-all duration-200 sm:flex-row sm:items-center sm:justify-between ${
            hasFilter ? "border-[#7e2562]/35 shadow-plum-md" : "border-[#7e2562]/15 shadow-plum-sm"
          }`}>
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search by title, author, or contract ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-background px-3.5 py-2 text-xs font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-[#7e2562] focus:ring-2 focus:ring-[#7e2562]/20 dark:border-white/10"
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
                      ? "!border-[#7e2562] !ring-2 !ring-[#7e2562]/30 !shadow-plum-sm font-bold bg-[#faedf5]/40 text-black dark:text-white"
                      : ""
                  }
                  options={[
                    { value: "all", label: "All Statuses" },
                    { value: "renegotiation_requested", label: "Review Requested" },
                    { value: "signed", label: "Fully Signed" },
                    { value: "awaiting_author", label: "Awaiting Author" },
                    { value: "awaiting_publisher", label: "Awaiting Publisher" },
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
                  buttonClassName="!border-[#7e2562] !ring-2 !ring-[#7e2562]/30 !shadow-plum-sm font-bold bg-[#faedf5]/40 text-black dark:text-white"
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

              {hasFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setSortBy("recent");
                  }}
                  className="apple-button inline-flex items-center gap-1.5 rounded-xl border border-[#7e2562]/20 bg-[#faedf5]/30 px-3 py-1.5 text-xs font-bold text-[#7e2562] shadow-2xs hover:bg-[#faedf5] hover:border-[#7e2562]/40 transition-all cursor-pointer"
                >
                  <span className="text-sm">✕</span>
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Contracts Table */}
      <section className="relative z-10 overflow-hidden rounded-3xl border border-[#7e2562]/15 bg-white shadow-plum-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#7e2562]/10 bg-[#faf6f9]/60 text-xs font-bold   tracking-wider text-muted-foreground">
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
                  const isRenegotiation = c.status === "renegotiation_requested";
                  const isDeclined = c.status === "declined";
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
                        {c.meta.author_feedback && (
                          <div className="mt-2 max-w-sm rounded-xl border border-amber-300 bg-amber-50/95 p-2.5 text-xs text-amber-950 shadow-2xs">
                            <div className="flex items-center gap-1 font-bold text-amber-900 text-[11px]">
                              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white font-black text-[9px]">!</span>
                              <span>Author Renegotiation Request:</span>
                            </div>
                            <p className="mt-1   italic text-foreground text-xs leading-snug line-clamp-3">
                              &ldquo;{c.meta.author_feedback}&rdquo;
                            </p>
                          </div>
                        )}
                        {!c.meta.author_feedback && c.meta.decline_reason && (
                          <div className="mt-2 max-w-sm rounded-xl border border-rose-200 bg-rose-50/90 p-2 text-xs text-rose-900 line-clamp-2">
                            <span className="font-bold">Decline Reason: </span>
                            <span className="italic">&ldquo;{c.meta.decline_reason}&rdquo;</span>
                          </div>
                        )}
                      </td>

                      {/* Track & Terms */}
                      <td className="px-6 py-4">
                        <div>
                          <span className="inline-flex items-center rounded-lg bg-black/[0.05] px-2 py-0.5 text-[11px] font-bold   tracking-wider text-foreground dark:bg-white/[0.08]">
                            {c.meta.publishing_type === "self_publishing" ? "Self-Publishing" : "Kairali-Funded"}
                          </span>
                          <p className="mt-1 text-xs font-semibold text-muted-foreground">
                            {c.royalty_pct}% Royalty · {c.meta.term_years} Yrs · {c.meta.free_copies} Copies
                          </p>
                        </div>
                      </td>

                      {/* Advance */}
                      <td className="px-6 py-4 font-semibold text-foreground">
                        {c.advance_paise > 0 ? formatPaise(c.advance_paise) : "—"}
                      </td>

                      {/* Signing Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isSigned && (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-300 shadow-2xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0" />
                            Dual-Signed
                          </span>
                        )}
                        {isRenegotiation && (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900 border border-amber-300 shadow-2xs animate-pulse">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-600 shrink-0" />
                            Review Requested
                          </span>
                        )}
                        {isDeclined && (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-800 border border-rose-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-600 shrink-0" />
                            Offer Declined
                          </span>
                        )}
                        {!isSigned && !isRenegotiation && !isDeclined && isAwaitingAuthor && (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-600 shrink-0" />
                            Awaiting Author
                          </span>
                        )}
                        {!isSigned && !isRenegotiation && !isDeclined && isAwaitingPublisher && (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#faedf5] px-3 py-1 text-xs font-bold text-[#7e2562] border border-[#7e2562]/25">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#7e2562] shrink-0" />
                            Awaiting Publisher
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isRenegotiation && (
                            <>
                              {/* 1. Accept */}
                              <button
                                onClick={() => openAcceptModal(c)}
                                title="Accept author request and reissue agreement"
                                className="apple-button inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 active:scale-[0.98] transition-all cursor-pointer"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Accept</span>
                              </button>

                              {/* 2. Decline */}
                              <button
                                onClick={() => openDeclineModal(c)}
                                title="Decline / terminate agreement offer"
                                className="apple-button inline-flex items-center gap-1 rounded-xl border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-800 hover:bg-rose-100 active:scale-[0.98] transition-all cursor-pointer"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span>Decline</span>
                              </button>
                            </>
                          )}

                          {isDeclined && (
                            <button
                              onClick={() => openReviseModal(c)}
                              className="apple-button inline-flex items-center gap-1.5 rounded-xl bg-[#7e2562] px-3 py-1.5 text-xs font-extrabold text-white shadow-plum-sm hover:bg-[#681b50] transition-all cursor-pointer"
                            >
                              <span>Reassign Contract</span>
                              <ArrowRight size={12} />
                            </button>
                          )}

                          {!isSigned && !isDeclined && !isRenegotiation && (
                            <button
                              onClick={() => openReviseModal(c)}
                              title="Modify agreement terms"
                              className="apple-button inline-flex items-center gap-1.5 rounded-xl border border-black/15 bg-white px-2.5 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-black/5 transition-all cursor-pointer"
                            >
                              <svg className="h-3.5 w-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              <span>Edit Terms</span>
                            </button>
                          )}

                          <button
                            onClick={() => setViewingContract(c)}
                            className="apple-button inline-flex items-center gap-1.5 rounded-xl border border-[#7e2562]/25 bg-white px-3 py-1.5 text-xs font-bold text-[#7e2562] shadow-2xs hover:bg-[#faedf5] hover:border-[#7e2562]/40 transition-all cursor-pointer"
                          >
                            <svg className="h-3.5 w-3.5 text-[#7e2562]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>View Agreement</span>
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
        <div className="printable-contract-container fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
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
                className="flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-muted-foreground transition-colors hover:bg-black/10 hover:text-foreground dark:bg-white/10 dark:hover:bg-white/20 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Agreement Content (Printable Legal Document) */}
            <div className="printable-contract flex-1 overflow-y-auto p-8 space-y-6 text-sm text-foreground/90 leading-relaxed ">
              {/* Document Letterhead */}
              <div className="text-center pb-5 border-b border-black/15 dark:border-white/15">
                <span className="text-[11px] font-mono font-bold text-muted-foreground   tracking-widest block mb-1">
                  Contract Ref: {viewingContract.meta.contract_ref || "CON-2026-0001"}
                </span>
                <h2 className="text-xl font-bold   tracking-wider font-sans text-foreground">
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
                <h4 className="font-bold font-sans text-foreground text-sm   tracking-wide">Article 1 — Grant of Rights</h4>
                <p>
                  The Author hereby grants and assigns to the Publisher the exclusive license and right to print, publish, sell, and distribute the literary work provisionally titled <strong>"{viewingContract.titles.name}"</strong> in the Malayalam language throughout the world.
                </p>

                <h4 className="font-bold font-sans text-foreground text-sm   tracking-wide">Article 2 — Commercial & Royalty Terms</h4>
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

                <h4 className="font-bold font-sans text-foreground text-sm   tracking-wide">Article 3 — Term & Exclusivity</h4>
                <p>
                  This Agreement shall remain in force for an initial period of <strong>{viewingContract.meta.term_years} years</strong> from the date of signing, and shall automatically renew for successive one-year terms unless either party gives 60 days prior written notice.
                </p>

                <h4 className="font-bold font-sans text-foreground text-sm   tracking-wide">Article 4 — Proofreading & Editorial Review</h4>
                <p>
                  The Publisher shall undertake DTP typesetting, page layout, and cover design. Galley proofs shall be submitted to the Author, who will have a 14-day window to approve or submit editorial corrections prior to mass printing.
                </p>

                <h4 className="font-bold font-sans text-foreground text-sm   tracking-wide">Article 5 — Copyright & Reversion</h4>
                <p>
                  Copyright in the literary content of the Work remains solely with the Author © {new Date().getFullYear()} {viewingContract.authors.name}. If the Work remains out of print for a continuous period of 12 months after written demand by the Author, all publishing rights shall revert to the Author.
                </p>

                <h4 className="font-bold font-sans text-foreground text-sm   tracking-wide">Article 6 — Tax & Jurisdiction</h4>
                <p>
                  Royalties are subject to Indian Income Tax TDS under Section 194J. Any legal disputes arising out of this Agreement shall be subject to the exclusive jurisdiction of the Courts in <strong>Kozhikode (Calicut), Kerala</strong>.
                </p>
              </div>

              {/* Signature Blocks */}
              <div className="pt-6 border-t border-black/10 grid grid-cols-2 gap-6 font-sans dark:border-white/10">
                <div className="signature-box rounded-2xl border border-black/10 p-4 bg-black/[0.015] dark:border-white/10 dark:bg-white/[0.015]">
                  <span className="text-[11px] font-bold text-muted-foreground   tracking-wider block">Signed on Behalf of Publisher</span>
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
                  <span className="text-[11px] font-bold text-muted-foreground   tracking-wider block">Signed by Author</span>
                  
                  {viewingContract.meta.author_signature?.startsWith("data:image/") ? (
                    <div className="my-2 p-1.5 bg-white border border-black/10 rounded-xl inline-block shadow-2xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={viewingContract.meta.author_signature}
                        alt="Author Signature"
                        className="h-10 max-w-[180px] object-contain"
                      />
                    </div>
                  ) : viewingContract.meta.author_signature ? (
                    <p className="font-serif italic text-sm text-foreground my-1">
                      {viewingContract.meta.author_signature}
                    </p>
                  ) : null}

                  <p className="mt-1 text-sm font-bold text-foreground">{viewingContract.authors.name}</p>
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
              <div className="flex items-center gap-2">
                {!viewingContract.signed_on && (
                  <button
                    type="button"
                    onClick={() => {
                      const c = viewingContract;
                      setViewingContract(null);
                      openReviseModal(c);
                    }}
                    className="apple-button rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 cursor-pointer"
                  >
                    Edit / Reassign Terms
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => window.open(`/contracts/${viewingContract.id}/print`, "_blank")}
                className="apple-button rounded-xl bg-foreground px-4 py-2 text-xs font-bold text-background shadow-xs hover:opacity-90 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-black/10 bg-surface dark:border-white/15">
            <div className="flex items-center justify-between border-b border-black/[0.06] px-6 py-4 dark:border-white/[0.08]">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-foreground">Sign as Publisher</h3>
                <p className="text-xs text-muted-foreground">{signingContract.titles.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSigningContract(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-muted-foreground transition-colors hover:bg-black/10 hover:text-foreground dark:bg-white/10 dark:hover:bg-white/20 cursor-pointer"
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
                  className="apple-button flex-1 rounded-xl border border-black/12 bg-black/[0.02] py-2.5 text-xs font-bold text-foreground hover:bg-black/[0.05] dark:border-white/15 dark:bg-white/[0.04] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="apple-button flex-1 rounded-xl bg-foreground py-2.5 text-xs font-bold text-background shadow-xs hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Signing..." : "Affix Digital Signature"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: Owner Review, Reassign Terms or Decline */}
      {revisingContract && mounted && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRevisingContract(null);
          }}
        >
          <div className="relative flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl animate-in zoom-in-95 duration-150 my-auto">
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between border-b border-border bg-slate-50/80 px-5 py-3.5">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Review &amp; Reassign Publishing Terms
                </h3>
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{revisingContract.titles.name}</span> · Author: <span className="font-semibold text-[#7e2562]">{revisingContract.authors.name}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRevisingContract(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-black/5 hover:text-foreground cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* Author's Requested Revision / Feedback Alert (if present) */}
              {(revisingContract.meta.author_feedback || revisingContract.meta.decline_reason) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-950 text-xs">Author&apos;s Requested Changes:</span>
                    {revisingContract.meta.renegotiation_requested_at && (
                      <span className="font-mono text-[10px] text-amber-800">
                        {revisingContract.meta.renegotiation_requested_at.slice(0, 10)}
                      </span>
                    )}
                  </div>
                  <div className="rounded-lg border border-amber-200/80 bg-white p-2.5">
                    <p className="text-foreground   italic text-xs leading-relaxed whitespace-pre-wrap">
                      &ldquo;{revisingContract.meta.author_feedback || revisingContract.meta.decline_reason}&rdquo;
                    </p>
                  </div>
                </div>
              )}

              {/* Form to Update Terms */}
              <form onSubmit={handleReviseSubmit} id="revise-contract-form" className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-semibold text-foreground">Publishing Track</label>
                    <SmoothDropdown
                      options={[
                        { value: "kairali_funded", label: "Kairali Books Funded Track" },
                        { value: "self_publishing", label: "Self-Publishing Track" },
                      ]}
                      value={revPublishingType}
                      onChange={(val) => setRevPublishingType(val as PublishingTrack)}
                      size="sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-semibold text-foreground">Royalty Basis</label>
                    <SmoothDropdown
                      options={[
                        { value: "mrp", label: "Standard Royalty Basis" },
                        { value: "net", label: "Percentage of Net Receipts" },
                      ]}
                      value={revBasis}
                      onChange={(val) => setRevBasis(val as "mrp" | "net")}
                      size="sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-semibold text-foreground">
                      Royalty Rate (%) <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        required
                        value={revRoyaltyPct}
                        onChange={(e) => setRevRoyaltyPct(parseFloat(e.target.value) || 0)}
                        className="w-full rounded-lg border border-input bg-white px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-[#7e2562] focus:ring-2 focus:ring-[#7e2562]/20"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block font-semibold text-foreground">
                      Advance on Signing (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                      <input
                        type="number"
                        min={0}
                        step={500}
                        value={revAdvanceRupees}
                        onChange={(e) => setRevAdvanceRupees(parseInt(e.target.value, 10) || 0)}
                        className="w-full rounded-lg border border-input bg-white pl-7 pr-3 py-2 text-xs font-medium text-foreground outline-none focus:border-[#7e2562] focus:ring-2 focus:ring-[#7e2562]/20"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1 block font-semibold text-foreground">Term (Years)</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      required
                      value={revTermYears}
                      onChange={(e) => setRevTermYears(parseInt(e.target.value, 10) || 1)}
                      className="w-full rounded-lg border border-input bg-white px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-[#7e2562] focus:ring-2 focus:ring-[#7e2562]/20"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-semibold text-foreground">Free Copies</label>
                    <input
                      type="number"
                      min={0}
                      max={500}
                      required
                      value={revFreeCopies}
                      onChange={(e) => setRevFreeCopies(parseInt(e.target.value, 10) || 0)}
                      className="w-full rounded-lg border border-input bg-white px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-[#7e2562] focus:ring-2 focus:ring-[#7e2562]/20"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-semibold text-foreground">Author Disc (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      required
                      value={revAuthorDiscountPct}
                      onChange={(e) => setRevAuthorDiscountPct(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-input bg-white px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-[#7e2562] focus:ring-2 focus:ring-[#7e2562]/20"
                    />
                  </div>
                </div>

                {revPublishingType === "self_publishing" && (
                  <div>
                    <label className="mb-1 block font-semibold text-foreground">Package Cost (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={revPackageCostRupees}
                      onChange={(e) => setRevPackageCostRupees(parseInt(e.target.value, 10) || 0)}
                      className="w-full rounded-lg border border-input bg-white px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-[#7e2562] focus:ring-2 focus:ring-[#7e2562]/20"
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1 block font-semibold text-foreground">
                    Explanation / Note to Author <span className="text-muted-foreground font-normal">(Included in Email)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={revEditorNotes}
                    onChange={(e) => setRevEditorNotes(e.target.value)}
                    placeholder="e.g. We have reviewed your request and updated the contract terms accordingly..."
                    className="w-full rounded-lg border border-input bg-white p-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-[#7e2562] focus:ring-2 focus:ring-[#7e2562]/20 resize-y"
                  />
                </div>
              </form>

              {/* Accept Confirmation Area (if toggled) */}
              {showAcceptConfirm && (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50/90 p-4 space-y-2.5 animate-in fade-in">
                  <div className="flex items-center gap-2 font-bold text-emerald-950 text-xs">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white font-black text-[10px]">✓</span>
                    <span>Confirm Acceptance of Author&apos;s Request:</span>
                  </div>
                  <p className="text-emerald-900 leading-relaxed text-xs">
                    This will approve the author&apos;s requested terms and notify <strong>{revisingContract.authors.name}</strong> so they can proceed with signing.
                  </p>
                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-950 mb-1">
                      Message to Author <span className="text-muted-foreground font-normal">(Optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={acceptNotes}
                      onChange={(e) => setAcceptNotes(e.target.value)}
                      placeholder="e.g. We have accepted your requested terms. The contract is ready for your digital signature."
                      className="w-full rounded-lg border border-emerald-300 bg-white p-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-emerald-600 resize-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAcceptConfirm(false)}
                      className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingRevise}
                      onClick={handleAcceptSubmit}
                      className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmittingRevise ? "Accepting..." : "Confirm & Accept"}
                    </button>
                  </div>
                </div>
              )}

              {/* Decline Confirmation Area (if toggled) */}
              {showDeclineConfirm && (
                <div className="rounded-xl border border-rose-300 bg-rose-50/90 p-4 space-y-2.5 animate-in fade-in">
                  <div className="flex items-center gap-2 font-bold text-rose-950 text-xs">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-white font-black text-[10px]">✕</span>
                    <span>Confirm Decline / Offer Withdrawal:</span>
                  </div>
                  <p className="text-rose-900 leading-relaxed text-xs">
                    This will mark the publishing contract offer as <strong>Declined</strong> and notify the author.
                  </p>
                  <div>
                    <label className="block text-[11px] font-semibold text-rose-950 mb-1">
                      Reason for Author <span className="text-muted-foreground font-normal">(Optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={declineReason}
                      onChange={(e) => setDeclineReason(e.target.value)}
                      placeholder="e.g. We are unable to accommodate the requested royalty terms at our current scale..."
                      className="w-full rounded-lg border border-rose-300 bg-white p-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-rose-600 resize-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowDeclineConfirm(false)}
                      className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-900 hover:bg-rose-100 cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingRevise}
                      onClick={handleDeclineSubmit}
                      className="rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmittingRevise ? "Declining..." : "Confirm & Decline"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-border bg-slate-50 px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {!showDeclineConfirm && !showAcceptConfirm && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAcceptConfirm(true);
                        setShowDeclineConfirm(false);
                      }}
                      className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 cursor-pointer"
                    >
                      ✓ Accept...
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeclineConfirm(true);
                        setShowAcceptConfirm(false);
                      }}
                      className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 cursor-pointer"
                    >
                      ✕ Decline...
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setRevisingContract(null)}
                  className="rounded-lg border border-input bg-white px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="revise-contract-form"
                  disabled={isSubmittingRevise}
                  className="rounded-lg bg-[#7e2562] px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#681b50] disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingRevise ? "Saving..." : "Save & Reassign Contract"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
