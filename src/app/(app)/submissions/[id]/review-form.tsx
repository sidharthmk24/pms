"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SmoothDropdown } from "@/components/dropdown";

type ActionType = "decline" | "revision" | "accept";

export default function ReviewForm({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [action, setAction] = useState<ActionType | null>(null);
  const [feedback, setFeedback] = useState("");
  const [publishingType, setPublishingType] = useState<"kairali_funded" | "self_publishing">("kairali_funded");
  const [royaltyPct, setRoyaltyPct] = useState(10);
  const [basis, setBasis] = useState<"mrp" | "net">("mrp");
  const [advanceRupees, setAdvanceRupees] = useState(0);

  const [termYears, setTermYears] = useState(3);
  const [freeCopies, setFreeCopies] = useState(10);
  const [authorDiscountPct, setAuthorDiscountPct] = useState(40);
  const [packageCostRupees, setPackageCostRupees] = useState(35000);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!action) return;

    setPending(true);
    setError(null);

    const payload: Record<string, unknown> = { action };
    if (action === "revision") {
      payload.feedback = feedback;
    } else if (action === "accept") {
      payload.publishingType = publishingType;
      payload.royaltyPct = Number(royaltyPct);
      payload.basis = basis;
      payload.advanceRupees = Number(advanceRupees);
      payload.termYears = Number(termYears);
      payload.freeCopies = Number(freeCopies);
      payload.authorDiscountPct = Number(authorDiscountPct);
      payload.packageCostRupees = publishingType === "self_publishing" ? Number(packageCostRupees) : 0;
    }

    try {
      const res = await fetch(`/api/submissions/${submissionId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body?.error ?? "Failed to save review decision");
      } else {
        router.refresh();
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setPending(false);
    }
  }

  const gstAmount = publishingType === "self_publishing" ? Math.round(packageCostRupees * 0.18) : 0;
  const totalPackageWithGst = packageCostRupees + gstAmount;

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-black/10 bg-surface p-6 dark:border-white/10">
      <h2 className="mb-4 text-base font-bold text-foreground">Review & Publishing Decision</h2>
      
      <div className="mb-6 grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => { setAction("accept"); setError(null); }}
          className={`apple-button flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all ${
            action === "accept"
              ? "border-foreground bg-foreground text-background shadow-xs font-bold"
              : "border-black/10 bg-black/[0.02] text-foreground hover:bg-black/[0.05] dark:border-white/15 dark:bg-white/[0.03]"
          }`}
        >
          <span className="text-sm font-extrabold">Accept & Contract</span>
          <span className="mt-0.5 text-[11px] opacity-80">Generate agreement</span>
        </button>

        <button
          type="button"
          onClick={() => { setAction("revision"); setError(null); }}
          className={`apple-button flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all ${
            action === "revision"
              ? "border-warning bg-warning text-warning-foreground shadow-xs font-bold"
              : "border-black/10 bg-black/[0.02] text-foreground hover:bg-black/[0.05] dark:border-white/15 dark:bg-white/[0.03]"
          }`}
        >
          <span className="text-sm font-extrabold">Request Revision</span>
          <span className="mt-0.5 text-[11px] opacity-80">Author editorial notes</span>
        </button>

        <button
          type="button"
          onClick={() => { setAction("decline"); setError(null); }}
          className={`apple-button flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all ${
            action === "decline"
              ? "border-danger bg-danger text-danger-foreground shadow-xs font-bold"
              : "border-black/10 bg-black/[0.02] text-foreground hover:bg-black/[0.05] dark:border-white/15 dark:bg-white/[0.03]"
          }`}
        >
          <span className="text-sm font-extrabold">Decline</span>
          <span className="mt-0.5 text-[11px] opacity-80">Reject submission</span>
        </button>
      </div>

      {action === "decline" && (
        <div className="mb-6 rounded-2xl bg-danger/10 p-4 border border-danger/20 text-xs font-medium text-danger">
          Declining this manuscript will mark it as Declined and dispatch a respectful notification email to the author.
        </div>
      )}

      {action === "revision" && (
        <div className="mb-6 space-y-2">
          <label htmlFor="feedback" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Editorial Feedback for Author
          </label>
          <textarea
            id="feedback"
            rows={5}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            required
            placeholder="Explain required revisions or suggestions before we can publish..."
            className="w-full rounded-xl border border-black/12 bg-black/[0.02] px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-foreground/40 focus:bg-surface focus:ring-2 focus:ring-foreground/5 dark:border-white/15 dark:bg-white/[0.03]"
          />
        </div>
      )}

      {action === "accept" && (
        <div className="mb-6 space-y-4 rounded-2xl border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.02]">
          <div className="rounded-xl bg-success/10 p-3.5 border border-success/20 text-xs font-semibold text-success">
            Accepting creates the Author & Catalog records, auto-generates the legal agreement, and triggers the digital signing flow.
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="publishingType" className="mb-1.5 block text-xs font-bold text-foreground">
                Publishing Model Track
              </label>
              <SmoothDropdown
                id="publishingType"
                value={publishingType}
                onChange={(val) => setPublishingType(val as any)}
                options={[
                  { value: "kairali_funded", label: "Kairali Books Publishing" },
                  { value: "self_publishing", label: "Self-Publishing (Author-Funded)" },
                ]}
              />
            </div>

            <div>
              <label htmlFor="basis" className="mb-1.5 block text-xs font-bold text-foreground">
                Royalty Calculation Basis
              </label>
              <SmoothDropdown
                id="basis"
                value={basis}
                onChange={(val) => setBasis(val as any)}
                options={[
                  { value: "mrp", label: "Printed MRP Basis" },
                  { value: "net", label: "Net Realized Receipts Basis" },
                ]}
              />
            </div>

            <div>
              <label htmlFor="royaltyPct" className="mb-1.5 block text-xs font-bold text-foreground">
                Royalty Rate (%)
              </label>
              <input
                id="royaltyPct"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={royaltyPct}
                onChange={(e) => setRoyaltyPct(Number(e.target.value))}
                required
                className="w-full rounded-xl border border-black/12 bg-surface px-3 py-2 text-sm font-semibold text-foreground outline-none transition-all dark:border-white/15"
              />
            </div>

            <div>
              <label htmlFor="advanceRupees" className="mb-1.5 block text-xs font-bold text-foreground">
                Advance on Royalty (₹)
              </label>
              <input
                id="advanceRupees"
                type="number"
                min="0"
                step="500"
                value={advanceRupees}
                onChange={(e) => setAdvanceRupees(Number(e.target.value))}
                required
                className="w-full rounded-xl border border-black/12 bg-surface px-3 py-2 text-sm font-semibold text-foreground outline-none transition-all dark:border-white/15"
              />
            </div>

            <div>
              <label htmlFor="freeCopies" className="mb-1.5 block text-xs font-bold text-foreground">
                Author Free Copies
              </label>
              <input
                id="freeCopies"
                type="number"
                min="0"
                max="100"
                value={freeCopies}
                onChange={(e) => setFreeCopies(Number(e.target.value))}
                required
                className="w-full rounded-xl border border-black/12 bg-surface px-3 py-2 text-sm font-semibold text-foreground outline-none transition-all dark:border-white/15"
              />
            </div>

            <div>
              <label htmlFor="authorDiscountPct" className="mb-1.5 block text-xs font-bold text-foreground">
                Author Purchase Discount (%)
              </label>
              <input
                id="authorDiscountPct"
                type="number"
                min="0"
                max="100"
                value={authorDiscountPct}
                onChange={(e) => setAuthorDiscountPct(Number(e.target.value))}
                required
                className="w-full rounded-xl border border-black/12 bg-surface px-3 py-2 text-sm font-semibold text-foreground outline-none transition-all dark:border-white/15"
              />
            </div>

            <div>
              <label htmlFor="termYears" className="mb-1.5 block text-xs font-bold text-foreground">
                Contract Term (Years)
              </label>
              <SmoothDropdown
                id="termYears"
                value={termYears}
                onChange={(val) => setTermYears(Number(val))}
                options={[
                  { value: 3, label: "3 Years (Standard)" },
                  { value: 5, label: "5 Years" },
                  { value: 10, label: "10 Years" },
                ]}
              />
            </div>

            {publishingType === "self_publishing" && (
              <div>
                <label htmlFor="packageCostRupees" className="mb-1.5 block text-xs font-bold text-foreground">
                  Package Service Fee (₹ Excl. GST)
                </label>
                <input
                  id="packageCostRupees"
                  type="number"
                  min="0"
                  step="1000"
                  value={packageCostRupees}
                  onChange={(e) => setPackageCostRupees(Number(e.target.value))}
                  required
                  className="w-full rounded-xl border border-black/12 bg-surface px-3 py-2 text-sm font-semibold text-foreground outline-none transition-all dark:border-white/15"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  +18% GST (₹{gstAmount.toLocaleString("en-IN")}) = <strong className="text-foreground">₹{totalPackageWithGst.toLocaleString("en-IN")} Total</strong>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-xl border border-danger/20 bg-danger/10 p-3 text-xs font-bold text-danger" role="alert">
          {error}
        </p>
      )}

      {action && (
        <button
          type="submit"
          disabled={pending}
          className="apple-button flex items-center justify-center gap-2 rounded-xl bg-foreground px-6 py-2.5 text-xs font-bold text-background shadow-xs hover:opacity-90 disabled:opacity-50"
        >
          {pending ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Processing Decision...</span>
            </>
          ) : (
            <span>Confirm & Submit Decision</span>
          )}
        </button>
      )}
    </form>
  );
}
