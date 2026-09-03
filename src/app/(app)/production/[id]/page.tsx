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
  printing: "Printing Run",
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

  const isManager = user.role === "owner" || user.role === "accounts";

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
    under_contract: "bg-surface-muted text-muted-foreground border-border",
    dtp: "bg-primary/10 text-primary border-primary/20",
    editing: "bg-warning/10 text-warning border-warning/20",
    cover_design: "bg-accent/10 text-accent border-accent/20",
    isbn_registration: "bg-danger/10 text-danger border-danger/20",
    final_proof: "bg-warning/15 text-warning border-warning/30",
    printing: "bg-success/10 text-success border-success/20",
    completed: "bg-success text-white border-success",
    cancelled: "bg-danger/10 text-danger border-danger/20",
  }[proj.status] ?? "bg-surface-muted text-foreground border-border";

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
    <div className="mx-auto max-w-5xl">
      <nav className="mb-6 text-sm">
        <Link href="/production" className="text-muted-foreground hover:text-foreground">
          ← Back to production projects
        </Link>
      </nav>

      <header className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <span className="numeric text-xs font-semibold text-muted-foreground">
            Production ID: {proj.id.slice(0, 8)}
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{proj.titles.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Author: <strong>{proj.titles.authors?.name ?? "Unknown Author"}</strong> · ISBN: {proj.titles.isbn || "Pending Registration"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${statusClass}`}>
            {STATUS_LABELS[proj.status] ?? proj.status}
          </span>
          <span className="text-xs text-muted-foreground">
            Project initialized {formatIST(proj.created_at)}
          </span>
        </div>
      </header>

      {/* Main Grid split */}
      <div className="grid gap-6 md:grid-cols-3 items-start">
        {/* Left column: Overview details (Sticky while right column scrolls) */}
        <section className="space-y-6 md:col-span-1 md:sticky md:top-20 md:self-start md:max-h-[calc(100vh-6rem)] md:overflow-y-auto pr-1">
          {/* Task Progress list */}
          <div className="rounded-xl border border-border bg-surface p-5">
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
                  "completed",
                ];
                const currentStageIdx = PIPELINE_ORDER.indexOf(proj.status);

                const trackerSteps = [
                  { key: "dtp", label: "DTP / typesetting", completedAt: proj.dtp_completed_at, staff: resolveStaffNames(proj.dtp_assigned_to, proj.dtp_assignees) },
                  { key: "editing", label: "Proofreading & Editing", completedAt: proj.editing_completed_at, staff: resolveStaffNames(proj.editing_assigned_to, proj.editing_assignees) },
                  { key: "cover_design", label: "Cover Design", completedAt: proj.cover_completed_at, staff: resolveStaffNames(proj.cover_assigned_to, proj.cover_assignees) },
                  {
                    key: "isbn_registration",
                    label: "ISBN registration",
                    completedAt: proj.isbn_completed_at,
                    staff: resolveStaffNames(proj.isbn_assigned_to, proj.isbn_assignees),
                    detail: proj.isbn_registered,
                    substep: !proj.isbn_completed_at && proj.isbn_requested_at
                      ? `Request Sent: ${proj.isbn_requested_at.split(" ")[0]}${proj.isbn_request_ref ? ` (Ref: ${proj.isbn_request_ref})` : ""} · Awaiting Allocation`
                      : null,
                  },
                  { key: "final_proof", label: "Final Proof approval", completedAt: proj.proof_approved_at, staff: resolveStaffNames(proj.proof_assigned_to, proj.proof_assignees) },
                  { key: "printing", label: "Print run completion", completedAt: proj.print_completed_at, staff: null },
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
            />
          )}

          {/* Uploaded Deliverables Preview */}
          {(proj.final_layout_path || proj.final_cover_path) && (
            <div className="rounded-xl border border-border bg-surface p-5 space-y-2">
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
            <div className="rounded-xl border border-border bg-surface p-5">
              <h3 className="text-sm font-semibold mb-2">Final Copy Proofing</h3>
              <p className="text-sm text-muted-foreground mb-4">
                The manuscript and cover design files have been uploaded. The project is currently awaiting 
                author review and digital sign-off from their tracking portal.
              </p>
              {proj.proof_feedback && (
                <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
                  <h4 className="text-xs font-semibold text-accent mb-1">Author Revision Feedback Comments</h4>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
                    {proj.proof_feedback}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Printing receipts completion panel */}
          {proj.status === "printing" && (
            <PrintReceiptForm
              projectId={proj.id}
              publishingType={publishingType}
              contractFreeCopies={contractFreeCopies}
              authorName={proj.titles.authors?.name || "Author"}
              titleName={proj.titles.name}
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
