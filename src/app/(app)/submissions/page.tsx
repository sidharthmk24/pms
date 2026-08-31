import type { Metadata } from "next";
import Link from "next/link";
import { requireCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatIST } from "@/lib/time";
import { can } from "@/lib/roles";
import ReassignSelect from "./reassign-select";

export const metadata: Metadata = { title: "Manuscript Submissions · Kairali PMS" };
export const dynamic = "force-dynamic";

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

const STATUS_BADGE_STYLES: Record<string, string> = {
  new: "bg-warning/10 text-warning border border-warning/20",
  pending_review: "bg-warning/10 text-warning border border-warning/20",
  under_review: "bg-warning/10 text-warning border border-warning/20",
  needs_revision: "bg-black/[0.06] text-foreground border border-black/10 dark:bg-white/[0.08] dark:text-foreground",
  accepted: "bg-foreground/[0.08] text-foreground border border-foreground/20 font-semibold",
  declined: "bg-danger/10 text-danger border border-danger/20",
  archived: "bg-black/[0.04] text-muted-foreground dark:bg-white/[0.05]",
  withdrawn: "bg-black/[0.04] text-muted-foreground dark:bg-white/[0.05]",
};

const GENRE_LABELS: Record<string, string> = {
  novel: "Novel",
  short_stories: "Short Stories",
  poetry: "Poetry",
  essays: "Essays / Non-Fiction",
  biography: "Biography / Memoir",
  childrens: "Children's Literature",
  translation: "Translation",
  drama: "Drama",
  travelogue: "Travelogue",
  academic: "Academic / Reference",
  other: "Other",
};

