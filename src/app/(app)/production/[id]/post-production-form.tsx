"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const CHANNELS = [
  { id: "retail", label: "Retail Bookstore (Kozhikode)", desc: "Direct retail counter billing & store POS" },
  { id: "dealer", label: "Wholesale Dealer Network", desc: "Regional distributors & bookshop network" },
  { id: "fair", label: "Book Fairs & Cultural Expos", desc: "Exhibition stalls & festival sales" },
  { id: "online", label: "Online Store & Web Catalog", desc: "Direct consumer web sales fulfillment" },
];

export default function PostProductionForm({
  projectId,
  publishingType = "kairali_funded",
  contractFreeCopies = 10,
  authorName = "Author",
  titleName = "Title",
  orderedQty = 1000,
}: {
  projectId: string;
  publishingType?: "kairali_funded" | "self_publishing";
  contractFreeCopies?: number;
  authorName?: string;
  titleName?: string;
  orderedQty?: number;
}) {
  const router = useRouter();
  const isSelfPublishing = publishingType === "self_publishing";

  // Warehouse intake & physical delivery
  const [receivedQty, setReceivedQty] = useState(orderedQty);
  const [damagedQty, setDamagedQty] = useState(0);

  // Quality Control Inspection
  const [qcPassed, setQcPassed] = useState(true);
  const [qcNotes, setQcNotes] = useState("Binding, trimming, and color alignment inspected and verified OK.");

  // Author copies & Courier Docket Details
  const defaultAuthorCopies = isSelfPublishing ? Math.min(200, receivedQty) : contractFreeCopies;
  const [authorCopiesQty, setAuthorCopiesQty] = useState(defaultAuthorCopies);
  const [authorDispatchImmediate, setAuthorDispatchImmediate] = useState(true);
  const [authorDispatchTracking, setAuthorDispatchTracking] = useState("Kairali Courier / Speed Post Handover");

  // Multi-channel sales release
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["retail", "dealer", "fair", "online"]);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculated usable copies & commercial intake
  const usableCopies = Math.max(0, receivedQty - damagedQty);
  const netWarehouseCopies = Math.max(0, usableCopies - authorCopiesQty);

  function toggleChannel(channelId: string) {
    setSelectedChannels((prev) =>
      prev.includes(channelId) ? prev.filter((c) => c !== channelId) : [...prev, channelId]
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!qcPassed) {
      setError("Quality Control (QC) inspection must be verified and approved to complete post-production.");
      return;
    }
    if (damagedQty > receivedQty) {
      setError("Damaged copies cannot exceed physically received quantity.");
      return;
    }
    if (authorCopiesQty > usableCopies) {
      setError(`Author copies (${authorCopiesQty}) cannot exceed usable copies (${usableCopies}).`);
      return;
    }
    if (selectedChannels.length === 0) {
      setError("Please select at least one sales distribution channel.");
      return;
    }

    setPending(true);
    setError(null);

    const payload = {
      receivedQty: Number(receivedQty),
      damagedQty: Number(damagedQty),
      qcPassed: true,
      qcNotes,
      authorCopiesQty: Number(authorCopiesQty),
      authorDispatchImmediate,
      authorDispatchTracking: authorDispatchImmediate ? authorDispatchTracking : undefined,
      channels: selectedChannels,
    };

    try {
      const res = await fetch(`/api/production/${projectId}/post-production`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body?.error ?? "Failed to complete post-production and warehouse handover");
      } else {
        router.refresh();
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-primary/20 bg-surface p-6 shadow-sm dark:border-primary/20 space-y-7 font-sans">
      {/* Header Banner */}
      <div className="border-b border-black/10 pb-4 dark:border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              Step 7 of 8 · Post-Production Intake &amp; Handover
            </span>
            <h3 className="mt-2 text-lg font-bold text-foreground font-serif">
              Warehouse Delivery, Damage Inspection &amp; Courier Docket Handover
            </h3>
          </div>
          <span
            className={`rounded-full px-3.5 py-1 text-xs font-bold ${
              isSelfPublishing
                ? "border border-accent/20 bg-accent/10 text-accent"
                : "border border-primary/20 bg-primary/10 text-primary"
            }`}
          >
            {isSelfPublishing ? "Self-Publishing Track" : "Kairali Books Publishing Track"}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Record physical delivery at warehouse, inspect transit / binder damages, log courier docket details for author copies, and release commercial inventory. Only completing this step marks the book officially complete.
        </p>
      </div>

      {/* STEP 1: Warehouse Delivery & Damage Inspection */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            1
          </span>
          <h4 className="text-sm font-bold text-foreground">Delivered at Warehouse &amp; Transit Damages</h4>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="post_received_qty" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Delivered at Warehouse (Copies) <span className="text-danger">*</span>
            </label>
            <input
              id="post_received_qty"
              type="number"
              min={1}
              required
              value={receivedQty}
              onChange={(e) => setReceivedQty(Number(e.target.value))}
              className="w-full rounded-xl border border-black/15 bg-surface px-3.5 py-2 text-sm font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 dark:border-white/15"
            />
            <p className="text-[11px] text-muted-foreground">
              Total physical count of book cartons received at the warehouse.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="post_damaged_qty" className="block text-xs font-bold uppercase tracking-wider text-danger">
              Transit / Binder Damages (Copies)
            </label>
            <input
              id="post_damaged_qty"
              type="number"
              min={0}
              max={receivedQty}
              value={damagedQty}
              onChange={(e) => setDamagedQty(Number(e.target.value))}
              className="w-full rounded-xl border border-danger/30 bg-danger/5 px-3.5 py-2 text-sm font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-danger/20"
            />
            <p className="text-[11px] text-muted-foreground">
              Defective binding, torn jackets, or carton crush during transit.
            </p>
          </div>
        </div>

        {/* QC Verification Card */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={qcPassed}
                onChange={(e) => setQcPassed(e.target.checked)}
                className="rounded border-border text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                Quality Control (QC) Physical Inspection Approved
              </span>
            </label>
            <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">
              ✓ Usable: {usableCopies} copies
            </span>
          </div>

          <div className="space-y-1">
            <label htmlFor="post_qc_notes" className="block text-[11px] font-semibold text-muted-foreground">
              Inspection Notes / Verification Observations:
            </label>
            <input
              id="post_qc_notes"
              type="text"
              value={qcNotes}
              onChange={(e) => setQcNotes(e.target.value)}
              placeholder="e.g. Verified spine gluing, lamination quality, and trim alignment."
              className="w-full rounded-lg border border-black/10 bg-background px-3 py-1.5 text-xs text-foreground dark:border-white/10"
            />
          </div>
        </div>
      </div>

      {/* STEP 2: Author Copies Allocation & Courier Docket Details */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            2
          </span>
          <h4 className="text-sm font-bold text-foreground">Author Copies Allocation &amp; Courier Docket Details</h4>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="post_author_copies" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Author Allocation (Copies)
            </label>
            <input
              id="post_author_copies"
              type="number"
              min={0}
              max={usableCopies}
              value={authorCopiesQty}
              onChange={(e) => setAuthorCopiesQty(Number(e.target.value))}
              className="w-full rounded-xl border border-black/15 bg-surface px-3.5 py-2 text-sm font-semibold text-foreground dark:border-white/15"
            />
            <p className="text-[11px] text-muted-foreground">
              Contract quota: <strong>{defaultAuthorCopies} copies</strong> for {authorName}.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="post_courier_tracking" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Courier / Handover Tracking Docket Details
            </label>
            <input
              id="post_courier_tracking"
              type="text"
              value={authorDispatchTracking}
              onChange={(e) => setAuthorDispatchTracking(e.target.value)}
              placeholder="e.g. DTDC Consignment #KL-89211 or Speed Post EK123456789IN"
              className="w-full rounded-xl border border-black/15 bg-surface px-3.5 py-2 text-sm text-foreground dark:border-white/15"
            />
            <p className="text-[11px] text-muted-foreground">
              Docket number sent directly in the author milestone celebration email.
            </p>
          </div>
        </div>
      </div>

      {/* STEP 3: Multi-Channel Sales Release */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            3
          </span>
          <h4 className="text-sm font-bold text-foreground">Active Distribution Channels</h4>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {CHANNELS.map((ch) => {
            const isSelected = selectedChannels.includes(ch.id);
            return (
              <label
                key={ch.id}
                onClick={() => toggleChannel(ch.id)}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all ${
                  isSelected
                    ? "border-primary/40 bg-primary/5 text-foreground shadow-2xs"
                    : "border-black/10 bg-surface-muted/30 text-muted-foreground dark:border-white/10 opacity-70"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  className="mt-0.5 rounded border-border text-primary focus:ring-primary"
                />
                <div className="text-xs leading-tight">
                  <span className="font-bold text-foreground block">{ch.label}</span>
                  <span className="text-[11px] text-muted-foreground">{ch.desc}</span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Summary Matrix */}
      <div className="rounded-xl border border-black/10 bg-background/80 p-4 dark:border-white/10">
        <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Post-Production Intake Ledger Summary
        </h5>
        <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          <div className="rounded-lg bg-surface p-2.5 border border-black/5 dark:border-white/5">
            <span className="text-muted-foreground block text-[11px]">Received</span>
            <span className="font-mono text-sm font-bold text-foreground">{receivedQty}</span>
          </div>
          <div className="rounded-lg bg-danger/5 p-2.5 border border-danger/10">
            <span className="text-danger block text-[11px]">Transit Damages</span>
            <span className="font-mono text-sm font-bold text-danger">-{damagedQty}</span>
          </div>
          <div className="rounded-lg bg-amber-500/5 p-2.5 border border-amber-500/10">
            <span className="text-amber-700 dark:text-amber-400 block text-[11px]">Author Copies</span>
            <span className="font-mono text-sm font-bold text-amber-700 dark:text-amber-400">-{authorCopiesQty}</span>
          </div>
          <div className="rounded-lg bg-emerald-500/10 p-2.5 border border-emerald-500/20">
            <span className="text-emerald-700 dark:text-emerald-400 block text-[11px] font-bold">Commercial Intake</span>
            <span className="font-mono text-sm font-extrabold text-emerald-700 dark:text-emerald-400">+{netWarehouseCopies}</span>
          </div>
        </div>
      </div>

      {error && <p className="text-xs font-bold text-danger">{error}</p>}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <p className="text-[11px] text-muted-foreground">
          Submitting will credit <strong>{netWarehouseCopies} copies</strong> to inventory and send author the celebration email.
        </p>

        <button
          type="submit"
          disabled={pending || !qcPassed || usableCopies <= 0}
          className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary-hover transition disabled:opacity-60 cursor-pointer text-center"
        >
          {pending ? "Completing Post-Production..." : "✓ Complete Post-Production & Mark Book Live →"}
        </button>
      </div>
    </form>
  );
}
