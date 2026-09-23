"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { SmoothDropdown, type DropdownOption } from "@/components/dropdown";
import StageConfirmModal from "@/components/stage-confirm-modal";
import ArrowRight from "@/components/ui/arrow-right";

const DEFAULT_PAPER_SPECS = [
  "80gsm Natural Shade Cream (Standard Book)",
  "70gsm Natural Shade Cream",
  "70gsm Maplitho White",
  "80gsm Maplitho White",
  "100gsm Art Paper (Gloss / Matte)",
  "130gsm Art Paper",
  "70gsm Bulky Book Paper",
];

const BINDING_OPTIONS: DropdownOption[] = [
  {
    value: "Perfect Paperback",
    label: "Perfect Paperback (Softcover)",
    description: "Standard glue spine paperback binding",
  },
  {
    value: "Hardbound Case Binding",
    label: "Hardbound Case Binding",
    description: "Rigid board cover case bound",
  },
  {
    value: "Saddle Stitch",
    label: "Saddle Stitch (Booklet)",
    description: "Center staple binding",
  },
  {
    value: "Hardbound with Dust Jacket",
    label: "Hardbound with Dust Jacket",
    description: "Casebound with printed outer jacket",
  },
];

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
  const [paper, setPaper] = useState("80gsm Natural Shade Cream (Standard Book)");
  const [customPaperSpecs, setCustomPaperSpecs] = useState<string[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInput, setCustomInput] = useState("");

  const [binding, setBinding] = useState("Perfect Paperback");
  const [vendor, setVendor] = useState("Kairali Press Kozhikode");
  const [costRupees, setCostRupees] = useState(45000);
  const [notes, setNotes] = useState("");

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Load custom specs from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("kairali_custom_paper_specs");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCustomPaperSpecs(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  function handleAddCustomPaper() {
    const trimmed = customInput.trim();
    if (!trimmed) return;

    // Prepend to custom list so newest added is placed at the very top
    const updated = [trimmed, ...customPaperSpecs.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())];
    setCustomPaperSpecs(updated);
    setPaper(trimmed);
    setShowCustomInput(false);
    setCustomInput("");

    try {
      localStorage.setItem("kairali_custom_paper_specs", JSON.stringify(updated));
    } catch {
      // ignore
    }
  }

  // Build options for SmoothDropdown with custom specs placed on top
  const paperDropdownOptions = useMemo<DropdownOption[]>(() => {
    return [
      ...customPaperSpecs.map((spec) => ({
        value: spec,
        label: spec,
        description: "Custom Added Spec",
      })),
      ...DEFAULT_PAPER_SPECS.map((spec) => ({
        value: spec,
        label: spec,
        description: "Standard Paper Stock",
      })),
      {
        value: "__CUSTOM__",
        label: "+ Other / Custom GSM Spec…",
        description: "Add a new paper specification",
      },
    ];
  }, [customPaperSpecs]);

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (qty <= 0) {
      setError("Ordered print quantity must be greater than zero.");
      return;
    }
    setShowConfirmModal(true);
  }

  async function executeSubmit() {
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
        setShowConfirmModal(false);
      } else {
        setShowConfirmModal(false);
        router.refresh();
      }
    } catch {
      setError("Failed to connect to server");
      setShowConfirmModal(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleFormSubmit} className="rounded-3xl border border-black/10 bg-surface p-6 shadow-sm dark:border-white/10 space-y-6 font-sans">
      {/* Header Banner */}
      <div className="border-b border-black/10 pb-4 dark:border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/10 px-3 py-1 text-xs font-bold text-foreground">
              Step 6 of 8 · Offset Printing Press Run
            </span>
            <h3 className="mt-2 text-lg font-bold text-foreground">
              Printing Press Order &amp; Execution Specifications
            </h3>
          </div>
          <span
            className={`rounded-full px-3.5 py-1 text-xs font-bold ${
              isSelfPublishing
                ? "border border-accent/20 bg-accent/10 text-accent"
                : "border border-[#7e2562]/20 bg-[#faedf5] text-[#7e2562]"
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
            <label htmlFor="print_qty" className="block text-xs font-bold   tracking-wider text-muted-foreground">
              Print Run Quantity (Copies) <span className="text-danger">*</span>
            </label>
            <input
              id="print_qty"
              type="number"
              min={1}
              required
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              className="w-full rounded-xl border border-black/15 bg-surface px-3.5 py-2 text-sm font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-[#7e2562]/20 dark:border-white/15"
            />
            <p className="text-[11px] text-muted-foreground">Contracted print run batch size.</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="print_cost" className="block text-xs font-bold   tracking-wider text-muted-foreground">
              Total Printing Cost (₹) <span className="text-danger">*</span>
            </label>
            <input
              id="print_cost"
              type="number"
              min={0}
              required
              value={costRupees}
              onChange={(e) => setCostRupees(Number(e.target.value))}
              className="w-full rounded-xl border border-black/15 bg-surface px-3.5 py-2 text-sm font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-[#7e2562]/20 dark:border-white/15"
            />
            <p className="text-[11px] text-muted-foreground">Total press invoice amount.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="print_vendor" className="block text-xs font-bold   tracking-wider text-muted-foreground">
              Printing Press / Vendor <span className="text-danger">*</span>
            </label>
            <input
              id="print_vendor"
              type="text"
              required
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="e.g. Kairali Press Kozhikode, Anaswara Kochi"
              className="w-full rounded-xl border border-black/15 bg-surface px-3.5 py-2 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-[#7e2562]/20 dark:border-white/15"
            />
          </div>

          {/* Paper Stock Dropdown with Custom GSM addition */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold   tracking-wider text-muted-foreground">
                Paper &amp; Text Stock Specs <span className="text-danger">*</span>
              </label>
              {!showCustomInput && (
                <button
                  type="button"
                  onClick={() => setShowCustomInput(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#7e2562] hover:underline dark:text-pink-400 cursor-pointer"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Custom GSM</span>
                </button>
              )}
            </div>

            <SmoothDropdown
              size="md"
              value={showCustomInput ? "__CUSTOM__" : paper}
              onChange={(val) => {
                if (val === "__CUSTOM__") {
                  setShowCustomInput(true);
                } else {
                  setShowCustomInput(false);
                  setPaper(val);
                }
              }}
              options={paperDropdownOptions}
              placeholder="Select paper stock…"
              ariaLabel="Select Paper and text stock specs"
            />

            {/* Custom GSM Input Box */}
            {showCustomInput && (
              <div className="mt-2 rounded-2xl border border-[#7e2562]/20 bg-[#faedf5]/50 p-3 dark:bg-[#7e2562]/10 dark:border-pink-500/30 space-y-2 animate-apple-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#7e2562] dark:text-pink-300">
                    Enter Custom Paper Specification
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomInput(false);
                      setCustomInput("");
                    }}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-black/5 text-muted-foreground hover:bg-black/10 hover:text-foreground cursor-pointer dark:bg-white/10"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomPaper();
                      }
                    }}
                    placeholder="e.g. 90gsm Holmen Book Cream, 120gsm Sunshine"
                    className="flex-1 rounded-xl border border-black/15 bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-[#7e2562] focus:ring-2 focus:ring-[#7e2562]/10 dark:bg-surface dark:border-white/15"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomPaper}
                    disabled={!customInput.trim()}
                    className="rounded-xl bg-[#7e2562] px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#681d50] disabled:opacity-50 cursor-pointer transition-all shrink-0"
                  >
                    Add &amp; Select
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Newly added GSM specs are automatically saved to the top of the dropdown for fast access.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Binding Dropdown using common component */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold   tracking-wider text-muted-foreground">
              Binding Specification <span className="text-danger">*</span>
            </label>
            <SmoothDropdown
              size="md"
              value={binding}
              onChange={(val) => setBinding(val)}
              options={BINDING_OPTIONS}
              placeholder="Select binding type…"
              ariaLabel="Select binding specification"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="print_notes" className="block text-xs font-bold   tracking-wider text-muted-foreground">
              Production Run Notes (Optional)
            </label>
            <input
              id="print_notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Matte lamination with spot UV on title heading"
              className="w-full rounded-xl border border-black/15 bg-surface px-3.5 py-2 text-sm text-foreground dark:border-white/15 focus:outline-hidden focus:ring-2 focus:ring-[#7e2562]/20"
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
          className="rounded-xl bg-[#7e2562] px-6 py-3 text-sm font-bold text-white shadow-plum-sm hover:bg-[#681d50] hover:shadow-plum transition disabled:opacity-60 cursor-pointer text-center"
        >
          {pending ? "Recording Press Order..." : <span className="inline-flex items-center gap-1.5">Confirm Print Run &amp; Advance to Post-Production <ArrowRight /></span>}
        </button>
      </div>

      {/* Confirmation Modal */}
      <StageConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={() => executeSubmit()}
        pending={pending}
        title="Are you sure you want to move to Post-Production?"
        subtitle="Please verify the printing press specifications before advancing the project."
        currentStage="Offset Printing Press Run"
        nextStage="Post-Production Intake"
        description="Recording this press run will generate the production PRT batch order and unlock warehouse intake, physical damage verification, and author dispatch tracking."
        metadata={[
          { label: "Print Quantity", value: `${qty.toLocaleString()} copies`, isMono: true, isHighlight: true },
          { label: "Press / Vendor", value: vendor },
          { label: "Total Print Cost", value: `₹${costRupees.toLocaleString()}`, isMono: true, isPositive: true },
          { label: "Paper Stock", value: paper },
          { label: "Binding Spec", value: binding },
          ...(notes ? [{ label: "Production Notes", value: notes }] : []),
        ]}
        confirmText={<span className="inline-flex items-center gap-1.5">Yes, Confirm &amp; Advance <ArrowRight size={12} /></span>}
        confirmVariant="primary"
        iconType="print"
      />
    </form>
  );
}
