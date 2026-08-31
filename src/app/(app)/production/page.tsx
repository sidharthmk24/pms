import type { Metadata } from "next";
import Link from "next/link";
import { requireCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatIST } from "@/lib/time";

export const metadata: Metadata = { title: "Production Pipeline · Kairali PMS" };
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

const STATUS_BADGE_STYLES: Record<string, string> = {
  under_contract: "bg-black/[0.04] text-muted-foreground dark:bg-white/[0.06]",
  dtp: "bg-foreground text-background",
  editing: "bg-warning/10 text-warning border border-warning/20",
  cover_design: "bg-black/[0.06] text-foreground border border-black/10 dark:bg-white/[0.08]",
  isbn_registration: "bg-danger/10 text-danger border border-danger/20",
  final_proof: "bg-warning/15 text-warning border border-warning/30",
  printing: "bg-foreground/[0.08] text-foreground border border-foreground/20 font-semibold",
  completed: "bg-foreground text-background font-semibold",
  cancelled: "bg-danger/10 text-danger border border-danger/20",
};

export default async function ProductionListPage() {
  const user = await requireCapability("production_pipeline.read");
  const isManager = user.role === "owner" || user.role === "accounts";

  const whereClause = isManager
    ? {}
    : {
        OR: [
          { AND: [{ status: "dtp" }, { dtp_assigned_to: user.id }] },
          { AND: [{ status: "editing" }, { editing_assigned_to: user.id }] },
          { AND: [{ status: "cover_design" }, { cover_assigned_to: user.id }] },
          { AND: [{ status: "isbn_registration" }, { isbn_assigned_to: user.id }] },
          { AND: [{ status: "final_proof" }, { proof_assigned_to: user.id }] },
        ],
      };

  const projects = await prisma.production_projects.findMany({
    where: whereClause,
    orderBy: { updated_at: "desc" },
    include: {
      titles: {
        select: {
          name: true,
          category: true,
          language: true,
          authors: { select: { name: true } },
        },
      },
    },
  });

  return (
    <div className="mx-auto max-w-6xl animate-apple-in space-y-6">
      {/* Header */}
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/[0.04] px-3.5 py-1 text-xs font-semibold text-muted-foreground dark:border-white/10 dark:bg-white/[0.06]">
            <span className="h-2 w-2 rounded-full bg-foreground/80" />
            <span>Workflow & Pipeline</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Production Pipeline
          </h1>
          <p className="mt-1.5 text-base font-medium text-muted-foreground">
            {isManager
              ? "Track publishing schedules, assignments, and print runs"
              : "Review and complete your active production milestones"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-black/10 bg-surface px-4 py-1.5 text-xs font-bold text-muted-foreground shadow-xs dark:border-white/15 dark:bg-surface-muted/60">
            {projects.length} Active Projects
          </span>
        </div>
      </header>

      {/* Projects Table Card */}
      <section className="overflow-hidden rounded-[24px] border border-black/[0.08] bg-surface/90 shadow-[0_2px_8px_rgba(0,0,0,0.02)] backdrop-blur-xl dark:border-white/[0.1] dark:bg-surface/80">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-black/[0.04] dark:bg-white/[0.06]">
              <svg className="h-7 w-7 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-base font-bold text-foreground">No production projects</p>
            <p className="mt-1 text-sm text-muted-foreground">There are currently no active projects in your pipeline queue.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="border-b border-black/[0.08] bg-black/[0.02] text-left text-xs font-bold uppercase tracking-wider text-muted-foreground dark:border-white/[0.1] dark:bg-white/[0.03]">
                  <th className="px-6 py-4">Book Title</th>
                  <th className="px-6 py-4">Author</th>
                  <th className="px-6 py-4">Active Stage</th>
                  <th className="px-6 py-4">Deadline</th>
                  <th className="px-6 py-4 text-right">Last Updated</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                {projects.map((proj) => {
                  let activeDeadline: string | null = null;
                  if (proj.status === "dtp") activeDeadline = proj.dtp_deadline;
                  else if (proj.status === "editing") activeDeadline = proj.editing_deadline;
                  else if (proj.status === "cover_design") activeDeadline = proj.cover_deadline;
                  else if (proj.status === "isbn_registration") activeDeadline = proj.isbn_deadline;
                  else if (proj.status === "final_proof") activeDeadline = proj.proof_deadline;

                  const isOverdue = activeDeadline && new Date(activeDeadline) < new Date();
                  const statusClass =
                    STATUS_BADGE_STYLES[proj.status] ??
                    "bg-black/[0.05] text-foreground dark:bg-white/[0.08]";

                  return (
                    <tr
                      key={proj.id}
                      className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                    >
                      <td className="px-6 py-4.5">
                        <span className="block font-bold text-foreground">{proj.titles.name}</span>
                        <span className="block text-xs uppercase tracking-wide text-muted-foreground">
                          {proj.titles.category} · {proj.titles.language}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 font-semibold text-foreground">
                        {proj.titles.authors?.name ?? "Unknown Author"}
                      </td>
                      <td className="px-6 py-4.5">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusClass}`}>
                          {STATUS_LABELS[proj.status] ?? proj.status}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-sm font-semibold">
                        {activeDeadline ? (
                          <span
                            className={
                              isOverdue
                                ? "inline-flex items-center gap-1 font-bold text-danger"
                                : "text-foreground"
                            }
                          >
                            {isOverdue && (
                              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            )}
                            {activeDeadline}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/70">No deadline</span>
                        )}
                      </td>
                      <td className="numeric px-6 py-4.5 text-right text-sm font-medium text-muted-foreground">
                        {formatIST(proj.updated_at)}
                      </td>
                      <td className="px-6 py-4.5 text-right">
                        <Link
                          href={`/production/${proj.id}`}
                          className="apple-button inline-flex items-center gap-1.5 rounded-xl border border-black/15 bg-surface px-4 py-2 text-xs font-bold text-foreground shadow-xs hover:bg-black/5 hover:border-black/30 dark:border-white/15 dark:bg-surface-muted/60 dark:hover:bg-white/10"
                        >
                          <span>{isManager ? "Manage" : "Update Tasks"}</span>
                          <svg className="h-3.5 w-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

