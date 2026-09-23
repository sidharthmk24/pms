"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { SmoothDropdown } from "@/components/dropdown";
import { parseContractNotes } from "@/lib/contracts";
import { paiseToRupees } from "@/lib/money";

interface ContractData {
  id: string;
  royalty_pct: number;
  basis: string;
  advance_paise: number;
  signed_on: string | Date | null;
  term_notes: string | null;
  titles: { id: string; name: string; mrp_paise?: number };
  authors: { id: string; name: string; email?: string | null };
}

interface ContractActionsProps {
  contract: ContractData;
  canManage: boolean;
}

export default function ContractActions({ contract, canManage }: ContractActionsProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const meta = parseContractNotes(contract.term_notes);
  const isRenegotiation = meta.renegotiation_requested ?? false;
  const isDeclined = meta.status === "declined" || Boolean(meta.declined_at);
  const isSigned = Boolean(contract.signed_on);

  const [activeModal, setActiveModal] = useState<"accept" | "decline" | "counter" | null>(null);

  // Form state
  const [publishingType, setPublishingType] = useState<"kairali_funded" | "self_publishing">(
    meta.publishing_type || "kairali_funded"
  );
  const [royaltyPct, setRoyaltyPct] = useState<number>(contract.royalty_pct || 10);
  const [basis, setBasis] = useState<"mrp" | "net">(contract.basis === "net" ? "net" : "mrp");
  const [advanceRupees, setAdvanceRupees] = useState<number>(paiseToRupees(contract.advance_paise || 0));
  const [mrpRupees, setMrpRupees] = useState<number>(
    contract.titles?.mrp_paise ? contract.titles.mrp_paise / 100 : meta.agreed_mrp_rupees || 350
  );
  const [termYears, setTermYears] = useState<number>(meta.term_years || 3);
  const [freeCopies, setFreeCopies] = useState<number>(meta.free_copies || 10);
  const [authorDiscountPct, setAuthorDiscountPct] = useState<number>(meta.author_discount_pct || 40);
  const [packageCostRupees, setPackageCostRupees] = useState<number>(meta.package_cost_rupees || 0);
  const [editorNotes, setEditorNotes] = useState<string>(meta.notes || "");

  // Accept & Decline inputs
  const [acceptNotes, setAcceptNotes] = useState<string>("");
  const [declineReason, setDeclineReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetForm() {
    setPublishingType(meta.publishing_type || "kairali_funded");
    setRoyaltyPct(contract.royalty_pct || 10);
    setBasis(contract.basis === "net" ? "net" : "mrp");
    setAdvanceRupees(paiseToRupees(contract.advance_paise || 0));
    setMrpRupees(contract.titles?.mrp_paise ? contract.titles.mrp_paise / 100 : meta.agreed_mrp_rupees || 350);
    setTermYears(meta.term_years || 3);
    setFreeCopies(meta.free_copies || 10);
    setAuthorDiscountPct(meta.author_discount_pct || 40);
    setPackageCostRupees(meta.package_cost_rupees || 0);
    setEditorNotes(meta.notes || "");
    setAcceptNotes("");
    setDeclineReason("");
  }

  function openModal(type: "accept" | "decline" | "counter") {
    resetForm();
    setActiveModal(type);
  }

  function closeModal() {
    setActiveModal(null);
  }

  async function handleAccept() {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/contracts/${contract.id}/revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "accept",
          notes: acceptNotes.trim() || "Publisher accepted author terms request.",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data?.error ?? "Failed to accept terms");
      } else {
        closeModal();
        router.refresh();
      }
    } catch {
      alert("Network error while accepting terms");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDecline() {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/contracts/${contract.id}/revise`, {
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
        closeModal();
        router.refresh();
      }
    } catch {
      alert("Network error while declining contract");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCounterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/contracts/${contract.id}/revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "revise",
          publishingType,
          royaltyPct,
          basis,
          advanceRupees,
          mrpRupees,
          termYears,
          freeCopies,
          authorDiscountPct,
          packageCostRupees: publishingType === "self_publishing" ? packageCostRupees : 0,
          editorNotes: editorNotes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data?.error ?? "Failed to reassign updated contract terms");
      } else {
        closeModal();
        router.refresh();
      }
    } catch {
      alert("Network error while saving counter-offer");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 pt-2">
      {/* Author Renegotiation / Review Request Message */}
      {(isRenegotiation || meta.author_feedback) && !isDeclined && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white font-bold text-xs">
                !
              </span>
              <span className="text-xs font-semibold text-amber-950">Author&apos;s Review / Revision Request:</span>
            </div>
            {meta.renegotiation_requested_at && (
              <span className="rounded-md bg-white/80 px-2 py-0.5 text-[11px] font-mono text-amber-900 border border-amber-200/60">
                {meta.renegotiation_requested_at.slice(0, 10)}
              </span>
            )}
          </div>
          <div className="rounded-lg border border-amber-200/70 bg-white p-3">
            <p className="text-foreground italic text-xs leading-relaxed whitespace-pre-wrap">
              &ldquo;{meta.author_feedback || meta.decline_reason}&rdquo;
            </p>
          </div>
        </div>
      )}

      {/* Offer Concluded Notice if Declined */}
      {isDeclined && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-white font-bold text-xs">✕</span>
            <span className="text-xs font-bold text-rose-950">Publishing Offer Concluded</span>
          </div>
          <p className="text-xs text-rose-800 leading-relaxed pl-7">
            This publishing agreement offer has been declined and concluded. {meta.decline_reason ? `Reason: "${meta.decline_reason}"` : ""}
          </p>
        </div>
      )}

      {/* Action Buttons for Editorial Desk */}
      {!isSigned && !isDeclined && canManage && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground   tracking-wider">
              {isRenegotiation ? "Author Negotiation Actions" : "Publishing Agreement Controls"}
            </span>
            {isRenegotiation && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-900">
                Revision Requested
              </span>
            )}
          </div>

          {isRenegotiation ? (
            /* When author has requested revision: show ONLY Accept and Decline */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Button 1: Accept */}
              <button
                type="button"
                onClick={() => openModal("accept")}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-[0.98] transition-all cursor-pointer"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Accept Request</span>
              </button>

              {/* Button 2: Decline */}
              <button
                type="button"
                onClick={() => openModal("decline")}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-800 hover:bg-rose-100 active:scale-[0.98] transition-all cursor-pointer"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Decline Offer</span>
              </button>
            </div>
          ) : (
            /* Once accepted/active agreement: show Review & Edit Terms and Decline */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Button 1: Review & Edit Terms */}
              <button
                type="button"
                onClick={() => openModal("counter")}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#7e2562] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#681b50] active:scale-[0.98] transition-all cursor-pointer"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <span>Review &amp; Edit Terms</span>
              </button>

              {/* Button 2: Decline */}
              <button
                type="button"
                onClick={() => openModal("decline")}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-800 hover:bg-rose-100 active:scale-[0.98] transition-all cursor-pointer"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Decline Offer</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* PORTAL MODAL 1: Accept Confirmation */}
      {mounted && activeModal === "accept" && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between border-b border-emerald-100 bg-emerald-50/70 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-sm shadow-xs">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-950">Accept Author&apos;s Request</h3>
                  <p className="text-[11px] text-emerald-800">{contract.titles.name} · {contract.authors.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-black/5 hover:text-foreground cursor-pointer"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3.5 text-xs">
              <p className="text-foreground leading-relaxed">
                You are accepting the requested changes for <strong>{contract.authors.name}</strong>. The contract will be updated and ready for signing.
              </p>

              {(meta.author_feedback || meta.decline_reason) && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 space-y-1">
                  <span className="font-semibold text-amber-950 text-[11px]">Author&apos;s Note:</span>
                  <p className="  italic text-foreground text-xs leading-relaxed">
                    &ldquo;{meta.author_feedback || meta.decline_reason}&rdquo;
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Message to Author <span className="text-muted-foreground font-normal">(Included in Email)</span>
                </label>
                <textarea
                  rows={3}
                  value={acceptNotes}
                  onChange={(e) => setAcceptNotes(e.target.value)}
                  placeholder="e.g. We have accepted your requested terms. The contract is ready for your digital signature."
                  className="w-full rounded-lg border border-input bg-white p-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-border bg-slate-50 px-5 py-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-input bg-white px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleAccept}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? "Accepting..." : "Confirm & Accept Request"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* PORTAL MODAL 2: Decline Confirmation */}
      {mounted && activeModal === "decline" && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between border-b border-rose-100 bg-rose-50/70 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 text-white font-bold text-sm shadow-xs">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-rose-950">Decline Contract Offer</h3>
                  <p className="text-[11px] text-rose-800">{contract.titles.name} · {contract.authors.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-black/5 hover:text-foreground cursor-pointer"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3.5 text-xs">
              <p className="text-rose-900 leading-relaxed">
                This will mark the publishing contract offer as <strong>Declined</strong> and notify the author that publishing terms could not be reached.
              </p>

              <div>
                <label className="block text-xs font-semibold text-rose-950 mb-1">
                  Reason / Message for Author <span className="text-muted-foreground font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="e.g. We are unable to accommodate the requested royalty terms at our current scale..."
                  className="w-full rounded-lg border border-rose-300 bg-white p-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-border bg-slate-50 px-5 py-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-input bg-white px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDecline}
                className="rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? "Declining..." : "Confirm & Decline Agreement"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* PORTAL MODAL 3: Main Terms Counter / Revise Modal */}
      {mounted && activeModal === "counter" && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
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
                  <span className="font-semibold text-foreground">{contract.titles.name}</span> · Author: <span className="font-semibold text-[#7e2562]">{contract.authors.name}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-black/5 hover:text-foreground cursor-pointer"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* Author's Requested Revision / Feedback Alert */}
              {(meta.author_feedback || meta.decline_reason) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-950 text-xs">Author&apos;s Requested Changes:</span>
                    {meta.renegotiation_requested_at && (
                      <span className="font-mono text-[10px] text-amber-800">
                        {meta.renegotiation_requested_at.slice(0, 10)}
                      </span>
                    )}
                  </div>
                  <div className="rounded-lg border border-amber-200/80 bg-white p-2.5">
                    <p className="text-foreground   italic text-xs leading-relaxed whitespace-pre-wrap">
                      &ldquo;{meta.author_feedback || meta.decline_reason}&rdquo;
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleCounterSubmit} id="counter-contract-form" className="space-y-3.5">
                {/* Section: Commercial Terms */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-semibold text-foreground">Publishing Track</label>
                    <SmoothDropdown
                      options={[
                        { value: "kairali_funded", label: "Kairali Books Funded Track" },
                        { value: "self_publishing", label: "Self-Publishing Track" },
                      ]}
                      value={publishingType}
                      onChange={(val) => setPublishingType(val as "kairali_funded" | "self_publishing")}
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
                      value={basis}
                      onChange={(val) => setBasis(val as "mrp" | "net")}
                      size="sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                        value={royaltyPct}
                        onChange={(e) => setRoyaltyPct(parseFloat(e.target.value) || 0)}
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
                        value={advanceRupees}
                        onChange={(e) => setAdvanceRupees(parseInt(e.target.value, 10) || 0)}
                        className="w-full rounded-lg border border-input bg-white pl-7 pr-3 py-2 text-xs font-medium text-foreground outline-none focus:border-[#7e2562] focus:ring-2 focus:ring-[#7e2562]/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block font-semibold text-foreground">
                      Agreed Book MRP (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                      <input
                        type="number"
                        min={0}
                        step={10}
                        required
                        value={mrpRupees}
                        onChange={(e) => setMrpRupees(parseFloat(e.target.value) || 0)}
                        className="w-full rounded-lg border border-input bg-white pl-7 pr-3 py-2 text-xs font-medium text-foreground outline-none focus:border-[#7e2562] focus:ring-2 focus:ring-[#7e2562]/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Rights & Benefits */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1 block font-semibold text-foreground">Term (Years)</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      required
                      value={termYears}
                      onChange={(e) => setTermYears(parseInt(e.target.value, 10) || 1)}
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
                      value={freeCopies}
                      onChange={(e) => setFreeCopies(parseInt(e.target.value, 10) || 0)}
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
                      value={authorDiscountPct}
                      onChange={(e) => setAuthorDiscountPct(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-input bg-white px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-[#7e2562] focus:ring-2 focus:ring-[#7e2562]/20"
                    />
                  </div>
                </div>

                {publishingType === "self_publishing" && (
                  <div>
                    <label className="mb-1 block font-semibold text-foreground">Package Cost (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={packageCostRupees}
                      onChange={(e) => setPackageCostRupees(parseInt(e.target.value, 10) || 0)}
                      className="w-full rounded-lg border border-input bg-white px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-[#7e2562] focus:ring-2 focus:ring-[#7e2562]/20"
                    />
                  </div>
                )}

                {/* Section: Note to author */}
                <div>
                  <label className="mb-1 block font-semibold text-foreground">
                    Explanation / Note to Author <span className="text-muted-foreground font-normal">(Included in Email)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={editorNotes}
                    onChange={(e) => setEditorNotes(e.target.value)}
                    placeholder="e.g. We have reviewed your request and updated the contract terms accordingly..."
                    className="w-full rounded-lg border border-input bg-white p-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-[#7e2562] focus:ring-2 focus:ring-[#7e2562]/20 resize-y"
                  />
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-border bg-slate-50 px-5 py-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-input bg-white px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="counter-contract-form"
                disabled={isSubmitting}
                className="rounded-lg bg-[#7e2562] px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#681b50] disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? "Saving..." : "Save & Reassign Contract"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
