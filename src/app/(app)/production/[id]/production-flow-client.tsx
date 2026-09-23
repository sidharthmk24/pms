"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatIST } from "@/lib/time";
import { formatPaise } from "@/lib/money";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileText,
  Image as ImageIcon,
  BookOpen,
  Printer,
  PackageCheck,
  Calendar,
  User,
  Sparkles,
  Layers,
  Edit3,
} from "lucide-react";
import TaskAdvance from "./task-advance";
import PrintReceiptForm from "./print-receipt-form";
import PostProductionForm from "./post-production-form";
import PostProductionDashboard from "./post-production-dashboard";
import ScheduleForm from "./schedule-form";
import { ProofPreviewButtons } from "@/app/(app)/author/proof-preview-button";

const PIPELINE_ORDER = [
  "dtp",
  "editing",
  "cover_design",
  "isbn_registration",
  "final_proof",
];

const STAGE_META: Record<
  string,
  {
    label: string;
    description: string;
    icon: typeof FileText;
    activeDescription: string;
  }
> = {
  dtp: {
    label: "DTP / Typesetting",
    description: "Typesetting manuscript into print-ready interior layout",
    icon: FileText,
    activeDescription: "Typesetting manuscript into print-ready interior layout",
  },
  editing: {
    label: "Proofreading & Editing",
    description: "Proofreading interior book pages and checking typography",
    icon: BookOpen,
    activeDescription: "Proofreading interior book pages and checking typography",
  },
  cover_design: {
    label: "Cover Design",
    description: "Designing front, spine, and back cover artwork",
    icon: ImageIcon,
    activeDescription: "Designing front, spine, and back cover artwork",
  },
  isbn_registration: {
    label: "ISBN Registration",
    description: "Preparing and filing official ISBN application",
    icon: Layers,
    activeDescription: "Filing and allocating official 13-digit ISBN",
  },
  final_proof: {
    label: "Author Final Proof",
    description: "Author inspection, digital sign-off & completion",
    icon: CheckCircle2,
    activeDescription: "Author digital sign-off and approval to finish & publish",
  },
  completed: {
    label: "Completed & Published",
    description: "Book publication complete and active in catalog",
    icon: CheckCircle2,
    activeDescription: "Book is published and live in catalog",
  },
};

