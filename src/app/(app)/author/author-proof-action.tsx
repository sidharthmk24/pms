"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AuthorProofAction({
  projectId,
  title,
  proofApprovedAt,
}: {
  projectId: string;
  title: string;
  proofApprovedAt?: string | null;
}) {
  const router = useRouter();
  const [showRework, setShowRework] = useState(false);
  const [reworkNotes, setReworkNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (proofApprovedAt) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success/10 px-4 py-2 text-xs font-bold text-success">
        <span>✓</span>
        <span>Book Proof Approved &amp; Signed Off ({proofApprovedAt.split(" ")[0]}) · Scheduled for Printing Run</span>
      </div>
    );
  }

  async function handleDecision(decision: "approve" | "rework") {
    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/author/proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          decision,
          comment: reworkNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data?.error || "Failed to submit decision");
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
    <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-bold text-foreground">Author Final Proof Sign-Off Required</h4>
          <p className="text-[11px] text-muted-foreground">
            Please inspect the typeset layout and cover design above. Once satisfied, authorize the press run.
          </p>
        </div>
      </div>

      {error && <p className="text-xs font-semibold text-danger">{error}</p>}

      {showRework ? (
        <div className="space-y-2 rounded-xl border border-warning/30 bg-background p-3 animate-in fade-in">
          <label htmlFor={`rework-${projectId}`} className="block text-xs font-semibold   tracking-wider text-warning">
            Describe Requested Corrections / Re-Typesetting
          </label>
          <textarea
            id={`rework-${projectId}`}
            rows={3}
            value={reworkNotes}
            onChange={(e) => setReworkNotes(e.target.value)}
            placeholder="Specify typos, font adjustments, or cover corrections..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending || !reworkNotes.trim()}
              onClick={() => handleDecision("rework")}
              className="rounded-lg bg-warning px-3.5 py-1.5 text-xs font-bold text-white hover:bg-warning/90 transition disabled:opacity-60 cursor-pointer"
            >
              {pending ? "Submitting..." : "Submit Rework Request"}
            </button>
            <button
              type="button"
              onClick={() => setShowRework(false)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            disabled={pending}
            onClick={() => handleDecision("approve")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-success px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-success-hover transition disabled:opacity-60 cursor-pointer"
          >
            <span>✓</span>
            <span>{pending ? "Approving..." : "Approve & Authorize Printing Press Run"}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowRework(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            <span>Request Revisions</span>
          </button>
        </div>
      )}
    </div>
  );
}
