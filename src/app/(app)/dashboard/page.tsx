import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatIST } from "@/lib/time";
import { formatPaise, formatPaiseShort } from "@/lib/money";
import { hasRole, parseUserRoles, ROLE_LABEL } from "@/lib/roles";
import StatTile from "@/components/stat-tile";

export const metadata: Metadata = { title: "Dashboard · Kairali PMS" };
export const dynamic = "force-dynamic";

type LowStockRow = { id: string; name: string; name_ml: string | null; stock: number; reorder_level: number };
type StockValueRow = { value: bigint | number | null };

const STATUS_LABELS: Record<string, string> = {
  under_contract: "Under Contract",
  dtp: "DTP (Typesetting)",
  editing: "Editing & Proofreading",
  cover_design: "Cover Design",
  isbn_registration: "ISBN Registration",
  final_proof: "Author Final Proof",
  printing: "Printing Run",
  post_production: "Post-Production Intake",
  completed: "Completed / Live",
  cancelled: "Cancelled",
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  under_contract: "bg-slate-100 text-slate-700 border border-slate-300 font-bold",
  dtp: "bg-sky-50 text-sky-800 border border-sky-300 font-bold",
  editing: "bg-amber-50 text-amber-800 border border-amber-300 font-bold",
  cover_design: "bg-pink-50 text-pink-800 border border-pink-300 font-bold",
  isbn_registration: "bg-blue-50 text-blue-800 border border-blue-300 font-bold",
  final_proof: "bg-orange-50 text-orange-800 border border-orange-300 font-bold",
  printing: "bg-[#faedf5] text-[#7e2562] border border-[#7e2562]/35 font-bold",
  post_production: "bg-teal-50 text-teal-800 border border-teal-300 font-bold",
  completed: "bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold shadow-2xs",
  cancelled: "bg-rose-50 text-rose-800 border border-rose-300 font-bold",
};

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireUser();
  if (user.role === "author") {
    redirect("/author");
  }
  const { denied } = await searchParams;
  const userRoles = parseUserRoles(user.role);
  const isOwner = hasRole(user.role, "owner");
  const isEditor = !isOwner && userRoles.includes("editor");
  const isDesigner = !isOwner && !isEditor && userRoles.includes("designer");
  const isDtp = !isOwner && !isEditor && !isDesigner && userRoles.includes("dtp");
  const isProofreader = !isOwner && !isEditor && !isDesigner && !isDtp && userRoles.includes("proofreader");
  const isIsbn = !isOwner && !isEditor && !isDesigner && !isDtp && !isProofreader && userRoles.includes("isbn");
  const isProduction = !isOwner && !isEditor && !isDesigner && !isDtp && !isProofreader && !isIsbn && userRoles.includes("production");
  const isAccounts = !isOwner && !isEditor && !isDesigner && !isDtp && !isProofreader && !isIsbn && !isProduction && userRoles.includes("accounts");
  const isStore = !isOwner && !isEditor && !isDesigner && !isDtp && !isProofreader && !isIsbn && !isProduction && !isAccounts && userRoles.includes("store");

  const month = new Date().toISOString().slice(0, 7); // YYYY-MM, UTC
  const firstName = user.name.split(" ")[0];

  // ==========================================
  // 1. OWNER DASHBOARD
  // ==========================================
  if (isOwner) {
    const [activeTitles, authorCount, lowStock, stockValue, monthSales, monthReturns, pendingJobs, recent] =
      await Promise.all([
        prisma.titles.count({ where: { status: "active" } }),
        prisma.authors.count(),
        prisma.$queryRaw<LowStockRow[]>`
          SELECT id, name, name_ml, stock, reorder_level
          FROM titles
          WHERE status = 'active' AND stock <= reorder_level
          ORDER BY (stock - reorder_level) ASC, name ASC
          LIMIT 8`,
        prisma.$queryRaw<StockValueRow[]>`
          SELECT COALESCE(SUM(stock::bigint * unit_cost_paise::bigint), 0) AS value
          FROM titles WHERE status = 'active'`,
        prisma.sales.aggregate({
          _sum: { total_paise: true },
          _count: true,
          where: { type: "sale", sold_on: { startsWith: month } },
        }),
        prisma.sales.aggregate({
          _sum: { total_paise: true },
          where: { type: "return", sold_on: { startsWith: month } },
        }),
        prisma.print_jobs.count({ where: { status: { in: ["pending", "printing"] } } }),
        prisma.audit_log.findMany({
          orderBy: { at: "desc" },
          take: 8,
          select: { id: true, action: true, entity: true, at: true, users: { select: { name: true } } },
        }),
      ]);

    const grossSales = monthSales._sum.total_paise ?? 0;
    const returns = monthReturns._sum.total_paise ?? 0;
    const netSales = grossSales - returns;
    const inventoryValue = Number(stockValue[0]?.value ?? 0);

    return (
      <div className="mx-auto max-w-6xl animate-apple-in space-y-7">
        {typeof denied === "string" && (
          <div
            role="alert"
            className="flex items-center gap-2.5 rounded-2xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm font-medium text-warning"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Your role does not have access to that section.</span>
          </div>
        )}

        {/* Hero Welcome Header */}
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
          
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Good day, {firstName}
            </h1>
            <p className="mt-1 text-base font-medium text-muted-foreground">
              Comprehensive telemetry, system audit logs &amp; inventory control
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/submissions"
              className="apple-button inline-flex items-center gap-2 rounded-xl border border-[#7e2562]/20 bg-white px-4 py-2.5 text-xs font-bold text-[#7e2562] shadow-2xs hover:bg-[#faedf5]"
            >
              <svg className="h-4 w-4 text-[#7e2562]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Submissions</span>
            </Link>
            <Link
              href="/production"
              className="apple-button inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-plum-sm hover:bg-primary-hover"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>Production</span>
            </Link>
          </div>
        </header>

        {/* KPI Stats Grid */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Net sales"
            value={formatPaiseShort(netSales)}
            hint={`${monthSales._count} invoice(s)${returns > 0 ? ` · ${formatPaiseShort(returns)} returned` : ""}`}
            tone="primary"
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatTile
            label="Inventory value"
            value={formatPaiseShort(inventoryValue)}
            hint="At unit cost, active titles"
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
          />
          <StatTile
            label="Low stock"
            value={String(lowStock.length)}
            hint={lowStock.length > 0 ? "Action required: reorder" : "All levels healthy"}
            tone={lowStock.length > 0 ? "warning" : "success"}
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
          />
          <StatTile
            label="Print jobs open"
            value={String(pendingJobs)}
            hint="Pending or printing"
            tone="primary"
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            }
          />
        </section>

        {/* Main Content Grid: Reorder Soon + Recent Activity */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Reorder Table Card */}
          <div className="flex flex-col justify-between rounded-3xl border border-[#7e2562]/12 bg-white p-6 shadow-plum-sm lg:col-span-2">
            <div>
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7e2562]/8 text-[#7e2562]">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-bold tracking-tight text-foreground">Reorder Soon</h2>
                    <p className="text-xs font-medium text-muted-foreground">Titles at or below safety stock threshold</p>
                  </div>
                </div>
                <span className="rounded-full bg-[#7e2562]/8 px-3 py-1 text-xs font-bold text-[#7e2562]">
                  {lowStock.length} items
                </span>
              </div>

              {lowStock.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-black/[0.04] dark:bg-white/[0.06]">
                    <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-base font-bold text-foreground">Inventory levels optimal</p>
                  <p className="mt-1 text-xs text-muted-foreground">Every active title is above its reorder point.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-base">
                    <thead>
                      <tr className="border-b border-black/[0.08] text-left text-xs font-bold uppercase tracking-wider text-muted-foreground dark:border-white/[0.1]">
                        <th className="pb-3 pt-1">Title</th>
                        <th className="pb-3 pt-1 text-right">Current</th>
                        <th className="pb-3 pt-1 text-right">Reorder Level</th>
                        <th className="pb-3 pt-1 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                      {lowStock.map((t) => (
                        <tr key={t.id} className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                          <td className="py-3.5 pr-4">
                            <span className="font-bold text-foreground">{t.name}</span>
                            {t.name_ml && (
                              <span className="font-ml block text-xs font-medium text-muted-foreground">
                                {t.name_ml}
                              </span>
                            )}
                          </td>
                          <td className="numeric py-3.5 text-right font-bold text-warning">
                            {t.stock}
                          </td>
                          <td className="numeric py-3.5 text-right font-medium text-muted-foreground">
                            {t.reorder_level}
                          </td>
                          <td className="py-3.5 text-right">
                            <span className="inline-flex rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-bold text-warning border border-warning/20">
                              Low
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity Timeline (Owner Only) */}
          <div className="flex flex-col justify-between rounded-3xl border border-[#7e2562]/12 bg-white p-6 shadow-plum-sm">
            <div>
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7e2562]/8 text-[#7e2562]">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-bold tracking-tight text-foreground">Recent Activity</h2>
                    <p className="text-xs font-medium text-muted-foreground">System audit telemetry</p>
                  </div>
                </div>
                <Link
                  href="/activity"
                  className="apple-button inline-flex items-center gap-1.5 rounded-xl border border-[#7e2562]/20 bg-[#faedf5]/80 px-3 py-1.5 text-xs font-bold text-[#7e2562] transition-colors hover:bg-[#faedf5]"
                >
                  <span>View all</span>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              {recent.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No events recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {recent.map((row) => (
                    <div key={row.id} className="relative flex items-start gap-3 pl-1">
                      <span className="relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#7e2562] ring-4 ring-[#faedf5]" />
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="font-bold text-foreground truncate">
                          {row.users?.name ?? "System"}{" "}
                          <span className="font-medium text-muted-foreground">
                            · {row.action.replace(/_/g, " ")}
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                          {formatIST(row.at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Catalogue Insights Footer Bar */}
        {/* <footer className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-[#7e2562]/15 bg-[#faf6f9] px-6 py-4 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#7e2562]" />
            <span>
              Catalogue: <strong className="font-bold text-foreground">{activeTitles}</strong> active titles across{" "}
              <strong className="font-bold text-foreground">{authorCount}</strong> author(s)
            </span>
          </div>
          <div>
            Inventory valuation: <strong className="numeric font-bold text-[#7e2562]">{formatPaise(inventoryValue)}</strong>
          </div>
        </footer> */}
      </div>
    );
  }

  // ==========================================
  // 2. EDITOR DASHBOARD
  // ==========================================
  if (isEditor) {
    const [assignedProjects, pendingSubmissions, acceptedSubmissionsCount, activeEditorialCount] =
      await Promise.all([
        prisma.production_projects.findMany({
          where: {
            OR: [
              { editing_assigned_to: user.id },
              { editing_assigned_to: user.name },
              { editing_assignees: { contains: user.id } },
              { editing_assignees: { contains: user.name } },
            ],
          },
          include: {
            titles: {
              include: {
                authors: { select: { name: true, name_ml: true } },
              },
            },
          },
          orderBy: { updated_at: "desc" },
        }),
        prisma.submissions.findMany({
          where: {
            reviewed_by: user.id,
            status: { in: ["under_review", "new", "pending_review", "needs_revision"] },
          },
          include: {
            users: { select: { name: true } },
          },
          orderBy: { submitted_at: "desc" },
          take: 6,
        }),
        prisma.submissions.count({ where: { reviewed_by: user.id, status: "accepted" } }),
        prisma.production_projects.count({
          where: {
            status: { in: ["editing", "final_proof"] },
            OR: [
              { editing_assigned_to: user.id },
              { editing_assigned_to: user.name },
              { editing_assignees: { contains: user.id } },
              { editing_assignees: { contains: user.name } },
            ],
          },
        }),
      ]);

    return (
      <div className="mx-auto max-w-6xl animate-apple-in space-y-7">
        {/* Welcome Header */}
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
          
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Good day, {firstName}
            </h1>
            <p className="mt-1 text-base font-medium text-muted-foreground">
              Manuscript assessments, editorial assignments &amp; review milestones
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/submissions"
              className="apple-button inline-flex items-center gap-2 rounded-xl border border-[#7e2562]/20 bg-white px-4 py-2.5 text-xs font-bold text-[#7e2562] shadow-2xs hover:bg-[#faedf5]"
            >
              <svg className="h-4 w-4 text-[#7e2562]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Submissions Queue</span>
            </Link>
            <Link
              href="/production"
              className="apple-button inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-plum-sm hover:bg-primary-hover"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>Production Pipeline</span>
            </Link>
          </div>
        </header>

        {/* KPI Stats Grid */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Assigned Books"
            value={String(assignedProjects.length)}
            hint="Assigned to your editorial desk"
            tone="primary"
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            }
          />
          <StatTile
            label="Submissions In Review"
            value={String(pendingSubmissions.length)}
            hint="Manuscripts awaiting decision"
            tone={pendingSubmissions.length > 0 ? "warning" : "success"}
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />
          <StatTile
            label="Active In Editorial"
            value={String(activeEditorialCount)}
            hint="Editing or proofing in-progress"
            tone="primary"
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            }
          />
          <StatTile
            label="Accepted Manuscripts"
            value={String(acceptedSubmissionsCount)}
            hint="Approved for publication"
            tone="success"
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </section>

        {/* Content Section: My Assigned Books & Submissions Queue */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left (2 cols): My Assigned Books Only */}
          <div className="flex flex-col justify-between rounded-3xl border border-[#7e2562]/12 bg-white p-6 shadow-plum-sm lg:col-span-2">
            <div>
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7e2562]/8 text-[#7e2562]">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-bold tracking-tight text-foreground">My Assigned Books</h2>
                    <p className="text-xs font-medium text-muted-foreground">Titles assigned to you for editorial review &amp; proofing</p>
                  </div>
                </div>
                <span className="rounded-full bg-[#7e2562]/8 px-3 py-1 text-xs font-bold text-[#7e2562]">
                  {assignedProjects.length} books
                </span>
              </div>

              {assignedProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-black/[0.04] dark:bg-white/[0.06]">
                    <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <p className="text-base font-bold text-foreground">No books currently assigned</p>
                  <p className="mt-1 text-xs text-muted-foreground">When production titles are scheduled to your desk, they will appear here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-black/[0.08] text-left font-bold uppercase tracking-wider text-muted-foreground dark:border-white/[0.1]">
                        <th className="pb-3 pt-1">Book Title</th>
                        <th className="pb-3 pt-1">Author</th>
                        <th className="pb-3 pt-1">Current Stage</th>
                        <th className="pb-3 pt-1">Deadline</th>
                        <th className="pb-3 pt-1 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                      {assignedProjects.map((proj) => (
                        <tr key={proj.id} className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                          <td className="py-3.5 pr-3">
                            <span className="font-bold text-foreground block">{proj.titles.name}</span>
                            {proj.titles.name_ml && (
                              <span className="font-ml text-[11px] text-muted-foreground block">{proj.titles.name_ml}</span>
                            )}
                          </td>
                          <td className="py-3.5 pr-3 text-muted-foreground font-medium">
                            {proj.titles.authors?.name || "Unassigned"}
                          </td>
                          <td className="py-3.5 pr-3">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_BADGE_STYLES[proj.status] || "bg-gray-100 text-gray-700"}`}>
                              {STATUS_LABELS[proj.status] || proj.status}
                            </span>
                          </td>
                          <td className="py-3.5 pr-3 text-muted-foreground">
                            {proj.editing_deadline ? formatIST(proj.editing_deadline, false) : "No deadline"}
                          </td>
                          <td className="py-3.5 text-right">
                            <Link
                              href={`/production/${proj.id}`}
                              className="apple-button inline-flex items-center gap-1 rounded-lg border border-[#7e2562]/20 bg-[#faedf5]/40 px-2.5 py-1 text-xs font-bold text-[#7e2562] hover:bg-[#7e2562] hover:text-white transition-all"
                            >
                              <span>Open Project</span>
                              <span>&rarr;</span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right (1 col): Submissions Queue */}
          <div className="flex flex-col justify-between rounded-3xl border border-[#7e2562]/12 bg-white p-6 shadow-plum-sm">
            <div>
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-bold tracking-tight text-foreground">Submissions Review</h2>
                    <p className="text-xs font-medium text-muted-foreground">Manuscripts awaiting evaluation</p>
                  </div>
                </div>
                <Link
                  href="/submissions"
                  className="apple-button inline-flex items-center gap-1 rounded-xl border border-[#7e2562]/20 bg-[#faedf5]/80 px-2.5 py-1 text-xs font-bold text-[#7e2562] hover:bg-[#faedf5]"
                >
                  <span>View all</span>
                </Link>
              </div>

              {pendingSubmissions.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No submissions in queue.</p>
              ) : (
                <div className="space-y-3">
                  {pendingSubmissions.map((s) => (
                    <div key={s.id} className="rounded-xl border border-border bg-[#faf6f9]/40 p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1 text-xs">
                        <p className="font-bold text-foreground truncate">{s.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{s.author_name} · <span className="capitalize">{s.genre}</span></p>
                      </div>
                      <Link
                        href={`/submissions?status=all&q=${encodeURIComponent(s.ref_no)}`}
                        className="apple-button shrink-0 rounded-lg border border-[#7e2562]/20 bg-white px-2 py-1 text-[11px] font-bold text-[#7e2562] hover:bg-[#7e2562] hover:text-white transition-all"
                      >
                        Review &rarr;
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Footer info */}
        <footer className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-[#7e2562]/15 bg-[#faf6f9] px-6 py-4 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            <span>
              Editorial Desk: <strong className="font-bold text-foreground">{assignedProjects.length}</strong> assigned title(s) ·{" "}
              <strong className="font-bold text-foreground">{pendingSubmissions.length}</strong> submission(s) pending evaluation
            </span>
          </div>
          <Link href="/production" className="text-xs font-bold text-[#7e2562] hover:underline">
            Go to Production Pipeline &rarr;
          </Link>
        </footer>
      </div>
    );
  }

  // ==========================================
  // 3. COVER DESIGNER DASHBOARD
  // ==========================================
  if (isDesigner) {
    const designerProjects = await prisma.production_projects.findMany({
      where: {
        OR: [
          { cover_assigned_to: user.id },
          { cover_assigned_to: user.name },
          { cover_assignees: { contains: user.id } },
          { cover_assignees: { contains: user.name } },
          { status: "cover_design" },
        ],
      },
      include: {
        titles: {
          include: { authors: { select: { name: true } } },
        },
      },
      orderBy: { updated_at: "desc" },
    });

    const activeCoverCount = designerProjects.filter((p) => p.status === "cover_design").length;
    const readyCoverCount = designerProjects.filter((p) => Boolean(p.final_cover_path)).length;

    return (
      <div className="mx-auto max-w-6xl animate-apple-in space-y-7">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-pink-500/20 bg-pink-500/10 px-3 py-0.5 text-xs font-bold text-pink-700 dark:text-pink-300">
              <span className="h-2 w-2 rounded-full bg-pink-500" />
              <span>Cover Design Studio</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Good day, {firstName}
            </h1>
            <p className="mt-1 text-base font-medium text-muted-foreground">
              Book jacket artwork, front/back cover typography &amp; design deliverables
            </p>
          </div>
          <Link
            href="/production"
            className="apple-button inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-plum-sm hover:bg-primary-hover"
          >
            <span>Production Projects</span>
          </Link>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatTile
            label="Assigned Cover Projects"
            value={String(designerProjects.length)}
            hint="Assigned to your design desk"
            tone="primary"
          />
          <StatTile
            label="Awaiting Cover Art"
            value={String(activeCoverCount)}
            hint="Currently in cover design stage"
            tone={activeCoverCount > 0 ? "warning" : "success"}
          />
          <StatTile
            label="Covers Ready / Uploaded"
            value={String(readyCoverCount)}
            hint="Final book covers delivered"
            tone="success"
          />
        </section>

        <div className="rounded-3xl border border-[#7e2562]/12 bg-white p-6 shadow-plum-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">My Cover Design Tasks</h2>
            <span className="rounded-full bg-[#7e2562]/8 px-3 py-1 text-xs font-bold text-[#7e2562]">
              {designerProjects.length} titles
            </span>
          </div>
          {designerProjects.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No cover design projects assigned yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-black/[0.08] text-left font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="pb-3 pt-1">Book Title</th>
                    <th className="pb-3 pt-1">Author</th>
                    <th className="pb-3 pt-1">Deadline</th>
                    <th className="pb-3 pt-1">Cover Status</th>
                    <th className="pb-3 pt-1 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.05]">
                  {designerProjects.map((p) => (
                    <tr key={p.id} className="hover:bg-black/[0.02]">
                      <td className="py-3.5 pr-3 font-bold text-foreground">{p.titles.name}</td>
                      <td className="py-3.5 pr-3 text-muted-foreground">{p.titles.authors?.name || "Unassigned"}</td>
                      <td className="py-3.5 pr-3 text-muted-foreground">{p.cover_deadline ? formatIST(p.cover_deadline, false) : "No deadline"}</td>
                      <td className="py-3.5 pr-3">
                        {p.final_cover_path ? (
                          <span className="inline-flex rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 font-bold border border-emerald-300">
                            Cover Ready
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 font-bold border border-amber-300">
                            Artwork Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 text-right">
                        <Link
                          href={`/production/${p.id}`}
                          className="apple-button inline-flex items-center gap-1 rounded-lg border border-[#7e2562]/20 bg-[#faedf5]/40 px-2.5 py-1 text-xs font-bold text-[#7e2562] hover:bg-[#7e2562] hover:text-white"
                        >
                          <span>Open &rarr;</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // 4. DTP / TYPESETTER DASHBOARD
  // ==========================================
  if (isDtp) {
    const dtpProjects = await prisma.production_projects.findMany({
      where: {
        OR: [
          { dtp_assigned_to: user.id },
          { dtp_assigned_to: user.name },
          { dtp_assignees: { contains: user.id } },
          { dtp_assignees: { contains: user.name } },
          { status: "dtp" },
        ],
      },
      include: {
        titles: {
          include: { authors: { select: { name: true } } },
        },
      },
      orderBy: { updated_at: "desc" },
    });

    const activeDtpCount = dtpProjects.filter((p) => p.status === "dtp").length;
    const readyLayoutCount = dtpProjects.filter((p) => Boolean(p.final_layout_path)).length;

    return (
      <div className="mx-auto max-w-6xl animate-apple-in space-y-7">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-0.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              <span>DTP &amp; Typesetting Desk</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Good day, {firstName}
            </h1>
            <p className="mt-1 text-base font-medium text-muted-foreground">
              Interior page composition, Malayalam typography &amp; print-ready page layout
            </p>
          </div>
          <Link
            href="/production"
            className="apple-button inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-plum-sm hover:bg-primary-hover"
          >
            <span>Production Projects</span>
          </Link>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatTile
            label="Assigned Layouts"
            value={String(dtpProjects.length)}
            hint="Assigned to your DTP desk"
            tone="primary"
          />
          <StatTile
            label="Awaiting Typesetting"
            value={String(activeDtpCount)}
            hint="Currently in DTP stage"
            tone={activeDtpCount > 0 ? "warning" : "success"}
          />
          <StatTile
            label="Layout PDFs Uploaded"
            value={String(readyLayoutCount)}
            hint="Print PDF layouts ready"
            tone="success"
          />
        </section>

        <div className="rounded-3xl border border-[#7e2562]/12 bg-white p-6 shadow-plum-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">My Typesetting Tasks</h2>
            <span className="rounded-full bg-[#7e2562]/8 px-3 py-1 text-xs font-bold text-[#7e2562]">
              {dtpProjects.length} titles
            </span>
          </div>
          {dtpProjects.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No typesetting projects assigned yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-black/[0.08] text-left font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="pb-3 pt-1">Book Title</th>
                    <th className="pb-3 pt-1">Author</th>
                    <th className="pb-3 pt-1">Deadline</th>
                    <th className="pb-3 pt-1">Layout PDF</th>
                    <th className="pb-3 pt-1 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.05]">
                  {dtpProjects.map((p) => (
                    <tr key={p.id} className="hover:bg-black/[0.02]">
                      <td className="py-3.5 pr-3 font-bold text-foreground">{p.titles.name}</td>
                      <td className="py-3.5 pr-3 text-muted-foreground">{p.titles.authors?.name || "Unassigned"}</td>
                      <td className="py-3.5 pr-3 text-muted-foreground">{p.dtp_deadline ? formatIST(p.dtp_deadline, false) : "No deadline"}</td>
                      <td className="py-3.5 pr-3">
                        {p.final_layout_path ? (
                          <span className="inline-flex rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 font-bold border border-emerald-300">
                            PDF Ready
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 font-bold border border-amber-300">
                            Layout Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 text-right">
                        <Link
                          href={`/production/${p.id}`}
                          className="apple-button inline-flex items-center gap-1 rounded-lg border border-[#7e2562]/20 bg-[#faedf5]/40 px-2.5 py-1 text-xs font-bold text-[#7e2562] hover:bg-[#7e2562] hover:text-white"
                        >
                          <span>Open &rarr;</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // 5. PROOFREADER / ISBN / PRODUCTION / ACCOUNTS / STORE DASHBOARD
  // ==========================================
  const [fallbackProjects, completedProjectsCount, activeTitlesCount] = await Promise.all([
    prisma.production_projects.findMany({
      where: {
        status: { not: "cancelled" },
      },
      include: {
        titles: {
          include: { authors: { select: { name: true } } },
        },
      },
      orderBy: { updated_at: "desc" },
      take: 10,
    }),
    prisma.production_projects.count({ where: { status: "completed" } }),
    prisma.titles.count({ where: { status: "active" } }),
  ]);

  return (
    <div className="mx-auto max-w-6xl animate-apple-in space-y-7">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-0.5 text-xs font-bold text-teal-700 dark:text-teal-300">
            <span className="h-2 w-2 rounded-full bg-teal-500" />
            <span>{ROLE_LABEL[userRoles[0]] || "Staff Workspace"}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Good day, {firstName}
          </h1>
          <p className="mt-1 text-base font-medium text-muted-foreground">
            Operational pipeline tasks &amp; book production queue
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/production"
            className="apple-button inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-plum-sm hover:bg-primary-hover"
          >
            <span>Production Pipeline</span>
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile
          label="Pipeline Tasks"
          value={String(fallbackProjects.length)}
          hint="Active in-progress books"
          tone="primary"
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />
        <StatTile
          label="Completed Titles"
          value={String(completedProjectsCount)}
          hint="Published &amp; delivered"
          tone="success"
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatTile
          label="Catalog Records"
          value={String(activeTitlesCount)}
          hint="Active publication inventory"
          tone="primary"
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          }
        />
      </section>

      <div className="rounded-3xl border border-[#7e2562]/12 bg-white p-6 shadow-plum-sm">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">Production Pipeline Tasks</h2>
          <span className="rounded-full bg-[#7e2562]/8 px-3 py-1 text-xs font-bold text-[#7e2562]">
            {fallbackProjects.length} titles
          </span>
        </div>
        {fallbackProjects.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No active production projects found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-black/[0.08] text-left font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pt-1">Book Title</th>
                  <th className="pb-3 pt-1">Author</th>
                  <th className="pb-3 pt-1">Current Stage</th>
                  <th className="pb-3 pt-1 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05]">
                {fallbackProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-black/[0.02]">
                    <td className="py-3.5 pr-3 font-bold text-foreground">{p.titles.name}</td>
                    <td className="py-3.5 pr-3 text-muted-foreground">{p.titles.authors?.name || "Unassigned"}</td>
                    <td className="py-3.5 pr-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_BADGE_STYLES[p.status] || "bg-gray-100 text-gray-700"}`}>
                        {STATUS_LABELS[p.status] || p.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <Link
                        href={`/production/${p.id}`}
                        className="apple-button inline-flex items-center gap-1 rounded-lg border border-[#7e2562]/20 bg-[#faedf5]/40 px-2.5 py-1 text-xs font-bold text-[#7e2562] hover:bg-[#7e2562] hover:text-white"
                      >
                        <span>Open &rarr;</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
