import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatIST } from "@/lib/time";
import { formatPaise } from "@/lib/money";
import { parseContractNotes } from "@/lib/contracts";
import { hasRole } from "@/lib/roles";
import ScheduleForm from "./schedule-form";
import TaskAdvance from "./task-advance";
import PrintReceiptForm from "./print-receipt-form";
import PostProductionForm from "./post-production-form";
import PostProductionDashboard from "./post-production-dashboard";
import { ProofPreviewButtons } from "@/app/(app)/author/proof-preview-button";

export const metadata: Metadata = { title: "Production Detail" };
export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  under_contract: "Under Contract",
  dtp: "DTP (Typesetting)",
  editing: "Editing & Proofreading",
  cover_design: "Cover Design",
  isbn_registration: "ISBN Registration",
  final_proof: "Author Final Proof",
  printing: "Offset Printing Run",
  post_production: "Post-Production Intake",
  completed: "Completed / Live",
  cancelled: "Cancelled",
};

export default async function ProductionDetailPage({ params }: PageProps<"/production/[id]">) {
  const user = await requireCapability("production_pipeline.read");
  const isOwner = hasRole(user.role, "owner");
  const { id } = await params;

  const proj = await prisma.production_projects.findUnique({
    where: { id },
    include: {
      titles: {
        include: {
          authors: true,
        },
      },
      print_jobs: true,
    },
  });

  if (!proj) notFound();

  // Enforce that non-owner team members can only view projects assigned to them
  const allProjectAssignees = [
    proj.dtp_assigned_to,
    proj.dtp_assignees,
    proj.editing_assigned_to,
    proj.editing_assignees,
    proj.cover_assigned_to,
    proj.cover_assignees,
    proj.isbn_assigned_to,
    proj.isbn_assignees,
    proj.proof_assigned_to,
    proj.proof_assignees,
  ].filter(Boolean).join(",");

  const isAssignedToProject =
    allProjectAssignees.includes(user.id) ||
    allProjectAssignees.includes(user.name);

  if (!isOwner && !isAssignedToProject) {
    notFound();
  }

  const [contract, activeUsers] = await Promise.all([
    prisma.contracts.findFirst({
      where: { title_id: proj.title_id },
    }),
    prisma.users.findMany({
      where: {
        active: true,
        role: { not: "author" },
      },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const contractMeta = parseContractNotes(contract?.term_notes);
  const publishingType = contractMeta.publishing_type ?? "kairali_funded";
  const contractFreeCopies = contractMeta.free_copies ?? 10;

  // Determine active stage assignees
  let activeAssigneesStr: string | null = null;
  let activeAssigneeId: string | null = null;
  if (proj.status === "dtp") {
    activeAssigneeId = proj.dtp_assigned_to;
    activeAssigneesStr = proj.dtp_assignees;
  } else if (proj.status === "editing") {
    activeAssigneeId = proj.editing_assigned_to;
    activeAssigneesStr = proj.editing_assignees;
  } else if (proj.status === "cover_design") {
    activeAssigneeId = proj.cover_assigned_to;
    activeAssigneesStr = proj.cover_assignees;
  } else if (proj.status === "isbn_registration") {
    activeAssigneeId = proj.isbn_assigned_to;
    activeAssigneesStr = proj.isbn_assignees;
  } else if (proj.status === "final_proof") {
    activeAssigneeId = proj.proof_assigned_to;
    activeAssigneesStr = proj.proof_assignees;
  }

  const activeAssigneeList = activeAssigneesStr
    ? activeAssigneesStr.split(",").map((s) => s.trim()).filter(Boolean)
    : activeAssigneeId ? [activeAssigneeId] : [];

  const isAssignee = activeAssigneeList.includes(user.id) || activeAssigneeList.includes(user.name);
  const canAdvance = isAssignee || isOwner;

  // Financial estimations (for managers)
  const mrp = proj.titles.mrp_paise;
  const advance = contract?.advance_paise ?? 0;
  const printCost = proj.print_jobs?.cost_paise ?? 0;

  const statusClass = {
    under_contract: "bg-slate-100 text-slate-700 border-slate-300 font-bold",
    dtp: "bg-sky-50 text-sky-800 border-sky-300 font-bold",
    editing: "bg-amber-50 text-amber-800 border-amber-300 font-bold",
    cover_design: "bg-indigo-50 text-indigo-800 border-indigo-300 font-bold",
    isbn_registration: "bg-blue-50 text-blue-800 border-blue-300 font-bold",
    final_proof: "bg-orange-50 text-orange-800 border-orange-300 font-bold",
    printing: "bg-[#faedf5] text-[#7e2562] border-[#7e2562]/35 font-bold",
    post_production: "bg-teal-50 text-teal-800 border-teal-300 font-bold",
    completed: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold shadow-2xs",
    cancelled: "bg-rose-50 text-rose-800 border-rose-300 font-bold",
  }[proj.status] ?? "bg-slate-100 text-slate-700 border-slate-300";

  const statusDot = {
    under_contract: "bg-slate-500",
    dtp: "bg-sky-600",
    editing: "bg-amber-600",
    cover_design: "bg-indigo-600",
    isbn_registration: "bg-blue-600",
    final_proof: "bg-orange-600",
    printing: "bg-[#7e2562]",
    post_production: "bg-teal-600",
    completed: "bg-emerald-600",
    cancelled: "bg-rose-600",
  }[proj.status] ?? "bg-slate-500";

  // Fetch staff names for stages display
  const staffMap = new Map(activeUsers.map((u) => [u.id, u.name]));

  function resolveStaffNames(assignedTo: string | null, assignees?: string | null): string | null {
    const ids = assignees
      ? assignees.split(",").map((s) => s.trim()).filter(Boolean)
      : assignedTo ? [assignedTo] : [];
    if (ids.length === 0) return null;
    const names = ids.map((id) => staffMap.get(id) || "Staff");
    return names.join(", ");
  }

  return (
    <div className="mx-auto max-w-6xl animate-apple-in space-y-6">
      {/* Top Left Back Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/production"
          className="apple-button inline-flex items-center gap-2 rounded-xl border border-[#7e2562]/20 bg-white px-3.5 py-2 text-xs font-bold text-[#7e2562] shadow-2xs hover:bg-[#faedf5] hover:border-[#7e2562]/35 transition-all group"
        >
          <svg className="h-4 w-4 text-[#7e2562] transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Production</span>
        </Link>
      </div>

      {/* Header with Navigation and Status */}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end border-b border-[#7e2562]/10 pb-6">
        <div>
       
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {proj.titles.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Author: <strong>{proj.titles.authors?.name ?? "Unknown Author"}</strong> · ISBN: {proj.titles.isbn || "Pending Registration"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold whitespace-nowrap shadow-2xs ${statusClass}`}>
            <span className={`h-2 w-2 rounded-full ${statusDot}`} />
            {STATUS_LABELS[proj.status] ?? proj.status}
          </span>
        </div>
      </header>

      {/* Main Grid split */}
      <div className="grid gap-6 md:grid-cols-3 items-start">
        {/* Left column: Overview details (Sticky while right column scrolls) */}
        <section className="space-y-6 md:col-span-1 md:sticky md:top-20 md:self-start md:max-h-[calc(100vh-6rem)] md:overflow-y-auto pr-1">
          {/* Task Progress list */}
          <div className="rounded-3xl border border-[#7e2562]/15 bg-white p-6 shadow-plum-sm dark:bg-surface dark:border-white/10">
            {(() => {
              const PIPELINE_ORDER = [
                "under_contract",
                "dtp",
                "editing",
                "cover_design",
                "isbn_registration",
                "final_proof",
                "printing",
                "post_production",
                "completed",
              ];
              const currentStageIdx = PIPELINE_ORDER.indexOf(proj.status);

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
                  substep: !proj.isbn_completed_at && proj.isbn_requested_at
                    ? `Application filed: ${proj.isbn_requested_at.split(" ")[0]}${proj.isbn_request_ref ? ` (Ref: ${proj.isbn_request_ref})` : ""}`
                    : null,
                },
                {
                  key: "final_proof",
                  label: "Author Final Proof",
                  completedAt: proj.proof_approved_at,
                  deadline: proj.proof_deadline,
                  staff: "Author & Owner Sign-Off",
                },
                {
                  key: "printing",
                  label: "Offset Printing Run",
                  completedAt: proj.print_completed_at,
                  deadline: null,
                  staff: null,
                },
                {
                  key: "post_production",
                  label: "Post-Production Intake",
                  completedAt: proj.post_production_completed_at,
                  deadline: null,
                  staff: null,
                },
              ];

              const completedCount = trackerSteps.filter(
                (s) => PIPELINE_ORDER.indexOf(s.key) < currentStageIdx
              ).length;
              const progressPct = Math.min(100, Math.round((completedCount / trackerSteps.length) * 100));

              function getStageActiveDescription(stageKey: string): string {
                switch (stageKey) {
                  case "dtp":
                    return "Typesetting manuscript into print-ready interior layout";
                  case "editing":
                    return "Proofreading galley pages and checking typography";
                  case "cover_design":
                    return "Designing front, spine, and back cover artwork";
                  case "isbn_registration":
                    return proj?.isbn_requested_at
                      ? "Application filed — awaiting official ISBN allocation"
                      : "Preparing and filing official ISBN application";
                  case "final_proof":
                    if (proj?.proof_feedback) {
                      return "Author requested revisions — updating proof files";
                    }
                    if (proj?.proof_email_sent_at) {
                      return "Proof sent to author — awaiting final sign-off";
                    }
                    return "Preparing galley proof copy for author inspection";
                  case "printing":
                    return "Printing run in progress at the press (Offset / Digital)";
                  case "post_production":
                    return "Quality check, stock receipt & author copies dispatch";
                  default:
                    return "Currently in progress";
                }
              }

              return (
                <div className="space-y-4">
                  {/* Header & Progress Indicator */}
                  <div>
                    <div className="flex items-center justify-between">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Pipeline Status
                      </h2>
                      <span className="rounded-full bg-[#faedf5] px-2.5 py-0.5 text-[10px] font-bold text-[#7e2562] dark:bg-[#7e2562]/20 dark:text-pink-300">
                        {completedCount} of {trackerSteps.length} Steps · {progressPct}%
                      </span>
                    </div>
                    {/* Mini Progress Bar */}
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#7e2562] to-emerald-500 transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Steps Timeline */}
                  <div className="space-y-2.5 pt-1">
                    {trackerSteps.map((step, idx) => {
                      const stepIdx = PIPELINE_ORDER.indexOf(step.key);
                      const isCompleted = stepIdx < currentStageIdx;
                      const isCurrent = step.key === proj.status;

                      return (
                        <div
                          key={idx}
                          className={`relative rounded-2xl transition-all ${
                            isCurrent
                              ? "border border-[#7e2562]/25 bg-gradient-to-br from-[#faedf5]/60 to-[#faedf5]/20 p-3.5 shadow-xs dark:from-[#7e2562]/15 dark:to-transparent dark:border-pink-500/30"
                              : "p-2 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Step Status Badge */}
                            <div className="mt-0.5 flex shrink-0 items-center justify-center">
                              {isCompleted ? (
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xs font-bold text-xs">
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                </span>
                              ) : isCurrent ? (
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
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={`text-xs font-bold ${
                                    isCurrent
                                      ? "text-[#7e2562] dark:text-pink-300 text-sm"
                                      : isCompleted
                                      ? "text-foreground font-semibold"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {step.label}
                                </span>

                                {isCompleted && step.completedAt && (
                                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                    {formatIST(step.completedAt, false).split(" ")[0]}
                                  </span>
                                )}
                              </div>

                              {/* Staff & Details */}
                              {step.staff && (
                                <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <svg className="h-3 w-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  <span className="truncate">{step.staff}</span>
                                </div>
                              )}

                              {step.detail && isCompleted && (
                                <span className="mt-0.5 inline-block text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                  ISBN: {step.detail}
                                </span>
                              )}

                              {/* Active Step Live Blinking Status Box */}
                              {isCurrent && (
                                <div className="mt-2 space-y-1.5">
                                  {proj.proof_feedback && step.key === "final_proof" ? (
                                    <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                                      <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                      </span>
                                      <span className="leading-tight">Author Revision Requested — Updating Layout</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 rounded-xl border border-[#7e2562]/20 bg-white/80 px-2.5 py-1.5 text-xs font-bold text-[#7e2562] shadow-2xs dark:bg-surface/90 dark:text-pink-300 dark:border-pink-500/30">
                                      <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7e2562] opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#7e2562]"></span>
                                      </span>
                                      <span className="leading-tight">{getStageActiveDescription(step.key)}</span>
                                    </div>
                                  )}

                                  {step.substep && (
                                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-amber-700 dark:text-amber-300 pl-1">
                                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                      <span>{step.substep}</span>
                                    </div>
                                  )}

                                  {step.deadline && (
                                    <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground pl-1">
                                      <span>Target:</span>
                                      <span className="text-foreground">{step.deadline}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Financial Tracking (Only Owner) */}
          {isOwner && (
            <div className="rounded-xl border border-border bg-surface p-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                Cost & Royalty Tracking
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
                          publishingType === "self_publishing" ? "Self-Publishing" : "Kairali Books Publishing"
                        } · ${contract.basis} basis)`
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

        {/* Right column: Action panel */}
        <section className="space-y-6 md:col-span-2">
          {/* Active Task for Logged-In User */}
          {canAdvance && ["dtp", "editing", "cover_design", "isbn_registration", "final_proof"].includes(proj.status) && (
            <TaskAdvance
              projectId={proj.id}
              status={proj.status}
              isbnRequestedAt={proj.isbn_requested_at}
              isbnRequestRef={proj.isbn_request_ref}
              proofApprovedAt={proj.proof_approved_at}
              proofEmailSentAt={proj.proof_email_sent_at}
              hasLayout={Boolean(proj.final_layout_path)}
            />
          )}

          {/* Uploaded Deliverables Preview */}
          {(proj.final_layout_path || proj.final_cover_path) && (
            <div className="rounded-3xl border border-[#7e2562]/12 bg-white p-6 shadow-plum-sm space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Uploaded Production Deliverables</h3>
              <p className="text-xs text-muted-foreground">
                Inspect uploaded typeset layout drafts and cover artwork in the in-browser viewer.
              </p>
              <ProofPreviewButtons
                projectId={proj.id}
                title={proj.titles.name}
                hasLayout={Boolean(proj.final_layout_path)}
                hasCover={Boolean(proj.final_cover_path)}
              />
            </div>
          )}

          {/* Author Proof review loops detail */}
          {proj.status === "final_proof" && (
            <div className="rounded-3xl border border-[#7e2562]/12 bg-white p-6 shadow-plum-sm">
              <h3 className="text-sm font-semibold mb-2">Final Copy Proofing</h3>
              <p className="text-sm text-muted-foreground mb-4">
                The manuscript layout PDF and cover design artwork have been generated. The project is currently awaiting 
                author review and digital sign-off from their email or portal.
              </p>
              {proj.proof_feedback && (
                <div className="bg-[#faedf5]/40 border border-[#7e2562]/20 rounded-2xl p-4">
                  <h4 className="text-xs font-bold text-[#7e2562] mb-1">Author Revision Feedback Comments</h4>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
                    {proj.proof_feedback}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Printing press run panel */}
          {proj.status === "printing" && (
            <PrintReceiptForm
              projectId={proj.id}
              publishingType={publishingType}
              authorName={proj.titles.authors?.name || "Author"}
              titleName={proj.titles.name}
            />
          )}

          {/* Dedicated Post-Production intake panel */}
          {proj.status === "post_production" && (
            <PostProductionForm
              projectId={proj.id}
              publishingType={publishingType}
              contractFreeCopies={contractFreeCopies}
              authorName={proj.titles.authors?.name || "Author"}
              titleName={proj.titles.name}
              orderedQty={proj.print_jobs?.qty ?? 1000}
            />
          )}

          {/* Completed block details - Post-Production Fulfillment & Channel Matrix */}
          {proj.status === "completed" && (
            <PostProductionDashboard
              projectId={proj.id}
              project={proj}
              title={proj.titles}
              printJob={proj.print_jobs}
              publishingType={publishingType}
            />
          )}

          {/* Schedule Configuration Form (Owner / Admin) */}
          {isOwner && proj.status !== "completed" && proj.status !== "cancelled" && (
            <ScheduleForm project={proj} users={activeUsers} />
          )}
        </section>
      </div>
    </div>
  );
}
