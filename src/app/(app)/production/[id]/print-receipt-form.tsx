"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const CHANNELS = [
  { id: "retail", label: "Retail Bookstore (Kozhikode)", desc: "Direct retail counter billing & store POS" },
  { id: "dealer", label: "Wholesale Dealer Network", desc: "Regional distributors & bookshop network" },
  { id: "fair", label: "Book Fairs & Cultural Expos", desc: "Exhibition stalls & festival sales" },
  { id: "online", label: "Online Store & Web Catalog", desc: "Direct consumer web sales fulfillment" },
];

export default function PrintReceiptForm({
  projectId,
  publishingType = "kairali_funded",
  contractFreeCopies = 10,
  authorName = "Author",
  titleName = "Title",
}: {
  projectId: string;
  publishingType?: "kairali_funded" | "self_publishing";
  contractFreeCopies?: number;
  authorName?: string;
  titleName?: string;
}) {
  const router = useRouter();
  const isSelfPublishing = publishingType === "self_publishing";

  // Step 1: Delivery & Press Specs
  const [qty, setQty] = useState(1000);
  const [receivedQty, setReceivedQty] = useState(1000);
  const [damagedQty, setDamagedQty] = useState(0);
  const [paper, setPaper] = useState("80gsm Natural Shade");
  const [binding, setBinding] = useState("Perfect Paperback");
  const [vendor, setVendor] = useState("Kairali Press Kozhikode");
  const [costRupees, setCostRupees] = useState(45000);

  // Quality Control
  const [qcPassed, setQcPassed] = useState(true);
  const [qcNotes, setQcNotes] = useState("Binding, trimming, and color alignment inspected and verified OK.");

  // Step 2: Track-Aware Stock Split
  const defaultAuthorCopies = isSelfPublishing ? Math.min(200, receivedQty) : contractFreeCopies;
  const [authorCopiesQty, setAuthorCopiesQty] = useState(defaultAuthorCopies);
  const [authorDispatchImmediate, setAuthorDispatchImmediate] = useState(true);
  const [authorDispatchTracking, setAuthorDispatchTracking] = useState("Kairali Courier / Speed Post Handover");

  // Step 3: Sales Channels Activation
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["retail", "dealer", "fair", "online"]);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Computed Usable & Commercial Intake
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
      setError("Quality Control (QC) inspection must be verified and approved to proceed with stock inward.");
      return;
    }
    if (damagedQty > receivedQty) {
      setError("Damaged copies cannot exceed total received quantity.");
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
      qty: Number(qty),
      receivedQty: Number(receivedQty),
      damagedQty: Number(damagedQty),
      paper,
      binding,
      vendor,
      costRupees: Number(costRupees),
      qcPassed: true,
      qcNotes,
      authorCopiesQty: Number(authorCopiesQty),
      authorDispatchImmediate,
      authorDispatchTracking: authorDispatchImmediate ? authorDispatchTracking : undefined,
      channels: selectedChannels,
    };

    try {
      const res = await fetch(`/api/production/${projectId}/print-receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body?.error ?? "Failed to log print receipt & warehouse handover");
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
    <form onSubmit={onSubmit} className="rounded-2xl border border-black/10 bg-surface p-6 shadow-sm dark:border-white/10 space-y-7 font-sans">
      {/* Header Banner */}
      <div className="border-b border-black/10 pb-4 dark:border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/10 px-3 py-1 text-xs font-bold text-foreground">
              Flow 8b · Post-Production Intake &amp; Release
            </span>
            <h3 className="mt-2 text-lg font-bold text-foreground font-serif">
              Press Delivery, Quality Check &amp; Multi-Channel Handover
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
          Record press arrival, verify quality inspection, segregate author copies, and release stock into the Bookstore Management System (BMS).
        </p>
      </div>

      {/* STEP 1: Delivery of Books & QC Inspection */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background text-xs font-black">
            1
          </span>
          <h4 className="text-sm font-bold text-foreground">Delivery of Books &amp; Press Details</h4>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="printQty" className="mb-1 block text-xs font-semibold text-muted-foreground">
              Print Ordered Qty *
            </label>
            <input
              id="printQty"
              type="number"
              min="1"
              value={qty}
              onChange={(e) => {
                const val = Number(e.target.value);
                setQty(val);
                setReceivedQty(val);
              }}
              required
              className="w-full rounded-xl border border-black/15 bg-surface px-3 py-2 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-foreground/20 dark:border-white/15"
            />
          </div>

          <div>
            <label htmlFor="receivedQty" className="mb-1 block text-xs font-semibold text-muted-foreground">
              Delivered at Warehouse *
            </label>
            <input
              id="receivedQty"
              type="number"
              min="1"
              value={receivedQty}
              onChange={(e) => setReceivedQty(Number(e.target.value))}
              required
              className="w-full rounded-xl border border-black/15 bg-surface px-3 py-2 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-foreground/20 dark:border-white/15"
            />
          </div>

          <div>
            <label htmlFor="damagedQty" className="mb-1 block text-xs font-semibold text-muted-foreground">
              Transit / Binder Damages
            </label>
            <input
              id="damagedQty"
              type="number"
              min="0"
              max={receivedQty}
              value={damagedQty}
              onChange={(e) => setDamagedQty(Number(e.target.value))}
              className="w-full rounded-xl border border-black/15 bg-surface px-3 py-2 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-foreground/20 dark:border-white/15"
            />
          </div>

          <div>
            <label htmlFor="printCost" className="mb-1 block text-xs font-semibold text-muted-foreground">
              Total Printing Cost (₹) *
            </label>
            <input
              id="printCost"
              type="number"
              min="0"
              value={costRupees}
              onChange={(e) => setCostRupees(Number(e.target.value))}
              required
              className="w-full rounded-xl border border-black/15 bg-surface px-3 py-2 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-foreground/20 dark:border-white/15"
            />
          </div>

          <div>
            <label htmlFor="paperSpecs" className="mb-1 block text-xs font-semibold text-muted-foreground">
              Paper Specs *
            </label>
            <input
              id="paperSpecs"
              type="text"
              value={paper}
              onChange={(e) => setPaper(e.target.value)}
              required
              className="w-full rounded-xl border border-black/15 bg-surface px-3 py-2 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-foreground/20 dark:border-white/15"
            />
          </div>

          <div>
            <label htmlFor="bindingType" className="mb-1 block text-xs font-semibold text-muted-foreground">
              Binding Style *
            </label>
            <input
              id="bindingType"
              type="text"
              value={binding}
              onChange={(e) => setBinding(e.target.value)}
              required
              className="w-full rounded-xl border border-black/15 bg-surface px-3 py-2 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-foreground/20 dark:border-white/15"
            />
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="printVendor" className="mb-1 block text-xs font-semibold text-muted-foreground">
              Printing Press / Vendor Name *
            </label>
            <input
              id="printVendor"
              type="text"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              required
              className="w-full rounded-xl border border-black/15 bg-surface px-3 py-2 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-foreground/20 dark:border-white/15"
            />
          </div>
        </div>

        {/* QC Inspection Card (Diagram: Stock In -> Green Line OK) */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 dark:border-emerald-400/30 dark:bg-emerald-400/5">
          <div className="flex items-start gap-3">
            <input
              id="qcPassedCheck"
              type="checkbox"
              checked={qcPassed}
              onChange={(e) => setQcPassed(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-emerald-500 text-emerald-600 focus:ring-emerald-500"
            />
            <div className="flex-1">
              <label htmlFor="qcPassedCheck" className="text-xs font-bold text-emerald-700 dark:text-emerald-400 cursor-pointer">
                Quality Inspection Passed (Physical verification OK)
              </label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Physical count verified, binding checked, page trimming verified with zero critical printing flaws.
              </p>
              <input
                type="text"
                value={qcNotes}
                onChange={(e) => setQcNotes(e.target.value)}
                placeholder="QC inspection notes..."
                className="mt-2 w-full rounded-lg border border-emerald-500/20 bg-surface px-3 py-1.5 text-xs text-foreground"
              />
            </div>
          </div>
        </div>
      </div>

      {/* STEP 2: Track-Aware Author Copies Allocation & Segregation */}
      <div className="space-y-4 border-t border-black/10 pt-5 dark:border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background text-xs font-black">
              2
            </span>
            <h4 className="text-sm font-bold text-foreground">
              {isSelfPublishing ? "Self-Publishing Author Allocation" : "Kairali Books Publishing Complimentary Copies"}
            </h4>
          </div>
          <span className="text-xs text-muted-foreground">
            Author: <strong className="text-foreground">{authorName}</strong>
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="authorCopies" className="mb-1 block text-xs font-semibold text-muted-foreground">
              {isSelfPublishing ? "Author Allocated Print Copies" : "Contractual Free Copies"}
            </label>
            <input
              id="authorCopies"
              type="number"
              min="0"
              max={usableCopies}
              value={authorCopiesQty}
              onChange={(e) => setAuthorCopiesQty(Number(e.target.value))}
              required
              className="w-full rounded-xl border border-black/15 bg-surface px-3 py-2 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-foreground/20 dark:border-white/15"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {isSelfPublishing
                ? "Deducted from warehouse stock and designated directly for author delivery."
                : `Complimentary author copies specified in the legal agreement (contract default: ${contractFreeCopies}).`}
            </p>
          </div>

          {/* Real-time Math Summary Card */}
          <div className="rounded-xl border border-black/10 bg-black/[0.02] p-3.5 dark:border-white/10 dark:bg-white/[0.02] space-y-1 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Delivered Books:</span>
              <span className="numeric font-semibold text-foreground">{receivedQty} copies</span>
            </div>
            {damagedQty > 0 && (
              <div className="flex justify-between text-danger">
                <span>Transit Damages:</span>
                <span className="numeric font-semibold">-{damagedQty} copies</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>Author Handover:</span>
              <span className="numeric font-semibold text-foreground">-{authorCopiesQty} copies</span>
            </div>
            <div className="flex justify-between border-t border-black/10 pt-1 text-foreground font-bold dark:border-white/10">
              <span>Commercial Warehouse Inward:</span>
              <span className="numeric text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
                +{netWarehouseCopies} copies
              </span>
            </div>
          </div>
        </div>

        {/* Author Dispatch Tracking */}
        {authorCopiesQty > 0 && (
          <div className="rounded-xl border border-black/10 bg-surface-muted/40 p-4 space-y-3 dark:border-white/10">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-foreground">
              <input
                type="checkbox"
                checked={authorDispatchImmediate}
                onChange={(e) => setAuthorDispatchImmediate(e.target.checked)}
                className="h-4 w-4 rounded border-black/20 text-foreground focus:ring-foreground/20"
              />
              <span>Author Copies Dispatched / Handed Over Today</span>
            </label>

            {authorDispatchImmediate && (
              <div>
                <label htmlFor="authorTracking" className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                  Courier / Handover Tracking Docket Details
                </label>
                <input
                  id="authorTracking"
                  type="text"
                  value={authorDispatchTracking}
                  onChange={(e) => setAuthorDispatchTracking(e.target.value)}
                  placeholder="e.g. DTDC-982183921 / Direct Handover at Kozhikode Office"
                  className="w-full rounded-xl border border-black/15 bg-surface px-3 py-2 text-xs text-foreground"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* STEP 3: Multi-Channel Sales Activation (Retail, Dealer, Fair, Online) */}
      <div className="space-y-4 border-t border-black/10 pt-5 dark:border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background text-xs font-black">
              3
            </span>
            <h4 className="text-sm font-bold text-foreground">Multi-Channel Distribution Activation</h4>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            {selectedChannels.length} of 4 Channels Active
          </span>
        </div>

        <p className="text-xs text-muted-foreground">
          Configure where &ldquo;{titleName}&rdquo; will be made available for sale and fulfillment across Kairali sales networks:
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {CHANNELS.map((ch) => {
            const active = selectedChannels.includes(ch.id);
            return (
              <button
                type="button"
                key={ch.id}
                onClick={() => toggleChannel(ch.id)}
                className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                  active
                    ? "border-foreground bg-foreground/5 shadow-xs dark:bg-foreground/10"
                    : "border-black/10 bg-surface hover:bg-black/[0.02] dark:border-white/10"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    active ? "border-foreground bg-foreground text-background" : "border-muted-foreground"
                  }`}
                >
                  {active && <span className="text-[10px] font-black">✓</span>}
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">{ch.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{ch.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs font-bold text-danger">
          {error}
        </div>
      )}

      {/* STEP 4: Execution & Handover */}
      <div className="border-t border-black/10 pt-5 dark:border-white/10">
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-2xl bg-foreground py-3 text-sm font-bold text-background transition hover:bg-foreground/90 disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
        >
          {pending ? (
            <span>Processing Stock Intake &amp; Handover...</span>
          ) : (
            <>
              <span>Confirm Stock Inward &amp; Complete PMS to BMS Handover</span>
              <span>→</span>
            </>
          )}
        </button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          This logs immutable movements in the stock ledger, caches balance on the title, and publishes the work.
        </p>
      </div>
    </form>
  );
}
