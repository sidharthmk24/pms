"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatIST } from "@/lib/time";

export type TrackerStage = {
  key: string;
  title: string;
  subtitle: string;
  date?: string | null;
  status: "completed" | "current" | "upcoming" | "alert";
  location?: string;
  note?: string;
};

export type TrackerData = {
  id?: string;
  refNo: string;
  title: string;
  titleMl?: string | null;
  genre: string;
  language: string;
  submittedAt: string;
  statusCode: string;
  statusLabel: string;
  reviewNotes?: string | null;
  contractId?: string | null;
  contractSignedOn?: string | null;
  contractStatus?: string | null;
  renegotiationRequested?: boolean;
  productionId?: string | null;
  productionStatus?: string | null;
  courierDocket?: string | null;
  authorCopiesQty?: number | null;
};

export function OrderTracker({ data }: { data: TrackerData }) {
  const router = useRouter();
  const [showHistory, setShowHistory] = useState(false);
  const [revisionFile, setRevisionFile] = useState<File | null>(null);
  const [revisionBrief, setRevisionBrief] = useState("");
  const [revisionPending, setRevisionPending] = useState(false);
  const [revisionError, setRevisionError] = useState<string | null>(null);
  const [revisionSuccess, setRevisionSuccess] = useState<string | null>(null);

  async function handleRevisionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!data.id) return;
    if (!revisionFile) {
      setRevisionError("Please select a revised manuscript file (PDF, Word, or ODT) to upload.");
      return;
    }

    setRevisionPending(true);
    setRevisionError(null);
    setRevisionSuccess(null);

    const formData = new FormData();
    formData.append("action", "upload_revision");
    formData.append("manuscript", revisionFile);
    formData.append("brief", revisionBrief.trim());

    try {
      const res = await fetch(`/api/public/submissions/${data.id}/status`, {
        method: "POST",
        body: formData,
      });
      const resJson = await res.json();
      if (!res.ok || !resJson.ok) {
        setRevisionError(resJson?.error || "Failed to submit revision. Please try again.");
      } else {
        setRevisionSuccess("Revised manuscript and brief submitted successfully! Our editorial team has been notified.");
        setRevisionFile(null);
        setRevisionBrief("");
        router.refresh();
      }
    } catch {
      setRevisionError("Failed to connect to the server. Please check your connection.");
    } finally {
      setRevisionPending(false);
    }
  }

  // Map submission & production status to Amazon/Flipkart tracking milestones
  const stages: TrackerStage[] = [
    {
      key: "submitted",
      title: "Manuscript Received",
      subtitle: "Ingested into Kairali digital repository",
      date: formatIST(data.submittedAt),
      location: "Intake Registry, Kozhikode",
      status: "completed",
    },
    {
      key: "screening",
      title: "Editorial Screening",
      subtitle: "Format, genre & preliminary eligibility review",
      date: data.statusCode !== "new" ? "Screening Cleared" : null,
      location: "Editorial Desk",
      status:
        data.statusCode === "new"
          ? "current"
          : data.statusCode === "declined"
          ? "upcoming"
          : "completed",
    },
    {
      key: "review",
      title: "Literary Board Evaluation",
      subtitle: "Senior literary committee in-depth evaluation",
      date: data.statusCode === "under_review" ? "Active Evaluation" : data.statusCode === "accepted" ? "Approved by Board" : null,
      location: "Literary Evaluation Board",
      status:
        data.statusCode === "under_review"
          ? "current"
          : data.statusCode === "needs_revision"
          ? "alert"
          : ["accepted"].includes(data.statusCode) || Boolean(data.contractId || data.productionId)
          ? "completed"
          : "upcoming",
      note: data.reviewNotes || undefined,
    },
    {
      key: "contract",
      title: "Publishing Agreement",
      subtitle: "Royalty schedule & formal contract offer",
      date: data.contractSignedOn
        ? `Signed: ${data.contractSignedOn}`
        : data.renegotiationRequested
        ? "Terms Review in Progress"
        : data.contractId
        ? "Draft Agreement Ready"
        : null,
      location: "Legal & Contracts Cell",
      status: data.contractSignedOn || data.productionId
        ? "completed"
        : data.renegotiationRequested
        ? "alert"
        : data.contractId || data.statusCode === "accepted"
        ? "current"
        : "upcoming",
    },
    {
      key: "production",
      title: "Typesetting & Press",
      subtitle: "DTP layout, cover art, ISBN allocation & offset printing",
      date: data.productionStatus ? `Stage: ${data.productionStatus.replace(/_/g, " ").toUpperCase()}` : null,
      location: "Kairali Printing Works",
      status:
        data.productionStatus === "completed"
          ? "completed"
          : data.productionId
          ? "current"
          : "upcoming",
    },
    {
      key: "delivered",
      title: "Published & In Stores",
      subtitle: "Copies distributed to retail stores, online & author delivery",
      date: data.courierDocket ? `Docket: ${data.courierDocket}` : null,
      location: "Central Warehouse & Book Fairs",
      status: data.productionStatus === "completed" ? "completed" : "upcoming",
    },
  ];

  // Derive current overall status display
  let mainHeadline = "In Transit: Editorial Evaluation";
  let badgeColor = "bg-[#7e2562] text-white";
  let estimatedDelivery = "Estimated evaluation: ~3–4 weeks from submission";

  if (data.statusCode === "renegotiation_requested" || data.renegotiationRequested) {
    mainHeadline = "Publishing Agreement: Terms Revision in Review";
    badgeColor = "bg-amber-600 text-white";
    estimatedDelivery = "Editorial team is reviewing your requested contract revisions";
  } else if (data.statusCode === "accepted") {
    mainHeadline = "Milestone Achieved: Manuscript Approved for Publication!";
    badgeColor = "bg-emerald-600 text-white";
    estimatedDelivery = "Next: Executing publishing contract & DTP scheduling";
  } else if (data.statusCode === "needs_revision") {
    mainHeadline = "Action Required: Revisions Requested by Editorial Board";
    badgeColor = "bg-amber-600 text-white";
    estimatedDelivery = "Please review editorial comments below and re-submit";
  } else if (data.statusCode === "under_review") {
    mainHeadline = "Under Active Review by Literary Committee";
    badgeColor = "bg-blue-600 text-white";
    estimatedDelivery = "Decision expected within 1–2 weeks";
  } else if (data.statusCode === "declined" || data.statusCode === "rejected") {
    mainHeadline = "Editorial Evaluation Concluded: Submission Declined";
    badgeColor = "bg-red-600 text-white shadow-red-500/20";
    estimatedDelivery = "Manuscript evaluation completed";
  } else if (data.productionStatus) {
    mainHeadline = `In Production: ${data.productionStatus.replace(/_/g, " ").toUpperCase()}`;
    badgeColor = "bg-purple-700 text-white";
    estimatedDelivery = "Book is currently being typeset and prepped for press";
  }

  // Calculate current active milestone index for line progress
  const currentStageIndex = stages.findIndex((st) => st.status === "current" || st.status === "alert");
  const allDone = stages.every((st) => st.status === "completed");
  const effectiveIndex = allDone ? stages.length : currentStageIndex >= 0 ? currentStageIndex : 0;

  return (
    <div className="rounded-3xl border border-[#7e2562]/15 bg-white p-5 sm:p-7 shadow-xs hover:shadow-plum-xs hover:border-[#7e2562]/30 transition-all">
      {/* Tracker Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-[#7e2562]/10 pb-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-black uppercase text-[#7e2562] bg-[#faedf5] px-2.5 py-0.5 rounded-md border border-[#7e2562]/20">
              REF: {data.refNo}
            </span>
            <span className="text-xs text-muted-foreground font-semibold">·</span>
            <span className="text-xs text-muted-foreground font-medium">{data.genre}</span>
            <span className="text-xs text-muted-foreground font-semibold">·</span>
            <span className="text-xs text-muted-foreground font-medium">{data.language}</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-extrabold text-foreground   tracking-tight">
            {data.title}
          </h3>
          {data.titleMl && (
            <p className="text-sm font-medium text-muted-foreground font-ml">{data.titleMl}</p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="text-left sm:text-right">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-2xs ${badgeColor}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              <span>{data.statusLabel}</span>
            </div>
            <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
              {estimatedDelivery}
            </p>
          </div>
        </div>
      </div>

      {/* Amazon / Flipkart Milestone Progression Bar */}
      <div className="py-6 sm:py-7">
        <div className="hidden lg:block">
          {/* Horizontal Desktop Bar with Grid Alignment */}
          <div className="grid grid-cols-6 items-start">
            {stages.map((stage, idx) => {
              const isCompleted = stage.status === "completed";
              const isCurrent = stage.status === "current";
              const isAlert = stage.status === "alert";
              const isLineCompleted = idx < effectiveIndex;

              return (
                <div key={stage.key} className="relative flex flex-col items-center text-center group">
                  {/* Connector Line to the next step */}
                  {idx < stages.length - 1 && (
                    <div className="absolute left-1/2 right-[-50%] top-[14px] -translate-y-1/2 h-[2px] z-0 pointer-events-none">
                      {/* Inactive base track */}
                      <div className="h-full w-full bg-gray-200/90 rounded-full" />
                      {/* Active progress fill */}
                      <div
                        className={`absolute inset-0 rounded-full transition-all duration-700 ease-out ${
                          isLineCompleted
                            ? "bg-gradient-to-r from-emerald-500 via-emerald-600 to-[#7e2562]"
                            : "opacity-0"
                        }`}
                      />
                    </div>
                  )}

                  {/* Node Circle */}
                  <div
                    className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full transition-all ${
                      isCompleted
                        ? "bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/25"
                        : isCurrent
                        ? "bg-[#7e2562] text-white shadow-plum-xs ring-4 ring-[#7e2562]/20 animate-pulse"
                        : isAlert
                        ? "bg-amber-500 text-white ring-3 ring-amber-500/25 shadow-xs"
                        : "bg-white border border-gray-300 text-gray-400 font-semibold shadow-2xs"
                    }`}
                  >
                    {isCompleted ? (
                      <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : isCurrent ? (
                      <span className="h-2 w-2 rounded-full bg-white shadow-xs" />
                    ) : (
                      <span className="text-[11px] font-semibold text-gray-400">{idx + 1}</span>
                    )}
                  </div>

                  {/* Stage Label & Micro-Badge */}
                  <div className="mt-2.5 px-1 space-y-0.5 max-w-[140px]">
                    <p
                      className={`text-xs leading-tight ${
                        isCurrent
                          ? "font-bold text-[#7e2562]"
                          : isCompleted
                          ? "font-semibold text-foreground"
                          : "font-medium text-muted-foreground/75"
                      }`}
                    >
                      {stage.title}
                    </p>

                    {isCurrent && (
                      <span className="inline-block mt-0.5 rounded-full bg-[#faedf5] border border-[#7e2562]/25 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#7e2562] shadow-2xs">
                        Active Stage
                      </span>
                    )}

                    {stage.date && isCompleted && (
                      <p className="mt-1 text-[10px] font-medium text-emerald-700 bg-emerald-50/90 border border-emerald-200/50 rounded-full px-2 py-0.25 inline-block font-mono tracking-tight shadow-2xs">
                        {stage.date}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile Vertical Stepper */}
        <div className="lg:hidden space-y-5">
          {stages.map((stage, idx) => {
            const isCompleted = stage.status === "completed";
            const isCurrent = stage.status === "current";
            const isAlert = stage.status === "alert";

            return (
              <div key={stage.key} className="flex items-start gap-3.5 relative">
                {idx < stages.length - 1 && (
                  <div
                    className={`absolute left-[13px] top-[26px] bottom-[-20px] w-[2px] ${
                      idx < effectiveIndex ? "bg-gradient-to-b from-emerald-500 to-[#7e2562]" : "bg-gray-200"
                    }`}
                  />
                )}

                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black z-10 ${
                    isCompleted
                      ? "bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/25"
                      : isCurrent
                      ? "bg-[#7e2562] text-white shadow-plum-xs ring-4 ring-[#7e2562]/20 animate-pulse"
                      : isAlert
                      ? "bg-amber-500 text-white ring-3 ring-amber-500/25 shadow-xs"
                      : "bg-white border border-gray-300 text-gray-400 font-semibold shadow-2xs"
                  }`}
                >
                  {isCompleted ? (
                    <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : isCurrent ? (
                    <span className="h-2 w-2 rounded-full bg-white shadow-xs" />
                  ) : (
                    <span className="text-[11px] font-semibold text-gray-400">{idx + 1}</span>
                  )}
                </div>

                <div className="pt-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-bold ${isCurrent ? "text-[#7e2562]" : "text-foreground"}`}>
                      {stage.title}
                    </p>
                    {isCurrent && (
                      <span className="rounded-full bg-[#faedf5] border border-[#7e2562]/25 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#7e2562]">
                        CURRENT
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{stage.subtitle}</p>
                  {stage.date && isCompleted && (
                    <p className="mt-1 text-[10px] font-medium text-emerald-700 bg-emerald-50/90 border border-emerald-200/50 rounded-full px-2 py-0.25 inline-block font-mono tracking-tight">
                      {stage.date}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Editorial Revision Request & Author Resubmission Section */}
      {data.statusCode === "needs_revision" ? (
        <div className="my-5 rounded-2xl border-2 border-amber-300/80 bg-gradient-to-b from-amber-50/70 to-[#faf6f9]/80 p-5 sm:p-6 shadow-xs">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-amber-200/80 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-900">
                  Revision Required
                </span>
                <span className="text-xs text-muted-foreground font-semibold">·</span>
                <span className="text-xs font-semibold text-amber-900">Editorial Board Evaluation</span>
              </div>
              <h4 className="mt-1 text-base font-extrabold text-foreground  ">
                Revisions Requested for &ldquo;{data.title}&rdquo;
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Our editorial team has reviewed your work and requested adjustments. Please review the comments below, update your manuscript, and upload your revised file along with a short brief explaining your changes.
              </p>
            </div>
          </div>

          {/* Editor's Review Note */}
          {data.reviewNotes && (
            <div className="mt-4 rounded-xl border border-amber-300/70 bg-white/90 p-4">
              <div className="flex items-center gap-2 font-bold text-amber-900 text-xs mb-1.5">
                <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span>Editorial Feedback &amp; Requested Changes:</span>
              </div>
              <p className="text-foreground/90 font-medium leading-relaxed pl-6 text-xs whitespace-pre-wrap">
                &ldquo;{data.reviewNotes}&rdquo;
              </p>
            </div>
          )}

          {/* Resubmission Form */}
          <form onSubmit={handleRevisionSubmit} className="mt-5 pt-4 border-t border-amber-200/60 space-y-4">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <span>📄</span>
                <span>Submit Revised Manuscript &amp; Author Brief</span>
              </h5>
              <span className="text-[11px] text-muted-foreground font-medium">Re-evaluation Intake</span>
            </div>

            {/* Success Banner */}
            {revisionSuccess && (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-black text-[10px]">✓</span>
                <span>{revisionSuccess}</span>
              </div>
            )}

            {/* Error Banner */}
            {revisionError && (
              <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs font-semibold text-rose-900 flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white font-black text-[10px]">!</span>
                <span>{revisionError}</span>
              </div>
            )}

            {/* PDF / Manuscript Dropzone */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Revised Document File (PDF / Word) <span className="text-rose-600">*</span>
              </label>
              <div className="group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#7e2562]/30 bg-white/80 p-5 transition-all hover:border-[#7e2562]/60 hover:bg-white cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.odt"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setRevisionFile(f);
                    if (f) setRevisionError(null);
                  }}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0 z-10"
                />
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7e2562]/10 text-[#7e2562] mb-2 transition-transform duration-200 group-hover:scale-110 pointer-events-none">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2 text-center pointer-events-none">
                  <span className="rounded-lg bg-[#7e2562] px-3 py-1.5 text-xs font-bold text-white shadow-plum-sm group-hover:bg-[#681b50] transition-colors">
                    {revisionFile ? "Change File" : "Choose Revised File"}
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    {revisionFile ? revisionFile.name : "or click / drag and drop here"}
                  </span>
                </div>
                <p className="mt-2 text-[11px] font-semibold text-[#7e2562] pointer-events-none text-center">
                  {revisionFile
                    ? `✓ Selected: ${revisionFile.name} (${Math.round((revisionFile.size / 1024 / 1024) * 100) / 100} MB)`
                    : "Supported: PDF, DOC, DOCX or ODT · Max 25 MB"}
                </p>
              </div>
            </div>

            {/* Small Brief Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor={`brief-${data.id}`} className="text-xs font-bold text-foreground">
                  Author&apos;s Brief &amp; Revision Summary <span className="text-muted-foreground font-normal">(Optional)</span>
                </label>
                <span className="text-[11px] text-muted-foreground">
                  {revisionBrief.trim().length} characters
                </span>
              </div>
              <textarea
                id={`brief-${data.id}`}
                rows={3}
                value={revisionBrief}
                onChange={(e) => {
                  setRevisionBrief(e.target.value);
                  if (e.target.value.trim()) setRevisionError(null);
                }}
                placeholder="Briefly explain the changes you made in response to the editor's notes (e.g. Revised chapters 3 and 4, tightened dialogue, clarified the character backstory)..."
                className="w-full rounded-xl border border-gray-300 bg-white p-3 text-xs leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:border-[#7e2562] focus:outline-none focus:ring-2 focus:ring-[#7e2562]/20 resize-y"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                This optional note will be recorded and sent to your assigned editor along with your revised manuscript file.
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={revisionPending || !revisionFile}
                className="apple-button inline-flex items-center gap-2 rounded-xl bg-[#7e2562] px-5 py-2.5 text-xs font-extrabold text-white shadow-plum-sm hover:bg-[#681b50] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {revisionPending ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Uploading Revised Manuscript...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Revised Manuscript &amp; Brief</span>
                    <span>&rarr;</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        data.reviewNotes && (
          <div className="my-4 rounded-2xl border border-[#7e2562]/20 bg-[#faf4f8] p-4 text-xs">
            <div className="flex items-center gap-2 font-bold text-[#7e2562] mb-1">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span>Notes from Senior Editor:</span>
            </div>
            <p className="text-foreground/90 font-medium leading-relaxed pl-6">
              &ldquo;{data.reviewNotes}&rdquo;
            </p>
          </div>
        )
      )}

      {/* Courier / Author Copies Tracking (if applicable) */}
      {data.courierDocket && (
        <div className="my-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 font-bold text-emerald-900">
            <svg className="h-4 w-4 text-emerald-800 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span>Author Copies Dispatched: Docket #{data.courierDocket}</span>
          </div>
          {data.authorCopiesQty && (
            <span className="rounded-full bg-emerald-600 text-white font-bold px-3 py-1 text-[11px]">
              {data.authorCopiesQty} Copies
            </span>
          )}
        </div>
      )}

      {/* Footer Details & Toggle Full History */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-[#7e2562]/10 pt-4">
        <button
          type="button"
          onClick={() => setShowHistory(!showHistory)}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#7e2562] hover:underline cursor-pointer"
        >
          <svg
            className={`h-4 w-4 transition-transform ${showHistory ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          <span>{showHistory ? "Hide Detailed Activity Log" : "See All Tracking Updates & Milestones"}</span>
        </button>

        <div className="flex items-center gap-2">
          {data.contractId ? (
            <Link
              href={`/publish/contract/${data.contractId}`}
              className={`apple-button inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold text-white transition-all ${
                data.contractSignedOn
                  ? "bg-emerald-600 shadow-emerald-sm hover:bg-emerald-700"
                  : data.renegotiationRequested
                  ? "bg-amber-600 shadow-xs hover:bg-amber-700"
                  : "bg-[#7e2562] shadow-plum-sm hover:bg-[#681b50]"
              }`}
            >
              <span>
                {data.contractSignedOn
                  ? "View Signed Agreement"
                  : data.renegotiationRequested
                  ? "Review Requested · View Status"
                  : "Review & Sign Agreement"}
              </span>
              <span>&rarr;</span>
            </Link>
          ) : data.statusCode === "accepted" ? (
            <Link
              href="#contracts"
              className="apple-button inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-emerald-sm hover:bg-emerald-700 transition-all"
            >
              <span>Publishing Agreements</span>
              <span>&rarr;</span>
            </Link>
          ) : null}

          {/* {data.productionId && (
            <Link
              href="#production"
              className="apple-button inline-flex items-center gap-1.5 rounded-xl bg-[#7e2562] px-3.5 py-1.5 text-xs font-bold text-white shadow-plum-sm hover:bg-[#681b50] transition-all"
            >
              <span>Production Pipeline</span>
              <span>&rarr;</span>
            </Link>
          )} */}
        </div>
      </div>

      {/* Expandable Activity Log Drawer */}
      {showHistory && (
        <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50/70 p-5 animate-in fade-in">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-4">
            Timestamped Telemetry &amp; Event Logs
          </h4>
          <ol className="relative border-l border-gray-300 ml-3 space-y-5">
            {stages.map((st) => (
              <li key={st.key} className="ml-5">
                <div
                  className={`absolute -left-2.5 mt-1.5 h-5 w-5 rounded-full border-2 bg-white ${
                    st.status === "completed"
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : st.status === "current"
                      ? "border-[#7e2562] bg-[#7e2562]"
                      : "border-gray-300"
                  } flex items-center justify-center`}
                >
                  {st.status === "completed" && (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <h5 className="text-xs font-bold text-foreground">{st.title}</h5>
                  <span className="text-[11px] font-semibold text-muted-foreground font-mono">
                    {st.date || "Pending Next Stage"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{st.subtitle}</p>
                {st.location && (
                  <p className="text-[10px] font-semibold text-[#7e2562] mt-0.5">
                    Location: {st.location}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
