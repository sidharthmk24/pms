import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatIST } from "@/lib/time";
import { formatPaise } from "@/lib/money";
import ScheduleForm from "./schedule-form";
import TaskAdvance from "./task-advance";
import PrintReceiptForm from "./print-receipt-form";

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

  const isManager = user.role === "owner" || user.role === "accounts";

  // Determine active stage assignee
  let activeAssigneeId: string | null = null;
  if (proj.status === "dtp") activeAssigneeId = proj.dtp_assigned_to;
  else if (proj.status === "editing") activeAssigneeId = proj.editing_assigned_to;
  else if (proj.status === "cover_design") activeAssigneeId = proj.cover_assigned_to;
  else if (proj.status === "isbn_registration") activeAssigneeId = proj.isbn_assigned_to;
  else if (proj.status === "final_proof") activeAssigneeId = proj.proof_assigned_to;

  const isAssignee = activeAssigneeId === user.id;
  const canAdvance = isAssignee || user.role === "owner";

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
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left column: Overview details */}
        <section className="space-y-6 md:col-span-1">
          {/* Task Progress list */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
              Pipeline Status Tracker
            </h2>
            <div className="space-y-4">
              {[
                { label: "DTP / typesetting", completed: proj.dtp_completed_at, staff: proj.dtp_assigned_to },
                { label: "Proofreading & Editing", completed: proj.editing_completed_at, staff: proj.editing_assigned_to },
                { label: "Cover Design", completed: proj.cover_completed_at, staff: proj.cover_assigned_to },
                { label: "ISBN registration", completed: proj.isbn_completed_at, staff: proj.isbn_assigned_to, detail: proj.isbn_registered },
                { label: "Final Proof approval", completed: proj.proof_approved_at, staff: proj.proof_assigned_to },
                { label: "Print run completion", completed: proj.print_completed_at, staff: null },
              ].map((step, idx) => (
                <div key={idx} className="flex gap-3 text-sm">
                  <div className="flex flex-col items-center">
                    <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      step.completed ? "bg-success text-white" : "bg-surface-muted text-muted-foreground border border-border"
                    }`}>
                      {step.completed ? "✓" : idx + 1}
                    </span>
                    {idx < 5 && <div className="w-[1px] bg-border h-8 mt-1" />}
                  </div>
                  <div>
                    <span className="block font-medium text-foreground">{step.label}</span>
                    {step.staff && (
                      <span className="block text-[10px] text-muted-foreground">
                        Staff: {staffMap.get(step.staff) ?? "Unknown"}
                      </span>
                    )}
                    {step.detail && (
                      <span className="block text-[10px] text-success font-semibold">
                        ISBN: {step.detail}
                      </span>
                    )}
                    {step.completed ? (
                      <span className="block text-[10px] text-success">
                        Completed: {formatIST(step.completed, false)}
                      </span>
                    ) : (
                      <span className="block text-[10px] text-muted-foreground">Pending</span>
                    )}
                  </div>
                </div>
              ))}
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
                    {contract ? `${contract.royalty_pct}% (${contract.basis} basis)` : "No contract linked"}
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
          {canAdvance && ["dtp", "editing", "cover_design", "isbn_registration"].includes(proj.status) && (
            <TaskAdvance projectId={proj.id} status={proj.status} />
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
            <PrintReceiptForm projectId={proj.id} printJob={proj.print_jobs} />
          )}

          {/* Completed block details */}
          {proj.status === "completed" && (
            <div className="rounded-xl border border-success/20 bg-success/5 p-5 text-success space-y-2">
              <h3 className="text-base font-semibold">Project Completed Successfully</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This project has completed all stages. The book has been fully cataloged with its ISBN 
                and printed inventory is now live in the PMS warehouse.
              </p>
            </div>
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
