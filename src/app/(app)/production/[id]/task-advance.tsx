"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const STAGE_VERBS: Record<string, string> = {
  dtp: "Typesetting & Layout",
  editing: "Editing & Proofreading",
  cover_design: "Cover Design",
  isbn_registration: "ISBN Application & Registration",
  final_proof: "Author & Editorial Final Proof Sign-Off",
};

export default function TaskAdvance({
  projectId,
  status,
  isbnRequestedAt,
  isbnRequestRef,
  proofApprovedAt,
}: {
  projectId: string;
  status: string;
  isbnRequestedAt?: string | null;
  isbnRequestRef?: string | null;
  proofApprovedAt?: string | null;
}) {
  const router = useRouter();
  const [isbn, setIsbn] = useState("");
  const [applicationRef, setApplicationRef] = useState(isbnRequestRef || "");
  const [file, setFile] = useState<File | null>(null);
  const [authorConsentVerified, setAuthorConsentVerified] = useState(false);
  const [reworkNotes, setReworkNotes] = useState("");
  const [showRework, setShowRework] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine current sub-step for ISBN
  const isIsbnStep1 = status === "isbn_registration" && !isbnRequestedAt;

  async function onSubmit(e: React.FormEvent, customAction?: "approve" | "rework") {
    e.preventDefault();
    setPending(true);
    setError(null);

    const fd = new FormData();
    if (status === "isbn_registration") {
      if (isIsbnStep1) {
        fd.append("step", "request_sent");
        fd.append("application_ref", applicationRef);
      } else {
        fd.append("step", "number_allocated");
        fd.append("isbn", isbn);
      }
    } else if (status === "final_proof") {
      fd.append("action", customAction || "approve");
      if (customAction === "rework") {
        fd.append("rework_notes", reworkNotes);
      }
    } else if (status === "dtp" && file) {
      fd.append("layout_file", file);
    } else if (status === "cover_design" && file) {
      fd.append("cover_file", file);
    }

    try {
      const res = await fetch(`/api/production/${projectId}/advance`, {
        method: "POST",
        body: fd,
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body?.error ?? "Failed to advance stage");
      } else {
        router.refresh();
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setPending(false);
    }
  }

  const verb = STAGE_VERBS[status] || "Current Task";

  const isFormValid =
    status === "isbn_registration"
      ? isIsbnStep1
        ? true // applicationRef is optional
        : isbn.trim().length >= 5
      : status === "final_proof"
      ? Boolean(proofApprovedAt || authorConsentVerified)
      : status === "dtp" || status === "cover_design"
      ? file !== null
      : true;

  return (
    <form onSubmit={(e) => onSubmit(e)} className="rounded-xl border border-warning/20 bg-warning/5 p-5 space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-warning">Your Active Task: {verb}</h3>
          {status === "isbn_registration" && (
            <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-[11px] font-bold text-warning border border-warning/20">
              {isIsbnStep1 ? "Step 1 of 2: Application Sent" : "Step 2 of 2: ISBN Allocation"}
            </span>
          )}
          {status === "final_proof" && (
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
              proofApprovedAt
                ? "bg-success/15 text-success border-success/25"
                : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25"
            }`}>
              {proofApprovedAt ? "✓ Author Signed Off" : "Awaiting Author Sign-Off"}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {status === "isbn_registration"
            ? isIsbnStep1
              ? "Send the official ISBN allocation request to the Raja Rammohun Roy National Agency."
              : "Enter the officially allocated 13-digit ISBN once received from the national agency."
            : status === "final_proof"
            ? "Inspect proof deliverables. Author approval is required before queueing for printing."
            : "Upload deliverables and complete this stage."}
        </p>
      </div>

      {status === "dtp" && (
        <div className="space-y-1">
          <label htmlFor="layout_file" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Typeset Manuscript Layout PDF
          </label>
          <input
            id="layout_file"
            type="file"
            required
            accept=".pdf,.doc,.docx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full max-w-sm text-sm font-medium mt-1"
          />
        </div>
      )}

      {status === "cover_design" && (
        <div className="space-y-1">
          <label htmlFor="cover_file" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Book Cover Design File (Image/PDF)
          </label>
          <input
            id="cover_file"
            type="file"
            required
            accept=".png,.jpg,.jpeg,.webp,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full max-w-sm text-sm font-medium mt-1"
          />
        </div>
      )}

      {status === "isbn_registration" && (
        <>
          {isIsbnStep1 ? (
            <div className="space-y-2 rounded-xl border border-warning/20 bg-background/50 p-4">
              <label htmlFor="application_ref" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Agency Application Reference / Acknowledgement Number (Optional)
              </label>
              <input
                id="application_ref"
                type="text"
                value={applicationRef}
                onChange={(e) => setApplicationRef(e.target.value)}
                placeholder="e.g. RRR-2026-KL-9812 or Agency Portal Ref"
                className="w-full max-w-sm rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Clicking the button below records that the ISBN request has been submitted to the National Agency.
              </p>
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-success/20 bg-success/5 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-success">
                <span>✓</span>
                <span>
                  Step 1 Complete: Request Sent on {isbnRequestedAt?.split(" ")[0]}
                  {isbnRequestRef ? ` (Ref: ${isbnRequestRef})` : ""}
                </span>
              </div>
              <div className="space-y-1">
                <label htmlFor="isbn" className="block text-xs font-semibold uppercase tracking-wider text-foreground">
                  Allocated ISBN Number <span className="text-danger">*</span>
                </label>
                <input
                  id="isbn"
                  type="text"
                  required
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  placeholder="e.g. 978-81-981234-5-6"
                  className="w-full max-w-sm rounded-lg border border-border bg-background px-3 py-1.5 text-sm mt-1"
                />
                <p className="text-[11px] text-muted-foreground">
                  Saving the allocated ISBN will update the title record and advance the pipeline to Author Final Proof.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {status === "final_proof" && (
        <div className="space-y-4">
          {proofApprovedAt ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-success/30 bg-success/10 p-3.5 text-xs font-semibold text-success">
              <span className="text-base">✓</span>
              <div>
                <p className="font-bold">Author Digital Sign-Off Confirmed ({proofApprovedAt.split(" ")[0]})</p>
                <p className="text-[11px] opacity-80">The author has authenticated and approved the final proof files.</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
                <span>⏳</span>
                <span>Author Digital Sign-Off Pending</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                The author has access to review galley proof files on their Author Portal. The title cannot be sent to press without author approval.
              </p>
              <label className="flex items-start gap-2.5 pt-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={authorConsentVerified}
                  onChange={(e) => setAuthorConsentVerified(e.target.checked)}
                  className="mt-0.5 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-xs text-foreground font-medium leading-tight">
                  I confirm that the author has reviewed and provided formal approval (written/verbal) to proceed with the printing press run.
                </span>
              </label>
            </div>
          )}

          {showRework ? (
            <div className="space-y-2 rounded-xl border border-warning/30 bg-warning/5 p-4 animate-in fade-in">
              <label htmlFor="reworkNotes" className="block text-xs font-semibold uppercase tracking-wider text-warning">
                Revision Notes &amp; Required Changes
              </label>
              <textarea
                id="reworkNotes"
                rows={3}
                value={reworkNotes}
                onChange={(e) => setReworkNotes(e.target.value)}
                placeholder="Specify what corrections or re-typesetting is needed..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled={pending || !reworkNotes.trim()}
                  onClick={(e) => onSubmit(e, "rework")}
                  className="rounded-lg bg-warning px-4 py-1.5 text-xs font-bold text-white hover:bg-warning/90 transition disabled:opacity-60 cursor-pointer"
                >
                  Confirm Send for Rework
                </button>
                <button
                  type="button"
                  onClick={() => setShowRework(false)}
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold hover:bg-surface-muted transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowRework(true)}
                className="text-xs text-muted-foreground underline hover:text-foreground transition cursor-pointer"
              >
                Author requested revisions? Click here to send for rework &rarr;
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs font-semibold text-danger">{error}</p>}

      {!showRework && (
        <button
          type="submit"
          disabled={pending || !isFormValid}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60 cursor-pointer"
        >
          {pending
            ? "Updating status..."
            : status === "isbn_registration"
            ? isIsbnStep1
              ? "Mark ISBN Request Sent to Agency →"
              : "Confirm Allocation & Advance to Final Proof →"
            : status === "final_proof"
            ? "✓ Approve Final Proof & Send to Printing Press →"
            : `Complete ${verb}`}
        </button>
      )}
    </form>
  );
}
