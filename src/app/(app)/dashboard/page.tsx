import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatIST } from "@/lib/time";
import { formatPaise, formatPaiseShort } from "@/lib/money";
import StatTile from "@/components/stat-tile";

export const metadata: Metadata = { title: "Dashboard · Kairali PMS" };
export const dynamic = "force-dynamic";

type LowStockRow = { id: string; name: string; name_ml: string | null; stock: number; reorder_level: number };
type StockValueRow = { value: bigint | number | null };

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireUser();
  const { denied } = await searchParams;
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM, UTC

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
  const currentMonthName = new Date().toLocaleString("en-IN", { month: "long", year: "numeric" });

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
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/[0.04] px-3.5 py-1 text-xs font-semibold text-muted-foreground dark:border-white/10 dark:bg-white/[0.06]">
            <span className="h-2 w-2 rounded-full bg-foreground/80" />
            <span>Overview for {currentMonthName}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Good day, {user.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-base font-medium text-muted-foreground">
            Publisher telemetry & inventory management
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/submissions"
            className="apple-button inline-flex items-center gap-2 rounded-xl border border-black/15 bg-surface px-4 py-2.5 text-xs font-bold text-foreground shadow-xs hover:bg-black/5 dark:border-white/15 dark:bg-surface-muted/60 dark:hover:bg-white/10"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Submissions</span>
          </Link>
          <Link
            href="/production"
            className="apple-button inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary-hover"
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
        <div className="flex flex-col justify-between rounded-[24px] border border-black/[0.08] bg-surface/90 p-6 shadow-[0_2px_8px_rgba(0,0,0,0.02)] backdrop-blur-xl dark:border-white/[0.1] dark:bg-surface/80 lg:col-span-2">
          <div>
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-black/[0.04] text-foreground dark:bg-white/[0.06]">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight text-foreground">Reorder Soon</h2>
                  <p className="text-xs font-medium text-muted-foreground">Titles at or below safety stock threshold</p>
                </div>
              </div>
              <span className="rounded-full bg-black/[0.05] px-3 py-1 text-xs font-bold text-muted-foreground dark:bg-white/[0.08]">
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

        {/* Recent Activity Timeline */}
        <div className="flex flex-col justify-between rounded-[24px] border border-black/[0.08] bg-surface/90 p-6 shadow-[0_2px_8px_rgba(0,0,0,0.02)] backdrop-blur-xl dark:border-white/[0.1] dark:bg-surface/80">
          <div>
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-black/[0.04] text-foreground dark:bg-white/[0.06]">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight text-foreground">Recent Activity</h2>
                  <p className="text-xs font-medium text-muted-foreground">Audit telemetry & system log</p>
                </div>
              </div>
            </div>

            {recent.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No events recorded yet.</p>
            ) : (
              <div className="relative space-y-4 before:absolute before:bottom-2 before:left-[13px] before:top-2 before:w-[1px] before:bg-black/[0.08] dark:before:bg-white/[0.1]">
                {recent.map((row) => (
                  <div key={row.id} className="relative flex items-start gap-3 pl-1">
                    <span className="relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-foreground ring-4 ring-surface" />
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
      <footer className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-black/[0.08] bg-surface/80 px-6 py-4 text-sm text-muted-foreground backdrop-blur-md dark:border-white/[0.1] dark:bg-surface-muted/50 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/70" />
          <span>
            Catalogue: <strong className="font-bold text-foreground">{activeTitles}</strong> active titles across{" "}
            <strong className="font-bold text-foreground">{authorCount}</strong> author(s)
          </span>
        </div>
        <div>
          Inventory valuation: <strong className="numeric font-bold text-foreground">{formatPaise(inventoryValue)}</strong>
        </div>
      </footer>
    </div>
  );
}

