"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DocumentPreviewModal } from "@/components/document-preview-modal";
import { openAuthorModal } from "@/components/author-auth-modal";
import { parseContractNotes } from "@/lib/contracts";

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
  term_notes?: string | null;
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
  post_production: "Post-Production Intake",
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
  const [brief, setBrief] = useState("");
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewType, setPreviewType] = useState<"layout" | "cover">("layout");

  const contractMeta = contract ? parseContractNotes(contract.term_notes) : null;
  const isRenegotiation = contractMeta?.renegotiation_requested ?? false;
  const isContractDeclined = contractMeta?.status === "declined" || Boolean(contractMeta?.declined_at);

  const displayStatusLabel = isContractDeclined
    ? "Publishing Offer Concluded"
    : isRenegotiation
    ? "Terms Review in Progress"
    : STATUS_LABELS[submission.status] ?? submission.status;

  const statusClass = isContractDeclined
    ? "bg-rose-100 text-rose-800 border border-rose-300 font-bold"
    : isRenegotiation
    ? "bg-amber-100 text-amber-900 border border-amber-300 font-bold"
    : {
        new: "bg-[#7e2562] text-white shadow-plum-sm",
        pending_review: "bg-[#7e2562]/10 text-[#7e2562] border border-[#7e2562]/20 font-bold",
        under_review: "bg-amber-50 text-amber-800 border border-amber-200 font-bold",
        needs_revision: "bg-amber-100 text-amber-900 border border-amber-300 font-bold",
        accepted: "bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold",
        declined: "bg-rose-50 text-rose-800 border border-rose-200 font-bold",
        archived: "bg-gray-100 text-gray-600",
        withdrawn: "bg-gray-100 text-gray-600",
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
    formData.append("brief", brief.trim());

    try {
      const res = await fetch(`/api/public/submissions/${submission.id}/status`, {
        method: "POST",
        body: formData,
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body?.error ?? "Failed to upload revision");
      } else {
        setSuccess("Revised manuscript and brief uploaded successfully!");
        setFile(null);
        setBrief("");
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

  async function handleReviewContract() {
    if (!contract) return;
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json().catch(() => null);
      const currentUser = data?.user;

      const isMatchingAuthor = Boolean(
        currentUser &&
        submission.email &&
        currentUser.email.toLowerCase() === submission.email.toLowerCase()
      );
      const isStaff = Boolean(
        currentUser && ["owner", "admin", "publisher", "editor"].includes(currentUser.role)
      );

      if (isMatchingAuthor || isStaff) {
        // Logged in as authorized author or staff -> proceed to contract
        router.push(`/publish/contract/${contract.id}`);
      } else {
        // Not logged in or logged in as different account -> open author login modal
        openAuthorModal({
          mode: "login",
          email: submission.email,
          redirectTo: `/publish/contract/${contract.id}`,
        });
      }
    } catch {
      openAuthorModal({
        mode: "login",
        email: submission.email,
        redirectTo: `/publish/contract/${contract.id}`,
      });
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
      <div className="rounded-3xl border border-[#7e2562]/15 bg-white p-7 shadow-plum-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="numeric text-xs font-bold uppercase tracking-wider text-primary">
              Tracking Ref: {submission.ref_no}
            </span>
            <h2 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">{submission.title}</h2>
            <p className="mt-1.5 text-base font-medium text-muted-foreground">
              Submitted by <strong className="text-foreground">{submission.author_name}</strong>
            </p>
          </div>
          <span className={`rounded-full px-4 py-1.5 text-xs font-bold ${statusClass}`}>
            {displayStatusLabel}
          </span>
        </div>
      </div>

      {/* Main portal messages based on status */}
      {(submission.status === "new" || submission.status === "pending_review") && (
        <div className="rounded-3xl border border-[#7e2562]/15 bg-white p-7 shadow-plum-sm sm:p-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#7e2562]/10 text-[#7e2562]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
        <div className="rounded-3xl border border-[#7e2562]/15 bg-white p-7 shadow-plum-sm sm:p-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-200">
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
            <h3 className="text-sm font-semibold mb-3">Upload Revised Manuscript &amp; Brief</h3>
            <form onSubmit={onUpload} className="space-y-4">
              <div className="group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#7e2562]/30 bg-background p-6 text-center hover:border-[#7e2562]/60 cursor-pointer">
                <input
                  id="revised-manuscript"
                  type="file"
                  accept=".pdf,.doc,.docx,.odt"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0 z-10"
                />
                <div className="pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mx-auto h-8 w-8 text-[#7e2562] mb-2 group-hover:scale-110 transition-transform">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                  </svg>
                  <span className="text-sm font-bold text-[#7e2562]">Click or drag &amp; drop to select revised manuscript</span>
                  <span className="block text-xs text-muted-foreground mt-1">PDF, DOC, DOCX or ODT up to 25 MB</span>
                </div>
                {file && (
                  <p className="text-xs font-bold text-emerald-700 mt-3 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    ✓ Selected: {file.name} ({Math.round((file.size / 1024 / 1024) * 100) / 100} MB)
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="revision-brief" className="block text-xs font-bold text-foreground mb-1.5">
                  Author&apos;s Brief &amp; Revision Notes <span className="text-muted-foreground font-normal">(Optional)</span>
                </label>
                <textarea
                  id="revision-brief"
                  rows={3}
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder="Briefly describe the revisions you made in response to the editor's comments..."
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:border-[#7e2562] focus:outline-none focus:ring-2 focus:ring-[#7e2562]/20"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  This optional note will be sent to the assigned editor along with your revised file.
                </p>
              </div>

              {error && <p className="text-xs font-semibold text-danger">{error}</p>}
              {success && <p className="text-xs font-semibold text-success">{success}</p>}

              <button
                type="submit"
                disabled={pending || !file}
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60 cursor-pointer"
              >
                {pending ? "Uploading..." : "Submit Revised Manuscript & Brief"}
              </button>
            </form>
          </div>
        </div>
      )}

      {submission.status === "accepted" && contract && (
        <div className="space-y-6">
          {/* If Contract Terms Revision / Renegotiation was requested */}
          {isRenegotiation ? (
            <div className="rounded-3xl border-2 border-amber-300 bg-amber-50/90 p-6 sm:p-7 space-y-5 shadow-xs">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-xs">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-lg font-extrabold text-amber-950">
                      Contract Terms Review in Progress
                    </h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/80 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                      Review Pending by Managing Editor
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs sm:text-sm text-amber-900/90 leading-relaxed">
                    You have requested revisions on the proposed publishing terms. Your feedback has been sent to our editorial board. Your assigned editor is reviewing your request and will follow up with updated terms.
                  </p>
                  {contractMeta?.author_feedback && (
                    <div className="mt-3.5 rounded-2xl border border-amber-300/80 bg-white/90 p-4 shadow-2xs">
                      <span className="text-xs font-bold text-amber-900 block mb-1">Your Submitted Review Request:</span>
                      <p className="text-xs text-foreground italic whitespace-pre-wrap">
                        &ldquo;{contractMeta.author_feedback}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-amber-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-amber-800">
                  You can inspect the agreement or update your revision message anytime.
                </p>
                <Link
                  href={`/publish/contract/${contract.id}`}
                  className="apple-button inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all cursor-pointer whitespace-nowrap"
                >
                  <span>View Contract &amp; Revision Notes</span>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            </div>
          ) : isContractDeclined ? (
            <div className="rounded-3xl border border-rose-300 bg-rose-50/90 p-6 sm:p-7 space-y-3 shadow-xs">
              <h3 className="text-lg font-extrabold text-rose-900">Publishing Offer Concluded</h3>
              <p className="text-xs sm:text-sm text-rose-800 leading-relaxed">
                This contract offer has concluded. {contractMeta?.decline_reason ? `Reason: "${contractMeta.decline_reason}"` : ""}
              </p>
            </div>
          ) : (
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
                  <button
                    type="button"
                    onClick={handleReviewContract}
                    className="apple-button flex w-full items-center justify-center gap-2 rounded-lg bg-success py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-success-hover cursor-pointer"
                  >
                    <span>Review &amp; Digitally Sign Contract</span>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
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
          )}

          {/* Active Production Project Tracking Journey */}
          {contract.signed_on && production && (() => {
            const stages = [
              {
                key: "under_contract",
                num: 1,
                label: "Signed",
                title: "Contract Executed & Production Setup",
                shortDesc: "Project timeline initialized & staff assigned",
                icon: (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
              },
              {
                key: "dtp",
                num: 2,
                label: "Typesetting",
                title: "DTP & Typesetting",
                shortDesc: "Malayalam typography, page layout & font kerning",
                icon: (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                ),
              },
              {
                key: "editing",
                num: 3,
                label: "Editing",
                title: "Editorial Proofreading",
                shortDesc: "Spelling, grammar & linguistic copy-editing",
                icon: (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                ),
              },
              {
                key: "cover_design",
                num: 4,
                label: "Cover Art",
                title: "Cover Artwork & Spine Layout",
                shortDesc: "Front/back cover illustrations & print wrap",
                icon: (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ),
              },
              {
                key: "isbn_registration",
                num: 5,
                label: "ISBN Registry",
                title: "ISBN National Registry",
                shortDesc: "Allocation by Raja Rammohun Roy National Agency",
                icon: (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                ),
              },
              {
                key: "final_proof",
                num: 6,
                label: "Author Proof",
                title: "Author Galley Proof Review",
                shortDesc: "Author inspection and final digital sign-off",
                icon: (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ),
              },
              {
                key: "printing",
                num: 7,
                label: "Press Run",
                title: "Press & Offset Printing",
                shortDesc: "Mass sheet printing, book binding & lamination",
                icon: (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                ),
              },
              {
                key: "post_production",
                num: 8,
                label: "Warehouse",
                title: "Warehouse Intake & QA",
                shortDesc: "Quality inspection & author copies dispatch",
                icon: (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                ),
              },
              {
                key: "completed",
                num: 9,
                label: "Published",
                title: "Published & In Distribution",
                shortDesc: "Live in store catalog and distribution network",
                icon: (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                ),
              },
            ];

            const currentIndex = stages.findIndex((s) => s.key === production.status);
            const activeIdx = currentIndex >= 0 ? currentIndex : 0;
            const progressPercent = Math.round(((activeIdx + 1) / stages.length) * 100);
            const currentStage = stages[activeIdx] || stages[0];

            return (
              <div className="rounded-3xl border border-[#7e2562]/15 bg-white p-6 sm:p-8 shadow-plum-sm space-y-8">
                {/* Header with Title & Overall Progress */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#7e2562]/10 pb-6">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#7e2562]/20 bg-[#faedf5] px-3 py-0.5 text-[11px] font-bold text-[#7e2562] mb-2">
                      <span className="h-2 w-2 rounded-full bg-[#7e2562] animate-pulse" />
                      <span>Live Production Pipeline</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                      Book Production Journey
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl leading-relaxed">
                      Follow your manuscript&apos;s journey as our specialized team typesets, proofreads, formats cover art, and prints your book.
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5 shrink-0 bg-[#faf8fa] sm:bg-transparent p-3 sm:p-0 rounded-2xl border border-[#7e2562]/10 sm:border-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Progress Tracker
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-[#7e2562]">
                        Stage {activeIdx + 1} of {stages.length}
                      </span>
                      <span className="rounded-full bg-[#faedf5] px-2.5 py-0.5 text-xs font-extrabold text-[#7e2562] border border-[#7e2562]/20">
                        {progressPercent}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Standardized Stepper Line */}
                <div className="overflow-x-auto pb-4 pt-2 -mx-2 px-2 no-scrollbar">
                  <div className="min-w-[620px] relative px-4">
                    {/* Centered Connector Track */}
                    <div className="absolute top-4 left-7 right-7 h-0.5 bg-black/[0.08] dark:bg-white/[0.1] -translate-y-1/2 z-0" />
                    <div
                      className="absolute top-4 left-7 h-0.5 bg-[#7e2562] -translate-y-1/2 z-0 transition-all duration-300"
                      style={{
                        width: `calc(${(activeIdx / (stages.length - 1)) * 100}% - 30px)`,
                      }}
                    />

                    {/* Stepper Nodes */}
                    <div className="flex items-center justify-between relative z-10">
                      {stages.map((s, idx) => {
                        const isDone = idx < activeIdx;
                        const isActive = idx === activeIdx;

                        return (
                          <div key={s.key} className="flex flex-col items-center text-center">
                            {/* Circle Node */}
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                                isDone
                                  ? "bg-[#7e2562] text-white shadow-xs ring-4 ring-white dark:ring-slate-900"
                                  : isActive
                                  ? "bg-[#7e2562] text-white ring-4 ring-[#7e2562]/20 font-extrabold shadow-plum-xs"
                                  : "bg-white text-muted-foreground border border-black/15 dark:border-white/15 dark:bg-slate-800"
                              }`}
                            >
                              {isDone ? (
                                <svg className="h-4 w-4 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                s.num
                              )}
                            </div>

                            {/* Single Clean Label */}
                            <span
                              className={`mt-2 text-xs font-bold whitespace-nowrap ${
                                isActive
                                  ? "text-[#7e2562]"
                                  : isDone
                                  ? "text-foreground"
                                  : "text-muted-foreground/70"
                              }`}
                            >
                              {s.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* ACTIVE STAGE SPOTLIGHT CARD */}
                <div className="rounded-2xl border border-[#7e2562]/20 bg-[#faf8fa] p-5 sm:p-7 space-y-5 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#7e2562]/10 pb-4">
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#7e2562] text-white shadow-plum-sm">
                        {currentStage.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#7e2562]">
                            Stage {currentStage.num} of 9
                          </span>
                          <span className="h-1 w-1 rounded-full bg-[#7e2562]" />
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            Current Step
                          </span>
                        </div>
                        <h4 className="text-lg font-black text-foreground mt-0.5">
                          {currentStage.title}
                        </h4>
                      </div>
                    </div>
                  </div>

                  {/* Stage-Specific Detailed Explanations */}
                  <div className="text-sm text-foreground/90 leading-relaxed space-y-3">
                    {production.status === "under_contract" && (
                      <p className="text-sm text-foreground">
                        Our production managers are currently setting up your publication master schedule, reserving print slots, and assigning staff members for cover art and typesetting.
                      </p>
                    )}

                    {production.status === "dtp" && (
                      <p className="text-sm text-foreground">
                        Our Malayalam desktop publishing (DTP) experts are actively formatting layout templates, calibrating font kerning, and typesetting your pages to standard book dimensions.
                      </p>
                    )}

                    {production.status === "editing" && (
                      <div className="space-y-3">
                        <p className="text-sm text-foreground">
                          {production.proof_feedback
                            ? "Your manuscript has been returned to the editorial team for revisions and re-typesetting based on proof review feedback."
                            : "Your manuscript pages are currently undergoing comprehensive spelling, grammar, syntax, and literary copy-editing."}
                        </p>
                        {production.proof_feedback && (
                          <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-4 text-xs text-amber-950">
                            <span className="font-bold block mb-1">Active Revision Notes:</span>
                            <span className="whitespace-pre-wrap">{production.proof_feedback}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {production.status === "cover_design" && (
                      <p className="text-sm text-foreground">
                        Our creative design team is crafting custom front, back, and spine artwork formatted to match your book's trim size and spine width.
                      </p>
                    )}

                    {production.status === "isbn_registration" && (
                      <div className="space-y-2">
                        {production.isbn_requested_at ? (
                          <div className="rounded-xl border border-[#7e2562]/20 bg-white p-4 space-y-1">
                            <div className="flex items-center gap-2 text-xs font-bold text-[#7e2562]">
                              <span className="flex h-2 w-2 rounded-full bg-[#7e2562] animate-pulse" />
                              <span>ISBN Application Submitted to Government National Agency</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Application date: <strong>{production.isbn_requested_at.split(" ")[0]}</strong>
                              {production.isbn_request_ref && (
                                <> · Reference: <code className="bg-[#faedf5] px-1.5 py-0.5 rounded text-[#7e2562] font-mono">{production.isbn_request_ref}</code></>
                              )}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-foreground">
                            We are preparing and submitting your publication metadata to the Raja Rammohun Roy National Agency for official ISBN allocation.
                          </p>
                        )}
                      </div>
                    )}

                    {production.status === "printing" && (
                      <div className="rounded-xl border border-[#7e2562]/20 bg-white p-4 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#7e2562]">
                          <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                          <span>Mass Print Run Active</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Your signed proof has been approved! High-speed offset mass printing, sheet binding, and cover lamination are currently underway.
                        </p>
                      </div>
                    )}

                    {production.status === "post_production" && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2 text-emerald-950">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                          <span className="h-2 w-2 rounded-full bg-emerald-600" />
                          <span>Warehouse Intake &amp; Quality Assurance</span>
                        </div>
                        <p className="text-xs text-emerald-900 leading-relaxed">
                          Physical printed copies have arrived at our central warehouse in Kozhikode for damage inspection, catalog entry, and author complimentary copies courier packaging.
                        </p>
                      </div>
                    )}

                    {production.status === "completed" && (
                      <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-950 space-y-1">
                        <p className="text-sm">✓ Officially Published &amp; Live in Catalog!</p>
                        <p className="font-normal text-emerald-800">
                          Your book has completed its full production cycle and is now live in Kairali Books warehouse catalog, retail stores, and online distribution channels.
                        </p>
                      </div>
                    )}

                    {/* Final Proof Review Hub (Only when status is final_proof) */}
                    {production.status === "final_proof" && (
                      <div className="space-y-4 pt-2">
                        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-950 space-y-1">
                          <span className="font-bold block">Author Galley Proof Action Required:</span>
                          <p className="leading-relaxed">
                            Please review the final typeset layout PDF and cover design files below. If all pages and artwork look accurate, click <strong>"Approve &amp; Sign Off"</strong>. If adjustments are needed, enter your rework notes and click <strong>"Request Rework"</strong>.
                          </p>
                        </div>

                        {/* File Previews */}
                        <div className="rounded-2xl border border-[#7e2562]/15 bg-white p-4 space-y-3">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                            Galley Proof Documents
                          </span>
                          <div className="flex flex-wrap gap-3">
                            {production.final_layout_path ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewType("layout");
                                  setPreviewModalOpen(true);
                                }}
                                className="apple-button inline-flex items-center gap-2 rounded-xl bg-[#faedf5] border border-[#7e2562]/20 px-4 py-2.5 text-xs font-bold text-[#7e2562] shadow-2xs hover:bg-[#faedf5]/80 active:scale-[0.98] transition cursor-pointer"
                              >
                                <svg className="h-4 w-4 shrink-0 text-[#7e2562]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <span>Preview Typeset Layout (PDF)</span>
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground italic bg-slate-100 rounded-lg px-3 py-2">
                                Layout PDF upload in progress...
                              </span>
                            )}

                            {production.final_cover_path ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewType("cover");
                                  setPreviewModalOpen(true);
                                }}
                                className="apple-button inline-flex items-center gap-2 rounded-xl bg-[#faedf5] border border-[#7e2562]/20 px-4 py-2.5 text-xs font-bold text-[#7e2562] shadow-2xs hover:bg-[#faedf5]/80 active:scale-[0.98] transition cursor-pointer"
                              >
                                <svg className="h-4 w-4 shrink-0 text-[#7e2562]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>Preview Book Cover Artwork</span>
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground italic bg-slate-100 rounded-lg px-3 py-2">
                                Cover artwork upload in progress...
                              </span>
                            )}
                          </div>
                        </div>

                        {!production.proof_approved_at ? (
                          <div className="space-y-4 pt-1">
                            <div>
                              <label htmlFor="comments" className="block text-xs font-bold text-foreground mb-1.5">
                                Describe requested adjustments <span className="text-muted-foreground font-normal">(only if requesting rework)</span>
                              </label>
                              <textarea
                                id="comments"
                                rows={3}
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Detail any typeset typos, character spacing, or cover adjustments..."
                                className="w-full rounded-xl border border-[#7e2562]/20 bg-white p-3 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-[#7e2562] focus:ring-2 focus:ring-[#7e2562]/15 shadow-2xs resize-none"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => onProofDecision("approve")}
                                className="apple-button w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 px-4 text-xs font-bold text-white shadow-xs active:scale-[0.98] disabled:opacity-50 transition cursor-pointer"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                <span>{pending ? "Submitting..." : "Approve & Sign Off Proof"}</span>
                              </button>

                              <button
                                type="button"
                                disabled={pending || !comment.trim()}
                                onClick={() => onProofDecision("reject")}
                                className="apple-button w-full inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 py-3 px-4 text-xs font-bold text-amber-900 shadow-2xs active:scale-[0.98] disabled:opacity-40 transition cursor-pointer"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span>Request Proof Rework</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-900 flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white font-black text-xs">✓</span>
                            <span>You have approved and signed off on the final copy proof. Ready for printing!</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
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
