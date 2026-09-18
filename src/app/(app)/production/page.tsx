import type { Metadata } from "next";
import Link from "next/link";
import { requireCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatIST, formatTimeIST } from "@/lib/time";
import ProductionFilterBar from "./production-filter-bar";

import { parseUserRoles, hasRole } from "@/lib/roles";

export const metadata: Metadata = { title: "Production Pipeline · Kairali PMS" };
export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  under_contract: "Under Contract",
  dtp: "DTP (Typesetting)",
  editing: "Editing & Proofreading",
  cover_design: "Cover Design",
  isbn_registration: "ISBN Registration",
  final_proof: "Author Final Proof",
  completed: "Completed / Published",
  cancelled: "Cancelled",
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  under_contract: "bg-slate-100 text-slate-700 border border-slate-300 font-bold",
  dtp: "bg-sky-50 text-sky-800 border border-sky-300 font-bold",
  editing: "bg-amber-50 text-amber-800 border border-amber-300 font-bold",
  cover_design: "bg-indigo-50 text-indigo-800 border border-indigo-300 font-bold",
  isbn_registration: "bg-blue-50 text-blue-800 border border-blue-300 font-bold",
  final_proof: "bg-orange-50 text-orange-800 border border-orange-300 font-bold",
  completed: "bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold shadow-2xs",
  cancelled: "bg-rose-50 text-rose-800 border border-rose-300 font-bold",
};

const STATUS_DOT_STYLES: Record<string, string> = {
  under_contract: "bg-slate-500",
  dtp: "bg-sky-600",
  editing: "bg-amber-600",
  cover_design: "bg-indigo-600",
  isbn_registration: "bg-blue-600",
  final_proof: "bg-orange-600",
  completed: "bg-emerald-600",
  cancelled: "bg-rose-600",
};

export default async function ProductionListPage({
  searchParams,
}: PageProps<"/production">) {
  const user = await requireCapability("production_pipeline.read");
  const isOwner = hasRole(user.role, "owner");

  const { status, category, sort } = await searchParams;

  const filterStatus = typeof status === "string" ? status : undefined;
  const filterCategory = typeof category === "string" ? category : undefined;
  const filterSort = typeof sort === "string" ? sort : "updated_desc";

  const baseWhere = isOwner
    ? {}
    : {
        OR: [
          { dtp_assigned_to: user.id },
          { dtp_assigned_to: user.name },
          { dtp_assignees: { contains: user.id } },
          { dtp_assignees: { contains: user.name } },
          { editing_assigned_to: user.id },
          { editing_assigned_to: user.name },
          { editing_assignees: { contains: user.id } },
          { editing_assignees: { contains: user.name } },
          { cover_assigned_to: user.id },
          { cover_assigned_to: user.name },
          { cover_assignees: { contains: user.id } },
          { cover_assignees: { contains: user.name } },
          { isbn_assigned_to: user.id },
          { isbn_assigned_to: user.name },
          { isbn_assignees: { contains: user.id } },
          { isbn_assignees: { contains: user.name } },
          { proof_assigned_to: user.id },
          { proof_assigned_to: user.name },
          { proof_assignees: { contains: user.id } },
          { proof_assignees: { contains: user.name } },
        ],
      };

  const whereClause: any = {
    ...baseWhere,
    ...(filterStatus ? { status: filterStatus } : {}),
    ...(filterCategory ? { titles: { category: filterCategory } } : {}),
  };

  let orderBy: any = { updated_at: "desc" };
  if (filterSort === "updated_asc") {
    orderBy = { updated_at: "asc" };
  } else if (filterSort === "created_desc") {
    orderBy = { created_at: "desc" };
  } else if (filterSort === "created_asc") {
    orderBy = { created_at: "asc" };
  } else if (filterSort === "title_asc") {
    orderBy = { titles: { name: "asc" } };
  } else if (filterSort === "title_desc") {
    orderBy = { titles: { name: "desc" } };
  } else if (filterSort === "author_asc") {
    orderBy = { titles: { authors: { name: "asc" } } };
  } else if (filterSort === "author_desc") {
    orderBy = { titles: { authors: { name: "desc" } } };
  } else if (filterSort === "status_asc") {
    orderBy = { status: "asc" };
  }

  const [projects, categoriesRaw] = await Promise.all([
    prisma.production_projects.findMany({
      where: whereClause,
      orderBy,
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
    }),
    prisma.titles.findMany({
      where: { production_projects: { isNot: null } },
      select: { category: true },
      distinct: ["category"],
    }),
  ]);

  const categories = categoriesRaw
    .map((c) => c.category)
    .filter((c): c is string => Boolean(c && c.trim()))
    .sort();

  return (
    <div className="mx-auto max-w-6xl animate-apple-in space-y-6">
      {/* Header */}
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Production Flow
          </h1>
          <p className="mt-1.5 text-base text-muted-foreground">
            {isOwner
              ? "Track publishing schedules, assignments, and print runs across all titles"
              : "Books and production milestones assigned to your desk"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-[#7e2562]/20 bg-white px-4 py-1.5 text-xs font-bold text-[#7e2562] shadow-2xs">
            {projects.length} {isOwner ? "Total Books in Pipeline" : "Assigned Books"}
          </span>
        </div>
      </header>

      {/* Filter Toolbar */}
      <ProductionFilterBar
        statusLabels={STATUS_LABELS}
        categories={categories}
        currentStatus={filterStatus}
        currentCategory={filterCategory}
        currentSort={filterSort}
      />

      {/* Projects Table Card */}
      <section className="relative z-10 overflow-hidden rounded-3xl border border-[#7e2562]/15 bg-white shadow-plum-sm">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7e2562]/8 text-[#7e2562]">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                <tr className="border-b border-[#7e2562]/10 bg-[#faf6f9]/60 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-4 whitespace-nowrap">Book Title</th>
                  <th className="px-6 py-4 whitespace-nowrap">Author</th>
                  <th className="px-6 py-4 whitespace-nowrap">Active Stage</th>
                  <th className="px-6 py-4 whitespace-nowrap">Deadline</th>
                  <th className="px-6 py-4 text-right whitespace-nowrap">Last Updated</th>
                  <th className="px-6 py-4 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#7e2562]/8">
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
                    "bg-slate-100 text-slate-700 border border-slate-300 font-bold";
                  const dotClass =
                    STATUS_DOT_STYLES[proj.status] ?? "bg-slate-500";

                  return (
                    <tr
                      key={proj.id}
                      className="transition-colors hover:bg-[#faf6f9]/50"
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
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap ${statusClass}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
                          {STATUS_LABELS[proj.status] ?? proj.status}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-sm font-semibold whitespace-nowrap">
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
                      <td className="numeric px-6 py-4.5 text-right text-sm whitespace-nowrap">
                        <span className="block font-semibold text-foreground">
                          {formatIST(proj.updated_at, false)}
                        </span>
                        <span className="block text-xs font-medium text-muted-foreground">
                          {formatTimeIST(proj.updated_at)}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-right whitespace-nowrap">
                        <Link
                          href={`/production/${proj.id}`}
                          className="apple-button inline-flex items-center gap-1.5 rounded-xl border border-[#7e2562]/25 bg-white px-3.5 py-1.5 text-xs font-bold text-[#7e2562] shadow-2xs hover:bg-[#7e2562] hover:text-white hover:border-[#7e2562] hover:shadow-plum-sm transition-all group"
                        >
                          <span>{isOwner ? "Manage" : "View / Update"}</span>
                          <svg className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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

