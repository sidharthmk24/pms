"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DocumentPreviewModal } from "@/components/document-preview-modal";

type Submission = {
  id: string;
  ref_no: string;
  title: string;
  author_name: string;
  email: string;
  status: string;
  review_notes: string | null;
  manuscript_filename: string | null;
};

type Contract = {
  id: string;
  royalty_pct: number;
  basis: string;
  advance_paise: number;
  signed_on: string | null;
};

type Production = {
  id: string;
  status: string;
  proof_feedback: string | null;
  proof_approved_at: string | null;
  isbn_registered: string | null;
  isbn_requested_at?: string | null;
  isbn_request_ref?: string | null;
  final_layout_path: string | null;
  final_cover_path: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  new: "Pending Review",
  pending_review: "Pending Review",
  under_review: "Under Review",
  needs_revision: "Needs Revision",
  accepted: "Accepted",
  declined: "Declined",
  archived: "Archived",
  withdrawn: "Withdrawn",
};

const PROD_STAGE_LABELS: Record<string, string> = {
  under_contract: "Schedule Setup",
  dtp: "Typesetting & Layout (DTP)",
  editing: "Proofreading & Editing",
  cover_design: "Cover Design",
  isbn_registration: "ISBN Registration",
  final_proof: "Author Review",
  printing: "Mass Print Run",
  completed: "Live in Inventory",
};

