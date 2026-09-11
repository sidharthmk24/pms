import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatIST } from "@/lib/time";
import { formatPaise } from "@/lib/money";
import { parseContractNotes } from "@/lib/contracts";
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

  const [contract, activeUsers] = await Promise.all([
    prisma.contracts.findFirst({
      where: { title_id: proj.title_id },
    }),
    prisma.users.findMany({
      where: { active: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const contractMeta = parseContractNotes(contract?.term_notes);
  const publishingType = contractMeta.publishing_type ?? "kairali_funded";
  const contractFreeCopies = contractMeta.free_copies ?? 10;

  const isManager = user.role === "owner" || user.role === "accounts" || user.role === "production";

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

  const isAssignee = activeAssigneeList.includes(user.id);
  const canAdvance = isAssignee || user.role === "owner" || user.role === "production" || user.role === "editor";

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
          <div className="rounded-3xl border border-[#7e2562]/12 bg-white p-6 shadow-plum-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
              Pipeline Status Tracker
            </h2>
            <div className="space-y-4">
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
                  { key: "dtp", label: "DTP / Typesetting", completedAt: proj.dtp_completed_at, staff: resolveStaffNames(proj.dtp_assigned_to, proj.dtp_assignees) },
                  { key: "editing", label: "Proofreading & Editing", completedAt: proj.editing_completed_at, staff: resolveStaffNames(proj.editing_assigned_to, proj.editing_assignees) },
                  { key: "cover_design", label: "Cover Design", completedAt: proj.cover_completed_at, staff: resolveStaffNames(proj.cover_assigned_to, proj.cover_assignees) },
                  {
                    key: "isbn_registration",
                    label: "ISBN Registration",
                    completedAt: proj.isbn_completed_at,
                    staff: resolveStaffNames(proj.isbn_assigned_to, proj.isbn_assignees),
                    detail: proj.isbn_registered,
                    substep: !proj.isbn_completed_at && proj.isbn_requested_at
                      ? `Request Sent: ${proj.isbn_requested_at.split(" ")[0]}${proj.isbn_request_ref ? ` (Ref: ${proj.isbn_request_ref})` : ""} · Awaiting Allocation`
                      : null,
                  },
                  { key: "final_proof", label: "Author Final Proof", completedAt: proj.proof_approved_at, staff: resolveStaffNames(proj.proof_assigned_to, proj.proof_assignees) },
                  { key: "printing", label: "Offset Printing Run", completedAt: proj.print_completed_at, staff: null },
                  { key: "post_production", label: "Post-Production Intake", completedAt: proj.post_production_completed_at, staff: null },
                ];

                return trackerSteps.map((step, idx) => {
                  const stepIdx = PIPELINE_ORDER.indexOf(step.key);
                  const isCompleted = stepIdx < currentStageIdx;
                  const isCurrent = step.key === proj.status;

                  return (
                    <div key={idx} className="flex gap-3 text-sm">
                      <div className="flex flex-col items-center">
                        <span
                          className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                            isCompleted
                              ? "bg-success text-white shadow-xs"
                              : isCurrent
                              ? "bg-warning text-white ring-4 ring-warning/20 shadow-xs animate-pulse font-extrabold"
                              : "bg-surface-muted text-muted-foreground border border-border"
                          }`}
                        >
                          {isCompleted ? "✓" : idx + 1}
                        </span>
                        {idx < trackerSteps.length - 1 && <div className="w-[1px] bg-border h-8 mt-1" />}
                      </div>
                      <div>
                        <span className={`block font-medium ${isCurrent ? "text-warning font-bold" : "text-foreground"}`}>
                          {step.label}
                        </span>
                        {step.staff && (
                          <span className="block text-[10px] text-muted-foreground">
                            Staff: {step.staff}
                          </span>
                        )}
                        {step.detail && isCompleted && (
                          <span className="block text-[10px] text-success font-semibold">
                            ISBN: {step.detail}
                          </span>
                        )}
                        {step.substep && isCurrent && (
                          <span className="block text-[10px] text-warning font-semibold">
                            🔵 {step.substep}
                          </span>
                        )}
                        {isCompleted ? (
                          <span className="block text-[10px] text-success">
                            Completed: {step.completedAt ? formatIST(step.completedAt, false) : "Done"}
                          </span>
                        ) : isCurrent ? (
                          <span className="block text-[10px] text-warning font-semibold">
                            {proj.proof_feedback ? "🟠 Under Rework / Revision" : "🔵 Current Active Stage"}
                          </span>
                        ) : (
                          <span className="block text-[10px] text-muted-foreground">Pending</span>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Financial Tracking (Only Managers/Accounts) */}
          {isManager && (
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

          {/* Schedule Configuration Form (Managers) */}
          {isManager && proj.status !== "completed" && proj.status !== "cancelled" && (
            <ScheduleForm project={proj} users={activeUsers} />
          )}
        </section>
      </div>
    </div>
  );
}