export default async function SubmissionsListPage({ searchParams }: PageProps<"/submissions">) {
  const user = await requireCapability("submissions.read");
  const isManager = can(user.role, "submissions.manage");

  const { status, editor } = await searchParams;

  const filterStatus = typeof status === "string" ? status : undefined;
  const filterEditor = typeof editor === "string" ? editor : undefined;

  const [submissions, activeUsers] = await Promise.all([
    prisma.submissions.findMany({
      where: {
        ...(filterStatus ? { status: filterStatus } : {}),
        ...(filterEditor ? { reviewed_by: filterEditor } : {}),
      },
      orderBy: { submitted_at: "desc" },
      include: {
        users: { select: { name: true } },
      },
    }),
    prisma.users.findMany({
      where: { active: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl animate-apple-in space-y-6">
      {/* Header */}
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/[0.04] px-3.5 py-1 text-xs font-semibold text-muted-foreground dark:border-white/10 dark:bg-white/[0.06]">
            <span className="h-2 w-2 rounded-full bg-foreground/80" />
            <span>Submissions Management</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Manuscript Submissions
          </h1>
          <p className="mt-1.5 text-base font-medium text-muted-foreground">
            Review and evaluate submitted book manuscripts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-black/10 bg-surface px-4 py-1.5 text-xs font-bold text-muted-foreground shadow-xs dark:border-white/15 dark:bg-surface-muted/60">
            {submissions.length} Total Submissions
          </span>
        </div>
      </header>

      {/* Filter Toolbar */}
      <section className="rounded-[22px] border border-black/[0.08] bg-surface/90 p-4.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] backdrop-blur-xl dark:border-white/[0.1] dark:bg-surface/80">
        <form method="GET" action="/submissions" className="flex flex-wrap items-center gap-3.5">
          {/* Status Filter */}
          <div className="relative flex items-center">
            <select
              id="status-filter"
              name="status"
              defaultValue={filterStatus ?? ""}
              aria-label="Filter by status"
              className="apple-button appearance-none rounded-xl border border-black/15 bg-background/90 py-2.5 pl-4 pr-9 text-sm font-semibold text-foreground outline-none transition-colors hover:border-black/30 focus:border-foreground dark:border-white/15 dark:bg-surface-muted/80 dark:hover:border-white/30"
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 flex items-center text-muted-foreground">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Assigned Editor Filter */}
          <div className="relative flex items-center">
            <select
              id="editor-filter"
              name="editor"
              defaultValue={filterEditor ?? ""}
              aria-label="Filter by assigned editor"
              className="apple-button appearance-none rounded-xl border border-black/15 bg-background/90 py-2.5 pl-4 pr-9 text-sm font-semibold text-foreground outline-none transition-colors hover:border-black/30 focus:border-foreground dark:border-white/15 dark:bg-surface-muted/80 dark:hover:border-white/30"
            >
              <option value="">All Editors</option>
              {activeUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 flex items-center text-muted-foreground">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2.5">
            <button
              type="submit"
              className="apple-button inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-xs hover:bg-primary-hover"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Filter</span>
            </button>
            {(filterStatus || filterEditor) && (
              <Link
                href="/submissions"
                className="apple-button inline-flex items-center rounded-xl border border-black/15 bg-surface px-4 py-2.5 text-sm font-semibold text-foreground shadow-xs hover:bg-black/5 dark:border-white/15 dark:bg-surface-muted/60 dark:hover:bg-white/10"
              >
                Clear
              </Link>
            )}
          </div>
        </form>
      </section>

      {/* Submissions Table Card */}
      <section className="overflow-hidden rounded-[24px] border border-black/[0.08] bg-surface/90 shadow-[0_2px_8px_rgba(0,0,0,0.02)] backdrop-blur-xl dark:border-white/[0.1] dark:bg-surface/80">
        {submissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-black/[0.04] dark:bg-white/[0.06]">
              <svg className="h-7 w-7 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-base font-bold text-foreground">No submissions found</p>
            <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters or search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="border-b border-black/[0.08] bg-black/[0.02] text-left text-xs font-bold uppercase tracking-wider text-muted-foreground dark:border-white/[0.1] dark:bg-white/[0.03]">
                  <th className="px-6 py-4">Ref # / Title</th>
                  <th className="px-6 py-4">Author</th>
                  <th className="px-6 py-4">Genre / Lang</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Assigned Editor</th>
                  <th className="px-6 py-4 text-right">Submitted</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                {submissions.map((sub) => {
                  const statusClass =
                    STATUS_BADGE_STYLES[sub.status] ??
                    "bg-black/[0.05] text-foreground dark:bg-white/[0.08]";

                  return (
                    <tr
                      key={sub.id}
                      className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                    >
                      <td className="px-6 py-4.5">
                        <span className="numeric block text-xs font-bold text-muted-foreground">
                          {sub.ref_no}
                        </span>
                        <span className="block text-base font-bold text-foreground">{sub.title}</span>
                      </td>
                      <td className="px-6 py-4.5 font-semibold text-foreground">{sub.author_name}</td>
                      <td className="px-6 py-4.5 text-sm">
                        <span className="font-semibold text-foreground">
                          {GENRE_LABELS[sub.genre] ?? sub.genre}
                        </span>
                        <span className="block text-xs text-muted-foreground">{sub.language}</span>
                      </td>
                      <td className="px-6 py-4.5">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusClass}`}>
                          {STATUS_LABELS[sub.status] ?? sub.status}
                        </span>
                      </td>
                      <td className="px-6 py-4.5">
                        {isManager ? (
                          <ReassignSelect
                            submissionId={sub.id}
                            currentEditorId={sub.reviewed_by}
                            editors={activeUsers}
                          />
                        ) : (
                          <span className="text-sm font-semibold text-foreground">
                            {sub.users?.name ?? "Unassigned"}
                          </span>
                        )}
                      </td>
                      <td className="numeric px-6 py-4.5 text-right text-sm font-medium text-muted-foreground">
                        {formatIST(sub.submitted_at)}
                      </td>
                      <td className="px-6 py-4.5 text-right">
                        <Link
                          href={`/submissions/${sub.id}`}
                          className="apple-button inline-flex items-center gap-1.5 rounded-xl border border-black/15 bg-surface px-4 py-2 text-xs font-bold text-foreground shadow-xs hover:bg-black/5 hover:border-black/30 dark:border-white/15 dark:bg-surface-muted/60 dark:hover:bg-white/10"
                        >
                          <span>Review</span>
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