export default function TrackingDashboard({
  submission,
  contract,
  production,
}: {
  submission: Submission;
  contract: Contract | null;
  production: Production | null;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewType, setPreviewType] = useState<"layout" | "cover">("layout");

  const statusClass = {
    new: "bg-foreground text-background",
    pending_review: "bg-black/[0.08] text-foreground dark:bg-white/[0.1]",
    under_review: "bg-warning/15 text-warning border border-warning/30",
    needs_revision: "bg-accent/15 text-accent border border-accent/30",
    accepted: "bg-success/15 text-success border border-success/30",
    declined: "bg-danger/15 text-danger border border-danger/30",
    archived: "bg-muted-foreground/15 text-muted-foreground",
    withdrawn: "bg-muted-foreground/15 text-muted-foreground",
  }[submission.status] ?? "bg-surface-muted text-foreground";

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setPending(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append("action", "upload_revision");
    formData.append("manuscript", file);

    try {
      const res = await fetch(`/api/public/submissions/${submission.id}/status`, {
        method: "POST",
        body: formData,
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body?.error ?? "Failed to upload revision");
      } else {
        setSuccess("Revised manuscript uploaded successfully!");
        setFile(null);
        router.refresh();
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setPending(false);
    }
  }

  async function onSign() {
    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/public/submissions/${submission.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sign" }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body?.error ?? "Failed to sign contract");
      } else {
        setSuccess("Contract digitally signed successfully!");
        router.refresh();
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setPending(false);
    }
  }

  async function onProofDecision(decision: "approve" | "reject") {
    if (decision === "reject" && !comment.trim()) {
      setError("Please leave comments describing the changes you need");
      return;
    }

    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/public/submissions/${submission.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "proof_decision", decision, comment }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body?.error ?? "Failed to submit final proof decision");
      } else {
        setSuccess(
          decision === "approve"
            ? "Thank you! Final proof has been approved."
            : "Rework feedback submitted successfully."
        );
        setComment("");
        router.refresh();
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="rounded-[28px] border border-black/[0.08] bg-surface/90 p-7 shadow-[0_4px_16px_rgba(0,0,0,0.02)] backdrop-blur-xl dark:border-white/[0.1] dark:bg-surface/80 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="numeric text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Tracking Ref: {submission.ref_no}
            </span>
            <h2 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">{submission.title}</h2>
            <p className="mt-1.5 text-base font-medium text-muted-foreground">
              Submitted by <strong className="text-foreground">{submission.author_name}</strong>
            </p>
          </div>
          <span className={`rounded-full px-4 py-1.5 text-xs font-bold ${statusClass}`}>
            {STATUS_LABELS[submission.status] ?? submission.status}
          </span>
        </div>
      </div>

      {/* Main portal messages based on status */}
      {(submission.status === "new" || submission.status === "pending_review") && (
        <div className="rounded-[28px] border border-black/[0.08] bg-surface/90 p-7 shadow-[0_4px_16px_rgba(0,0,0,0.02)] backdrop-blur-xl dark:border-white/[0.1] dark:bg-surface/80 sm:p-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/[0.05] dark:bg-white/[0.08]">
              <svg className="h-5 w-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-foreground">Submission Received</h3>
          </div>
          <p className="text-base text-muted-foreground leading-relaxed">
            Your manuscript has been received and stored in our editorial system. 
            It is currently queued for initial evaluation and editor assignment. 
            No action is needed from you at the moment.
          </p>
        </div>
      )}

      {submission.status === "under_review" && (
        <div className="rounded-[28px] border border-black/[0.08] bg-surface/90 p-7 shadow-[0_4px_16px_rgba(0,0,0,0.02)] backdrop-blur-xl dark:border-white/[0.1] dark:bg-surface/80 sm:p-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning/10 text-warning">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-foreground">Under Active Review</h3>
          </div>
          <p className="text-base text-muted-foreground leading-relaxed">
            An editor has been assigned and is actively reviewing your manuscript. 
            We will update you here and notify you by email as soon as a decision is made.
          </p>
        </div>
      )}

      {submission.status === "declined" && (
        <div className="rounded-[28px] border border-danger/20 bg-danger/5 p-7 backdrop-blur-xl sm:p-8">
          <h3 className="text-lg font-bold text-danger mb-2">Submission Update</h3>
          <p className="text-base text-muted-foreground leading-relaxed">
            Thank you again for sharing your work. Unfortunately, we have decided not to proceed with 
            publishing this manuscript. We receive a high volume of entries and must make selective choices. 
            We wish you the best of luck in finding the right publisher for your work.
          </p>
        </div>
      )}


      {submission.status === "needs_revision" && (
        <div className="space-y-6">
          {/* Feedback */}
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-6">
            <h3 className="text-sm font-semibold text-accent mb-3">Revision Requested</h3>
            <div className="text-sm text-foreground whitespace-pre-wrap bg-surface p-4 border border-border rounded-lg leading-relaxed" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
              {submission.review_notes}
            </div>
          </div>

          {/* Upload Form */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <h3 className="text-sm font-semibold mb-3">Upload Revised Manuscript</h3>
            <form onSubmit={onUpload} className="space-y-4">
              <div className="rounded-lg border border-dashed border-border bg-background p-6 text-center">
                <input
                  id="revised-manuscript"
                  type="file"
                  accept=".pdf,.doc,.docx,.odt"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
                <label htmlFor="revised-manuscript" className="cursor-pointer block">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mx-auto h-8 w-8 text-muted-foreground mb-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                  </svg>
                  <span className="text-sm font-medium text-primary">Click to select revised manuscript</span>
                  <span className="block text-xs text-muted-foreground mt-1">PDF, DOC, DOCX or ODT up to 25 MB</span>
                </label>
                {file && (
                  <p className="text-xs font-semibold text-success mt-3">Selected file: {file.name}</p>
                )}
              </div>

              {error && <p className="text-xs font-semibold text-danger">{error}</p>}
              {success && <p className="text-xs font-semibold text-success">{success}</p>}

              <button
                type="submit"
                disabled={pending || !file}
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60"
              >
                {pending ? "Uploading..." : "Submit Revision"}
              </button>
            </form>
          </div>
        </div>
      )}

      {submission.status === "accepted" && contract && (
        <div className="space-y-6">
          <div className="rounded-xl border border-success/20 bg-success/5 p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-success mb-1">Congratulations!</h3>
              <p className="text-sm text-muted-foreground">
                Your manuscript has been accepted for publication. Below are the terms of your contract.
              </p>
            </div>

            <div className="bg-surface rounded-lg border border-border p-4 space-y-3 text-sm">
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">Royalty Rate</span>
                <span className="font-semibold">{contract.royalty_pct}% ({contract.basis} basis)</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">Advance Pay</span>
                <span className="numeric font-semibold">
                  ₹{new Intl.NumberFormat("en-IN").format(contract.advance_paise / 100)}
                </span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-muted-foreground">Contract Signature</span>
                <span className="font-semibold">
                  {contract.signed_on ? (
                    <span className="text-success font-semibold">✓ Digitally Signed</span>
                  ) : (
                    <span className="text-warning">Awaiting Signature</span>
                  )}
                </span>
              </div>
            </div>

            {error && <p className="text-xs font-semibold text-danger">{error}</p>}
            {success && <p className="text-xs font-semibold text-success">{success}</p>}

            {!contract.signed_on ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Please review and digitally sign your legal publishing agreement to authorize publication and start book production.
                </p>
                <Link
                  href={`/publish/contract/${contract.id}`}
                  className="apple-button flex w-full items-center justify-center gap-2 rounded-lg bg-success py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-success-hover"
                >
                  <span>Review &amp; Digitally Sign Contract</span>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg bg-success/10 p-4 border border-success/20 text-xs text-success text-center">
                  Thank you! The contract is signed. Your book has successfully moved to our production pipeline.
                </div>
                <Link
                  href={`/publish/contract/${contract.id}`}
                  className="apple-button flex w-full items-center justify-center gap-2 rounded-lg border border-black/10 bg-surface py-2 text-xs font-bold text-foreground transition hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                >
                  <span>View / Print Sealed Agreement</span>
                  <svg className="h-3.5 w-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </Link>
              </div>
            )}
          </div>

          {/* Active Production Project Tracking Details */}
          {contract.signed_on && production && (
            <div className="rounded-xl border border-border bg-surface p-6 space-y-6">
              <div>
                <h3 className="text-base font-semibold">Book Production Progress</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Follow your manuscript's journey as our team typesets, edits, and prints your book.
                </p>
              </div>

              {/* Progress Stepper */}
              <div className="flex flex-wrap gap-4 text-xs font-medium border-b border-border pb-4">
                {[
                  { key: "under_contract", label: "Signed" },
                  { key: "dtp", label: "Typeset" },
                  { key: "editing", label: "Editing" },
                  { key: "cover_design", label: "Cover" },
                  { key: "isbn_registration", label: "ISBN" },
                  { key: "final_proof", label: "Proof" },
                  { key: "printing", label: "Printing" },
                  { key: "completed", label: "Live" },
                ].map((s) => {
                  const isActive = production.status === s.key;
                  // Simple check if it's already completed
                  const list = ["under_contract", "dtp", "editing", "cover_design", "isbn_registration", "final_proof", "printing", "completed"];
                  const isDone = list.indexOf(production.status) > list.indexOf(s.key);

                  return (
                    <span
                      key={s.key}
                      className={`px-2.5 py-1 rounded-full border ${
                        isActive
                          ? "bg-primary/10 text-primary border-primary/25 font-bold"
                          : isDone
                          ? "bg-success/5 text-success border-success/15"
                          : "bg-surface-muted text-muted-foreground border-border"
                      }`}
                    >
                      {s.label}
                    </span>
                  );
                })}
              </div>

              {/* Message per active stage */}
              <div className="text-sm leading-relaxed text-foreground bg-surface-muted/50 rounded-lg p-4">
                {production.status === "under_contract" && (
                  <p>Our managers are setting up your schedule and assigning staff members for cover design and typesetting.</p>
                )}
                {production.status === "dtp" && (
                  <p>Our desktop publishing staff is actively formatting layout templates and typesetting your pages.</p>
                )}
                {production.status === "editing" && (
                  <div className="space-y-2">
                    <p>
                      {production.proof_feedback
                        ? "Your manuscript has been returned to the editorial team for revisions and re-typesetting based on proof review feedback."
                        : "Your manuscript pages are currently undergoing spelling, syntax, and editorial proofreading."}
                    </p>
                    {production.proof_feedback && (
                      <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-foreground">
                        <span className="font-bold text-warning block mb-1">Active Revision Notes:</span>
                        <span className="whitespace-pre-wrap">{production.proof_feedback}</span>
                      </div>
                    )}
                  </div>
                )}
                {production.status === "cover_design" && (
                  <p>Our design team is creating and formatting custom front-and-back cover illustrations.</p>
                )}
                {production.status === "isbn_registration" && (
                  <div>
                    {production.isbn_requested_at ? (
                      <div className="flex items-center gap-2 text-primary font-semibold">
                        <span>🔵</span>
                        <span>
                          ISBN Application submitted to National Agency ({production.isbn_requested_at.split(" ")[0]})
                          {production.isbn_request_ref ? ` · Ref: ${production.isbn_request_ref}` : ""}. Awaiting allocation.
                        </span>
                      </div>
                    ) : (
                      <p>We are preparing and submitting your publication metadata to the Raja Rammohun Roy National Agency for ISBN registration.</p>
                    )}
                  </div>
                )}
                {production.status === "printing" && (
                  <p>Your signed copy has been approved! Mass print run is active, and copies will be received at our warehouse shortly.</p>
                )}
                {production.status === "completed" && (
                  <p className="text-success font-semibold">✓ Live in Inventory! Your book is officially published and live in Kairali Books warehouse catalog.</p>
                )}

                {/* Final Proof review loop controls */}
                {production.status === "final_proof" && (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-warning/5 p-4 border border-warning/10 text-xs text-warning">
                      Attention: Please review the final layout draft copy and cover design. If there are any final edits 
                      or cover layout changes, submit them below. Otherwise, click "Approve and Sign Off".
                    </div>

                    <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Files For Review</h4>
                      <div className="flex flex-wrap gap-3">
                        {production.final_layout_path ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewType("layout");
                              setPreviewModalOpen(true);
                            }}
                            className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3.5 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition cursor-pointer"
                          >
                            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>View Typeset Layout (PDF)</span>
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Layout PDF not uploaded yet</span>
                        )}

                        {production.final_cover_path ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewType("cover");
                              setPreviewModalOpen(true);
                            }}
                            className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3.5 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition cursor-pointer"
                          >
                            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>View Book Cover Artwork</span>
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Cover design not uploaded yet</span>
                        )}
                      </div>
                    </div>

                    {!production.proof_approved_at ? (
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="comments" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                            Describe needed changes (only if requesting revisions)
                          </label>
                          <textarea
                            id="comments"
                            rows={3}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Detail typeset typos, cover tweaks..."
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => onProofDecision("approve")}
                            className="flex-1 rounded-lg bg-success py-2.5 text-sm font-semibold text-white transition hover:bg-success-hover disabled:opacity-60"
                          >
                            {pending ? "Processing..." : "Approve & Sign Off"}
                          </button>
                          <button
                            type="button"
                            disabled={pending || !comment.trim()}
                            onClick={() => onProofDecision("reject")}
                            className="flex-1 rounded-lg border border-border bg-surface py-2.5 text-sm font-semibold transition hover:bg-surface-muted disabled:opacity-60"
                          >
                            Request Rework
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-success font-semibold">✓ You have approved and signed off on the final copy proof.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {production && (
        <DocumentPreviewModal
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          title={submission.title}
          projectId={production.id}
          initialType={previewType}
          hasLayout={Boolean(production.final_layout_path)}
          hasCover={Boolean(production.final_cover_path)}
          refNo={submission.ref_no}
          email={submission.email}
        />
      )}
    </div>
  );
}