export default function ProductionFlowClient({
  proj,
  isOwner,
  canAdvance,
  stagePermissions = {},
  publishingType,
  contractFreeCopies,
  activeUsers,
  contract,
  mrp,
  advance,
  printCost,
  statusClass,
  statusDot,
  statusLabels,
}: {
  proj: any;
  isOwner: boolean;
  canAdvance: boolean;
  stagePermissions?: Record<string, boolean>;
  publishingType: "kairali_funded" | "self_publishing";
  contractFreeCopies: number;
  activeUsers: Array<{ id: string; name: string; role: string }>;
  contract: any;
  mrp: number;
  advance: number;
  printCost: number;
  statusClass: string;
  statusDot: string;
  statusLabels: Record<string, string>;
}) {
  const isProjectCompleted = proj.status === "completed";

  // Current live status in database
  const liveStageKey = PIPELINE_ORDER.includes(proj.status)
    ? proj.status
    : isProjectCompleted
    ? "completed"
    : "dtp";

  // Selected stage for inspection / navigation (default to "completed" if finished, else live stage)
  const [selectedStage, setSelectedStage] = useState<string>(
    isProjectCompleted ? "completed" : liveStageKey
  );
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);

  // Automatically update selectedStage when project status advances
  useEffect(() => {
    if (proj.status === "completed") {
      setSelectedStage("completed");
    } else if (PIPELINE_ORDER.includes(proj.status)) {
      setSelectedStage(proj.status);
    }
  }, [proj.status]);

  const currentLiveIdx = isProjectCompleted
    ? PIPELINE_ORDER.length
    : PIPELINE_ORDER.indexOf(proj.status);
  const selectedIdx = PIPELINE_ORDER.indexOf(selectedStage);

  const isLiveStageSelected = !isProjectCompleted && selectedStage === proj.status;
  const isSelectedCompleted = isProjectCompleted || (currentLiveIdx !== -1 && selectedIdx < currentLiveIdx);
  const isSelectedUpcoming = !isProjectCompleted && currentLiveIdx !== -1 && selectedIdx > currentLiveIdx;

  const staffMap = new Map(activeUsers.map((u) => [u.id, u.name]));

  function resolveStaffNames(assignedTo: string | null, assignees?: string | null): string | null {
    const ids = assignees
      ? assignees.split(",").map((s) => s.trim()).filter(Boolean)
      : assignedTo ? [assignedTo] : [];
    if (ids.length === 0) return null;
    const names = ids.map((id) => staffMap.get(id) || "Staff");
    return names.join(", ");
  }

  const trackerSteps = [
    {
      key: "dtp",
      label: "DTP / Typesetting",
      completedAt: proj.dtp_completed_at,
      deadline: proj.dtp_deadline,
      staff: resolveStaffNames(proj.dtp_assigned_to, proj.dtp_assignees),
    },
    {
      key: "editing",
      label: "Proofreading & Editing",
      completedAt: proj.editing_completed_at,
      deadline: proj.editing_deadline,
      staff: resolveStaffNames(proj.editing_assigned_to, proj.editing_assignees),
    },
    {
      key: "cover_design",
      label: "Cover Design",
      completedAt: proj.cover_completed_at,
      deadline: proj.cover_deadline,
      staff: resolveStaffNames(proj.cover_assigned_to, proj.cover_assignees),
    },
    {
      key: "isbn_registration",
      label: "ISBN Registration",
      completedAt: proj.isbn_completed_at,
      deadline: proj.isbn_deadline,
      staff: resolveStaffNames(proj.isbn_assigned_to, proj.isbn_assignees),
      detail: proj.isbn_registered,
      substep:
        !proj.isbn_completed_at && proj.isbn_requested_at
          ? `Application filed: ${proj.isbn_requested_at.split(" ")[0]}${
              proj.isbn_request_ref ? ` (Ref: ${proj.isbn_request_ref})` : ""
            }`
          : null,
    },
    {
      key: "final_proof",
      label: "Author Final Proof",
      completedAt: proj.proof_approved_at || (isProjectCompleted ? proj.updated_at : null),
      deadline: proj.proof_deadline,
      staff: "Author & Editorial Sign-Off",
    },
  ];

  const completedCount = isProjectCompleted
    ? trackerSteps.length
    : trackerSteps.filter((s) => {
        const sIdx = PIPELINE_ORDER.indexOf(s.key);
        return currentLiveIdx !== -1 && sIdx < currentLiveIdx;
      }).length;

  const progressPct = Math.min(
    100,
    Math.round((completedCount / trackerSteps.length) * 100)
  );

  function handlePrevStage() {
    if (selectedIdx > 0) {
      setSelectedStage(PIPELINE_ORDER[selectedIdx - 1]);
    }
  }

  function handleNextStage() {
    if (selectedIdx < PIPELINE_ORDER.length - 1) {
      setSelectedStage(PIPELINE_ORDER[selectedIdx + 1]);
    }
  }

  const selectedStepData = trackerSteps.find((s) => s.key === selectedStage);
  const selectedMeta = STAGE_META[selectedStage] || STAGE_META.dtp;

  return (
    <div className="mx-auto max-w-6xl animate-apple-in space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/production"
          className="apple-button inline-flex items-center gap-2 rounded-xl border border-[#7e2562]/20 bg-white px-3.5 py-2 text-xs font-bold text-[#7e2562] shadow-2xs hover:bg-[#faedf5] hover:border-[#7e2562]/35 transition-all group"
        >
          <svg
            className="h-4 w-4 text-[#7e2562] transition-transform group-hover:-translate-x-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Production</span>
        </Link>
      </div>

      {/* Header */}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end border-b border-[#7e2562]/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {proj.titles.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Author: <strong>{proj.titles.authors?.name ?? "Unknown Author"}</strong> · ISBN:{" "}
            {proj.titles.isbn || proj.isbn_registered || "Pending Registration"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold whitespace-nowrap shadow-2xs ${statusClass}`}
          >
            <span className={`h-2 w-2 rounded-full ${statusDot}`} />
            {statusLabels[proj.status] ?? proj.status}
          </span>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid gap-6 md:grid-cols-3 items-start">
        {/* Left Column: Interactive Pipeline Steps Sidebar */}
        <section className="space-y-6 md:col-span-1 md:sticky md:top-20 md:self-start md:max-h-[calc(100vh-6rem)] md:overflow-y-auto pr-1">
          <div className="rounded-3xl border border-[#7e2562]/15 bg-white p-6 shadow-plum-sm dark:bg-surface dark:border-white/10">
            {/* Header & Progress Indicator */}
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold tracking-wider text-muted-foreground">
                  Pipeline Status
                </h2>
                <span className="rounded-full bg-[#faedf5] px-2.5 py-0.5 text-[10px] font-bold text-[#7e2562] dark:bg-[#7e2562]/20 dark:text-pink-300">
                  {completedCount} of {trackerSteps.length} Steps · {progressPct}%
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#7e2562] to-emerald-500 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Interactive Steps List */}
            <div className="space-y-2 pt-3">
              {isProjectCompleted && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStage("completed");
                    setEditingStage(null);
                  }}
                  className={`w-full text-left relative rounded-2xl transition-all cursor-pointer block p-3 mb-2 ${
                    selectedStage === "completed"
                      ? "border border-emerald-500/40 bg-emerald-50/80 shadow-xs dark:bg-emerald-950/30 ring-2 ring-emerald-500/20"
                      : "border border-emerald-500/20 bg-emerald-50/30 hover:bg-emerald-50/60 dark:bg-emerald-950/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white font-black text-xs shadow-2xs">
                      ✓
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                          Published Overview
                        </span>
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-black text-emerald-800 dark:text-emerald-300">
                          LIVE
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        Catalog metrics &amp; live status
                      </p>
                    </div>
                  </div>
                </button>
              )}

              {trackerSteps.map((step, idx) => {
                const stepIdx = PIPELINE_ORDER.indexOf(step.key);
                const isCompleted = currentLiveIdx !== -1 && stepIdx < currentLiveIdx;
                const isLive = step.key === proj.status;
                const isViewing = step.key === selectedStage;

                return (
                  <button
                    key={step.key}
                    type="button"
                    onClick={() => {
                      setSelectedStage(step.key);
                      setEditingStage(null);
                    }}
                    className={`w-full text-left relative rounded-2xl transition-all cursor-pointer block ${
                      isViewing
                        ? "border border-[#7e2562]/30 bg-gradient-to-br from-[#faedf5]/70 to-[#faedf5]/30 p-3 shadow-xs dark:from-[#7e2562]/20 dark:to-transparent dark:border-pink-500/40 ring-2 ring-[#7e2562]/20"
                        : "p-2 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] border border-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Step Number/Check Badge */}
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                        {isCompleted ? (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xs font-bold text-xs">
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        ) : isLive ? (
                          <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-[#7e2562] text-white font-extrabold text-xs shadow-xs ring-4 ring-[#7e2562]/15 dark:ring-pink-500/20">
                            {idx + 1}
                          </span>
                        ) : (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-black/12 bg-black/[0.02] text-xs font-bold text-muted-foreground dark:border-white/15 dark:bg-white/[0.04]">
                            {idx + 1}
                          </span>
                        )}
                      </div>

                      {/* Step Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex min-h-[24px] items-center justify-between gap-2">
                          <span
                            className={`text-xs font-bold leading-normal ${
                              isViewing
                                ? "text-[#7e2562] dark:text-pink-300 text-sm font-extrabold"
                                : isLive
                                ? "text-[#7e2562] font-bold"
                                : isCompleted
                                ? "text-foreground font-semibold"
                                : "text-muted-foreground"
                            }`}
                          >
                            {step.label}
                          </span>

                          {isCompleted && step.completedAt && (
                            <span
                              className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0"
                              title={`Completed on ${formatIST(step.completedAt)}`}
                            >
                              {formatIST(step.completedAt, false).split(" ").slice(0, 2).join(" ")}
                            </span>
                          )}
                          {isLive && !isCompleted && (
                            <span className="inline-flex h-2 w-2 rounded-full bg-[#7e2562] animate-ping shrink-0" />
                          )}
                        </div>

                        {/* Staff */}
                        {step.staff && (
                          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                            <svg
                              className="h-3 w-3 opacity-60"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                            <span className="truncate">{step.staff}</span>
                          </div>
                        )}

                        {step.detail && isCompleted && (
                          <span className="mt-0.5 inline-block text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                            ISBN: {step.detail}
                          </span>
                        )}

                        {/* Active Blinking Banner if this step is Live */}
                        {isLive && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-bold text-[#7e2562] dark:text-pink-300">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7e2562] opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#7e2562]"></span>
                            </span>
                            <span className="truncate">{selectedMeta.activeDescription}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Financial Tracking */}
          {isOwner && (
            <div className="rounded-xl border border-border bg-surface p-5">
              <h2 className="text-xs font-bold  tracking-wider text-muted-foreground mb-4">
                Cost &amp; Royalty Tracking
              </h2>
              <div className="space-y-3 text-sm text-foreground">
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Book MRP</span>
                  <span className="numeric font-semibold">
                    {mrp > 0 ? formatPaise(mrp) : "Pending price lock"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Royalty Rate</span>
                  <span className="font-semibold">
                    {contract
                      ? `${contract.royalty_pct}% (${
                          publishingType === "self_publishing"
                            ? "Self-Publishing"
                            : "Kairali Books Publishing"
                        })`
                      : "No contract linked"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Contract Advance</span>
                  <span className="numeric font-semibold">{formatPaise(advance)}</span>
                </div>
                {proj.print_job_id && (
                  <div className="flex justify-between pt-1">
                    <span className="text-muted-foreground">Print Run Cost</span>
                    <span className="numeric font-semibold text-danger">{formatPaise(printCost)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Right Column: Stage Details & Actions with Navigation Controls */}
        <section className="space-y-6 md:col-span-2">
          {/* Step Back & Forward Navigation Toolbar (Commented Out)
          <div className="rounded-2xl border border-black/8 bg-surface p-4 shadow-2xs flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handlePrevStage}
                disabled={selectedIdx === 0}
                className="apple-button inline-flex items-center gap-1 rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-bold text-foreground shadow-2xs hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all dark:border-white/10 dark:bg-white/5"
                title="Go to Previous Step"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Prev</span>
              </button>

              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-foreground">
                    Step {selectedIdx + 1} of {PIPELINE_ORDER.length}: {selectedMeta.label}
                  </span>
                  {isLiveStageSelected ? (
                    <span className="inline-flex items-center rounded-full bg-[#7e2562]/10 px-2 py-0.5 text-[10px] font-bold text-[#7e2562] dark:text-pink-300 border border-[#7e2562]/20">
                      Live Active Stage
                    </span>
                  ) : isSelectedCompleted ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="h-3 w-3" /> Completed
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300 border border-black/5">
                      Upcoming Step
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleNextStage}
                disabled={selectedIdx === PIPELINE_ORDER.length - 1}
                className="apple-button inline-flex items-center gap-1 rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-bold text-foreground shadow-2xs hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all dark:border-white/10 dark:bg-white/5"
                title="Go to Next Step"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {!isLiveStageSelected && proj.status !== "completed" && (
              <button
                type="button"
                onClick={() => setSelectedStage(liveStageKey)}
                className="apple-button inline-flex items-center gap-1.5 rounded-xl border border-[#7e2562]/20 bg-[#faedf5] px-3.5 py-1.5 text-xs font-bold text-[#7e2562] hover:bg-[#7e2562] hover:text-white transition-all cursor-pointer shadow-2xs"
              >
                <span>Jump to Active Task ({STAGE_META[liveStageKey]?.label || liveStageKey})</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          */}

          {/* 1. If viewing the Published Overview (when completed) */}
          {selectedStage === "completed" && (
            <PostProductionDashboard
              projectId={proj.id}
              project={proj}
              title={proj.titles}
              printJob={proj.print_jobs}
              publishingType={publishingType}
            />
          )}

          {/* 2. Active Stage Action Forms (when project is in-progress) */}
          {isLiveStageSelected && (
            <>
              {(isOwner || stagePermissions[proj.status]) ? (
                ["dtp", "editing", "cover_design", "isbn_registration", "final_proof"].includes(
                  proj.status
                ) && (
                  <TaskAdvance
                    projectId={proj.id}
                    status={proj.status}
                    isbnRequestedAt={proj.isbn_requested_at}
                    isbnRequestRef={proj.isbn_request_ref}
                    proofApprovedAt={proj.proof_approved_at}
                    proofEmailSentAt={proj.proof_email_sent_at}
                    hasLayout={Boolean(proj.final_layout_path)}
                    onSuccess={(next?: string) => {
                      if (next) setSelectedStage(next);
                    }}
                  />
                )
              ) : (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-50/40 p-5 space-y-3 dark:border-amber-500/20 dark:bg-amber-950/20 animate-apple-in">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <h3 className="text-base font-bold text-foreground">
                      {selectedMeta.label} — In Progress
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {selectedMeta.activeDescription}. This step is currently assigned to and handled by the designated team member.
                  </p>
                  {selectedStepData?.staff && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-amber-500/10">
                      <User className="h-4 w-4 opacity-70" />
                      <span>
                        Assigned to: <strong className="text-foreground">{selectedStepData.staff}</strong>
                      </span>
                    </div>
                  )}
                  {proj.final_layout_path && (
                    <div className="pt-2">
                      <p className="text-xs font-semibold text-foreground mb-2">Manuscript Layout Deliverable:</p>
                      <ProofPreviewButtons
                        projectId={proj.id}
                        title={proj.titles.name}
                        hasLayout={Boolean(proj.final_layout_path)}
                        hasCover={Boolean(proj.final_cover_path)}
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* 3. If viewing a Completed Stage */}
          {selectedStage !== "completed" && !isLiveStageSelected && isSelectedCompleted && (
            <>
              {!isProjectCompleted && editingStage === selectedStage ? (
                <div className="space-y-3 animate-apple-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground tracking-wider">
                      Modifying Deliverables &amp; Metadata
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingStage(null)}
                      className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
                    >
                        Exit Edit Mode
                    </button>
                  </div>
                  <TaskAdvance
                    projectId={proj.id}
                    status={selectedStage}
                    isEditMode={true}
                    initialIsbn={proj.isbn_registered || proj.titles?.isbn || ""}
                    initialApplicationRef={proj.isbn_request_ref || ""}
                    initialProofFeedback={proj.proof_feedback || ""}
                    hasLayout={Boolean(proj.final_layout_path)}
                    onCancelEdit={() => setEditingStage(null)}
                    onSuccess={() => setEditingStage(null)}
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50/40 p-5 space-y-4 dark:border-emerald-500/20 dark:bg-emerald-950/20 animate-apple-in">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <h3 className="text-base font-bold text-foreground">
                          {selectedMeta.label} — Completed
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {selectedMeta.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {isProjectCompleted && (
                        <button
                          type="button"
                          onClick={() => setSelectedStage("completed")}
                          className="apple-button inline-flex items-center gap-1 rounded-xl border border-emerald-500/30 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-2xs hover:bg-emerald-50 transition cursor-pointer dark:bg-surface-elevated dark:text-emerald-300"
                        >
                          <span> Published Overview</span>
                        </button>
                      )}

                      {selectedStepData?.completedAt && (
                        <span className="rounded-xl border border-emerald-500/20 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-2xs dark:bg-surface-elevated dark:text-emerald-300">
                          Completed: {formatIST(selectedStepData.completedAt)}
                        </span>
                      )}

                      {(isOwner || stagePermissions[selectedStage]) &&
                        !isProjectCompleted &&
                        ["dtp", "editing", "cover_design", "isbn_registration", "final_proof"].includes(
                          selectedStage
                        ) && (
                          <button
                            type="button"
                            onClick={() => setEditingStage(selectedStage)}
                            className="apple-button inline-flex items-center gap-1.5 rounded-xl border border-[#7e2562]/20 bg-white px-3 py-1.5 text-xs font-bold text-[#7e2562] shadow-2xs hover:bg-[#faedf5] hover:border-[#7e2562]/35 transition cursor-pointer dark:bg-surface-elevated dark:text-pink-300"
                            title="Edit deliverables, manuscript PDF, cover files, or metadata for this stage"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-[#7e2562] dark:text-pink-300" />
                            <span>Edit Data &amp; Files</span>
                          </button>
                        )}
                    </div>
                  </div>

                  {selectedStepData?.staff && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-emerald-500/10 pt-3">
                      <User className="h-4 w-4 opacity-70" />
                      <span>
                        Handled by: <strong className="text-foreground">{selectedStepData.staff}</strong>
                      </span>
                    </div>
                  )}

                  {/* Deliverables specific to the completed step */}
                  {selectedStage === "dtp" && (
                    <div className="pt-2">
                      <p className="text-xs font-bold text-foreground mb-2">Typeset Layout Deliverable:</p>
                      {proj.final_layout_path ? (
                        <ProofPreviewButtons
                          projectId={proj.id}
                          title={proj.titles.name}
                          hasLayout={Boolean(proj.final_layout_path)}
                          hasCover={false}
                        />
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No separate layout PDF file recorded.</p>
                      )}
                    </div>
                  )}

                  {selectedStage === "editing" && (
                    <div className="pt-2 space-y-2">
                      <p className="text-xs font-bold text-foreground">Editorial Proofreading Status:</p>
                      <p className="text-xs text-muted-foreground">
                        Proofreading checks and typography corrections were concluded and verified.
                      </p>
                      {proj.final_layout_path && (
                        <ProofPreviewButtons
                          projectId={proj.id}
                          title={proj.titles.name}
                          hasLayout={Boolean(proj.final_layout_path)}
                          hasCover={false}
                        />
                      )}
                    </div>
                  )}

                  {selectedStage === "cover_design" && (
                    <div className="pt-2">
                      <p className="text-xs font-bold text-foreground mb-2">Final Cover Artwork Deliverable:</p>
                      {proj.final_cover_path ? (
                        <ProofPreviewButtons
                          projectId={proj.id}
                          title={proj.titles.name}
                          hasLayout={false}
                          hasCover={Boolean(proj.final_cover_path)}
                        />
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No separate cover artwork file recorded.</p>
                      )}
                    </div>
                  )}

                  {selectedStage === "isbn_registration" && (
                    <div className="rounded-xl border border-black/8 bg-white p-3.5 space-y-1 dark:bg-surface-elevated">
                      <span className="text-[11px] font-bold tracking-wider text-muted-foreground">
                        Allocated ISBN Number
                      </span>
                      <p className="font-mono text-base font-extrabold text-foreground">
                        {proj.isbn_registered || proj.titles?.isbn || "Allocated"}
                      </p>
                      {proj.isbn_request_ref && (
                        <p className="text-xs text-muted-foreground">Agency Reference: {proj.isbn_request_ref}</p>
                      )}
                    </div>
                  )}

                  {selectedStage === "final_proof" && (
                    <div className="rounded-xl border border-black/8 bg-white p-3.5 space-y-2 dark:bg-surface-elevated">
                      <span className="text-[11px] font-bold tracking-wider text-muted-foreground">
                        Author Digital Approval &amp; Completion Sign-Off
                      </span>
                      <p className="text-xs font-bold text-foreground">
                        Approved by Author on {formatIST(proj.proof_approved_at || proj.updated_at)}
                      </p>
                      {proj.proof_feedback && (
                        <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                          Notes: {proj.proof_feedback}
                        </p>
                      )}
                      <div className="pt-2">
                        <ProofPreviewButtons
                          projectId={proj.id}
                          title={proj.titles.name}
                          hasLayout={Boolean(proj.final_layout_path)}
                          hasCover={Boolean(proj.final_cover_path)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* 4. If viewing an Upcoming Stage */}
          {selectedStage !== "completed" && !isLiveStageSelected && isSelectedUpcoming && (
            <div className="rounded-2xl border border-black/10 bg-slate-50/70 p-5 space-y-3 dark:border-white/10 dark:bg-white/[0.02] animate-apple-in">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-5 w-5" />
                <h3 className="text-base font-bold text-foreground">
                  {selectedMeta.label} — Upcoming Stage
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {selectedMeta.description}. This stage will activate once the previous milestones are concluded.
              </p>
              {selectedStepData?.staff && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-black/5">
                  <User className="h-4 w-4 opacity-70" />
                  <span>Scheduled Assignees: <strong className="text-foreground">{selectedStepData.staff}</strong></span>
                </div>
              )}
            </div>
          )}

          {/* Schedule Configuration Drawer / Modal Toggle (Owner / Admin) */}
          {isOwner && proj.status !== "completed" && proj.status !== "cancelled" && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-black/8 bg-surface p-4 shadow-2xs dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7e2562]/10 text-[#7e2562]">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-foreground">Production Schedule &amp; Assignments</h3>
                      <span className="inline-flex items-center rounded-full bg-[#7e2562]/10 px-2 py-0.5 text-[10px] font-bold text-[#7e2562]">
                        Owner Control
                      </span>
                    </div>
                    {/* <p className="text-[11px] text-muted-foreground mt-0.5">
                      Configure stage deadlines and staff assignments across milestones.
                    </p> */}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSchedule(!showSchedule)}
                  className="apple-button inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#7e2562]/20 bg-[#faedf5] px-4 py-2 text-xs font-bold text-[#7e2562] hover:bg-[#7e2562] hover:text-white transition-all cursor-pointer shadow-2xs shrink-0"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>{showSchedule ? "Hide Schedule Settings" : "Edit Schedule & Assignments"}</span>
                </button>
              </div>

              {showSchedule && (
                <div className="animate-apple-in">
                  <ScheduleForm project={proj} users={activeUsers} />
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
