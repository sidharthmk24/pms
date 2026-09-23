"use client";

import { useState } from "react";
import { DocumentPreviewModal } from "@/components/document-preview-modal";
import ArrowRight from "@/components/ui/arrow-right";

export default function ProofApprovalClient({
  projectId,
  token,
  title,
  authorName,
  isbn,
  hasLayout,
  hasCover,
  isAlreadyApproved,
  approvedAt,
  initialStatus,
}: {
  projectId: string;
  token: string;
  title: string;
  authorName: string;
  isbn?: string | null;
  hasLayout: boolean;
  hasCover: boolean;
  isAlreadyApproved: boolean;
  approvedAt?: string | null;
  initialStatus: string;
}) {
  const [approved, setApproved] = useState(isAlreadyApproved);
  const [status, setStatus] = useState(initialStatus);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewType, setPreviewType] = useState<"layout" | "cover">("layout");
  const [showRework, setShowRework] = useState(false);
  const [reworkNotes, setReworkNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleAction(action: "approve" | "rework") {
    if (action === "rework" && !reworkNotes.trim()) {
      setError("Please describe the specific corrections or changes required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/public/production/${projectId}/approve-proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          action,
          notes: action === "rework" ? reworkNotes.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data?.error || "Failed to submit proof review response.");
      } else {
        if (action === "approve") {
          setApproved(true);
          setStatus("printing");
          setSuccessMessage("Proof sign-off confirmed! Your book has been queued for the offset printing run.");
        } else {
          setStatus("editing");
          setShowRework(false);
          setSuccessMessage("Your revision notes have been submitted to the editorial and typesetting team.");
        }
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Generate direct link for viewing files with token
  const layoutViewUrl = `/api/public/production/${projectId}/download?type=layout&mode=inline&token=${encodeURIComponent(token)}`;
  const coverViewUrl = `/api/public/production/${projectId}/download?type=cover&mode=inline&token=${encodeURIComponent(token)}`;

  return (
    <div className="space-y-6">
      {/* Deliverables Inspection Section */}
      <div className="rounded-2xl border border-black/10 bg-surface p-6 shadow-sm dark:border-white/10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.06] pb-3 dark:border-white/[0.08]">
          <div>
            <h3 className="text-sm font-bold   tracking-wider text-foreground">
              Production Deliverables for Review
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Inspect the finalized typeset interior pages and cover jacket before offset printing.
            </p>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            Step 5 of 8 · Author Proof
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {/* Layout PDF Button */}
          <div className="rounded-xl border border-black/10 bg-surface-muted/50 p-4 dark:border-white/10 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base">📄</span>
                <span className="text-sm font-bold text-foreground">Typeset Interior Layout (PDF)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Final typeset interior pages, chapter headings, and typography layout.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-black/5 dark:border-white/5 flex gap-2">
              {hasLayout ? (
                <a
                  href={layoutViewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-hover transition cursor-pointer shadow-xs"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>Open Layout PDF in Viewer ↗</span>
                </a>
              ) : (
                <span className="text-xs text-muted-foreground italic">Interior layout in preparation...</span>
              )}
            </div>
          </div>

          {/* Cover Jacket Button */}
          <div className="rounded-xl border border-black/10 bg-surface-muted/50 p-4 dark:border-white/10 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base">🎨</span>
                <span className="text-sm font-bold text-foreground">Cover Jacket Artwork</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Full wrap-around jacket design including front, spine, back blurb, and ISBN barcode.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-black/5 dark:border-white/5 flex gap-2">
              {hasCover ? (
                <a
                  href={coverViewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-black/15 bg-surface px-3.5 py-2 text-xs font-bold text-foreground hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5 transition cursor-pointer shadow-xs"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>View Cover Artwork ↗</span>
                </a>
              ) : (
                <span className="text-xs text-muted-foreground italic">Cover jacket in design...</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm font-semibold text-emerald-800 dark:text-emerald-300 animate-in fade-in flex items-center gap-3">
          <span className="text-xl">✓</span>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-xs font-semibold text-danger">
          {error}
        </div>
      )}

      {/* Already Approved State */}
      {approved ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-7 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-2xl font-bold">
            ✓
          </div>
          <h3 className="text-lg font-bold text-foreground">Digital Sign-Off Confirmed</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            You have approved the final proof deliverables. The title has moved to the offset printing press run stage.
            {approvedAt ? ` (Signed off on ${approvedAt.split(" ")[0]})` : ""}
          </p>
        </div>
      ) : status === "editing" ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 space-y-2">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm">
            <span>🔄</span>
            <span>Revision in Progress</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Your revision feedback has been routed to our typesetting and editorial staff. Once adjustments are made, an updated proof will be provided.
          </p>
        </div>
      ) : (
        /* Active Approval Form */
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-sm space-y-5">
          <div>
            <span className="inline-block text-[11px] font-bold   tracking-wider text-primary">
              Author Verification &amp; Acceptance
            </span>
            <h3 className="text-lg font-bold text-foreground   mt-1">
              Final Proof Approval Sign-Off
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              By confirming approval below, you certify that you have reviewed the attached layout and cover deliverables, and authorize Kairali Books to proceed with offset printing.
            </p>
          </div>

          <div className="rounded-xl border border-black/10 bg-background/80 p-4 dark:border-white/10 space-y-2 text-xs text-foreground">
            <div className="font-semibold text-primary">Please verify before approving:</div>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Book title, author name spelling, and Malayalam translation (if applicable).</li>
              <li>Chapter headings, table of contents pagination, and interior text flow.</li>
              <li>Allocated ISBN {isbn ? `(${isbn})` : ""} and barcode imprint on back cover.</li>
            </ul>
          </div>

          {/* Action Buttons */}
          {!showRework ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleAction("approve")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary-hover transition disabled:opacity-60 cursor-pointer"
              >
                {submitting ? "Confirming Sign-Off..." : <span className="inline-flex items-center gap-1.5">✓ Accept &amp; Approve Final Proof for Press <ArrowRight /></span>}
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowRework(true)}
                className="inline-flex items-center justify-center rounded-xl border border-black/15 bg-surface px-4 py-3 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5 transition cursor-pointer"
              >
                Need revisions or corrections? Click here
              </button>
            </div>
          ) : (
            /* Expandable Rework Form */
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 space-y-3 animate-in fade-in">
              <label htmlFor="proof_rework_notes" className="block text-xs font-bold   tracking-wider text-warning">
                Describe Corrections or Revisions Needed:
              </label>
              <textarea
                id="proof_rework_notes"
                rows={4}
                value={reworkNotes}
                onChange={(e) => setReworkNotes(e.target.value)}
                placeholder="Specify page numbers, typos, font sizing, or layout adjustments that need correcting..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-warning/30"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={submitting || !reworkNotes.trim()}
                  onClick={() => handleAction("rework")}
                  className="rounded-lg bg-warning px-4 py-2 text-xs font-bold text-white hover:bg-warning/90 transition disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? "Sending Notes..." : "Submit Revision Notes & Request Rework"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRework(false)}
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold hover:bg-surface-muted transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
