"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PrintReceiptForm({
  projectId,
  publishingType = "kairali_funded",
  authorName = "Author",
  titleName = "Title",
}: {
  projectId: string;
  publishingType?: "kairali_funded" | "self_publishing";
  authorName?: string;
  titleName?: string;
}) {
  const router = useRouter();
  const isSelfPublishing = publishingType === "self_publishing";

  // Printing Press Run Specifications
  const [qty, setQty] = useState(1000);
  const [paper, setPaper] = useState("80gsm Natural Shade");
  const [binding, setBinding] = useState("Perfect Paperback");
  const [vendor, setVendor] = useState("Kairali Press Kozhikode");
  const [costRupees, setCostRupees] = useState(45000);
  const [notes, setNotes] = useState("");

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (qty <= 0) {
      setError("Ordered print quantity must be greater than zero.");
      return;
    }

    setPending(true);
    setError(null);

    const payload = {
      qty: Number(qty),
      paper,
      binding,
      vendor,
      costRupees: Number(costRupees),
      notes: notes.trim() || undefined,
    };

    try {
      const res = await fetch(`/api/production/${projectId}/print-receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body?.error ?? "Failed to log printing run execution");
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
    <form onSubmit={onSubmit} className="rounded-2xl border border-black/10 bg-surface p-6 shadow-sm dark:border-white/10 space-y-6 font-sans">
      {/* Header Banner */}
      <div className="border-b border-black/10 pb-4 dark:border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/10 px-3 py-1 text-xs font-bold text-foreground">
              Step 6 of 8 · Offset Printing Press Run
            </span>
            <h3 className="mt-2 text-lg font-bold text-foreground font-serif">
              Printing Press Order &amp; Execution Specifications
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
          Log offset press job details. Confirming this step advances the project to Post-Production Intake where warehouse delivery, transit damages, and courier tracking are recorded.
        </p>
      </div>

      {/* Press Run Specs Fields */}
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="print_qty" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Print Run Quantity (Copies) <span className="text-danger">*</span>
            </label>
            <input
              id="print_qty"
              type="number"
              min={1}
              required
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              className="w-full rounded-xl border border-black/15 bg-surface px-3.5 py-2 text-sm font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 dark:border-white/15"
            />
            <p className="text-[11px] text-muted-foreground">Contracted print run batch size.</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="print_cost" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Printing Cost (₹) <span className="text-danger">*</span>
            </label>
            <input
              id="print_cost"
              type="number"
              min={0}
              required
              value={costRupees}
              onChange={(e) => setCostRupees(Number(e.target.value))}
              className="w-full rounded-xl border border-black/15 bg-surface px-3.5 py-2 text-sm font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 dark:border-white/15"
            />
            <p className="text-[11px] text-muted-foreground">Total press invoice amount.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="print_vendor" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Printing Press / Vendor <span className="text-danger">*</span>
            </label>
            <input
              id="print_vendor"
              type="text"
              required
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="e.g. Kairali Press Kozhikode, Anaswara Kochi"
              className="w-full rounded-xl border border-black/15 bg-surface px-3.5 py-2 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 dark:border-white/15"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="print_paper" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Paper &amp; Text Stock Specs <span className="text-danger">*</span>
            </label>
            <input
              id="print_paper"
              type="text"
              required
              value={paper}
              onChange={(e) => setPaper(e.target.value)}
              placeholder="e.g. 80gsm Natural Shade Cream, 70gsm Maplitho"
              className="w-full rounded-xl border border-black/15 bg-surface px-3.5 py-2 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 dark:border-white/15"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="print_binding" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Binding Specification <span className="text-danger">*</span>
            </label>
            <select
              id="print_binding"
              value={binding}
              onChange={(e) => setBinding(e.target.value)}
              className="w-full rounded-xl border border-black/15 bg-surface px-3.5 py-2 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 dark:border-white/15"
            >
              <option value="Perfect Paperback">Perfect Paperback (Softcover)</option>
              <option value="Hardbound Case Binding">Hardbound Case Binding</option>
              <option value="Saddle Stitch">Saddle Stitch (Booklet)</option>
              <option value="Hardbound with Dust Jacket">Hardbound with Dust Jacket</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="print_notes" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Production Run Notes (Optional)
            </label>
            <input
              id="print_notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Matte lamination with spot UV on title heading"
              className="w-full rounded-xl border border-black/15 bg-surface px-3.5 py-2 text-sm text-foreground dark:border-white/15"
            />
          </div>
        </div>
      </div>

      {error && <p className="text-xs font-bold text-danger">{error}</p>}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <p className="text-[11px] text-muted-foreground">
          Confirming will create print job PRT record and advance pipeline to <strong>Post-Production Intake</strong>.
        </p>

        <button
          type="submit"
          disabled={pending || qty <= 0}
          className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary-hover transition disabled:opacity-60 cursor-pointer text-center"
        >
          {pending ? "Recording Press Order..." : "✓ Confirm Print Run & Advance to Post-Production →"}
        </button>
      </div>
    </form>
  );
}
