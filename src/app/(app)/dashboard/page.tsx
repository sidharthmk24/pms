import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatIST } from "@/lib/time";
import { formatPaise, formatPaiseShort } from "@/lib/money";
import { hasRole, parseUserRoles, ROLE_LABEL } from "@/lib/roles";
import StatTile from "@/components/stat-tile";
import ArrowRight from "@/components/ui/arrow-right";

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

import ManagerPipelineClient, {
  PipelineItem,
  EditorWorkload,
  ActivityItem,
} from "./manager-pipeline-client";
import { parseStamp } from "@/lib/time";

function calculateDaysInStage(dateStr: string | null | undefined): number {
  if (!dateStr) return 1;
  try {
    const d = dateStr.length <= 10 ? new Date(`${dateStr}T00:00:00Z`) : parseStamp(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  } catch {
    return 1;
  }
}

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
  const isProduction = !isOwner && !isEditor && !isDesigner && userRoles.includes("production");

  const month = new Date().toISOString().slice(0, 7); // YYYY-MM, UTC
  const firstName = user.name.split(" ")[0];

  // ==========================================
  // 1. OWNER / EXECUTIVE PIPELINE DASHBOARD
  // ==========================================
  if (isOwner) {
    const [productionProjects, allCatalogTitles, submissionsList, usersList, recentAudit] = await Promise.all([
      prisma.production_projects.findMany({
        where: {
          status: {
            in: [
              "under_contract",
              "dtp",
              "editing",
              "cover_design",
              "isbn_registration",
              "final_proof",
              "printing",
              "post_production",
            ],
          },
        },
        include: {
          titles: {
            include: {
              authors: true,
              contracts: true,
            },
          },
          print_jobs: true,
        },
        orderBy: { updated_at: "desc" },
      }),
      prisma.titles.findMany({
        select: { id: true, name: true, name_ml: true },
      }),
      prisma.submissions.findMany({
        where: {
          status: { in: ["new", "pending_review", "under_review", "in_review", "reviewed", "accepted", "needs_revision"] },
        },
        include: {
          users: {
            select: { id: true, name: true, role: true },
          },
        },
        orderBy: { submitted_at: "desc" },
      }),
      prisma.users.findMany({
        where: { active: true },
        select: { id: true, name: true, role: true },
      }),
      prisma.audit_log.findMany({
        orderBy: { at: "desc" },
        take: 10,
        include: {
          users: { select: { name: true } },
        },
      }),
    ]);

    const usersMap = new Map<string, string>();
    usersList.forEach((u) => {
      usersMap.set(u.id, u.name);
      usersMap.set(u.name, u.name);
    });

    const pipelineItems: PipelineItem[] = [];

    // Map Production Projects (Active projects only)
    for (const p of productionProjects) {
      if (p.status === "completed" || p.status === "cancelled") {
        continue; // Do not include completed or cancelled projects
      }

      const days = calculateDaysInStage(p.updated_at || p.created_at);
      const isOverdue = days >= 6;

      let stageLabel = STATUS_LABELS[p.status] ?? p.status;
      let stageCategory: "review" | "production" | "contract" = "production";
      let stageBadgeClass = STATUS_BADGE_STYLES[p.status] ?? "bg-slate-100 text-slate-700 border-slate-300";
      let nextActionText = "In production";
      let needsMyAction = false;

      if (p.status === "under_contract") {
        stageCategory = "contract";
        stageLabel = "Contracting";
        nextActionText = "Review and execute publishing contract";
        needsMyAction = true;
      } else if (p.status === "dtp") {
        stageLabel = "DTP Layout";
        nextActionText = "Typesetting & inner layout formatting";
      } else if (p.status === "editing") {
        stageLabel = "Editing";
        nextActionText = "Editorial review & manuscript corrections";
      } else if (p.status === "cover_design") {
        stageLabel = "Cover Design";
        nextActionText = "Book jacket & cover art design";
      } else if (p.status === "isbn_registration") {
        stageLabel = "ISBN Registration";
        nextActionText = "ISBN assignment & barcode generation";
      } else if (p.status === "final_proof") {
        stageLabel = "Author Review";
        nextActionText = p.proof_approved_at
          ? "Author signed off · Ready for print run"
          : "Cover & interior proof pending author signoff";
        needsMyAction = !p.proof_approved_at;
      } else if (p.status === "printing") {
        stageLabel = "Printing";
        nextActionText = "Print run in progress at press";
      } else if (p.status === "post_production") {
        stageLabel = "Post-Production";
        nextActionText = "Quality check & warehouse intake";
        needsMyAction = !p.post_production_completed_at;
      }

      const activeEditorId =
        p.editing_assigned_to ||
        p.dtp_assigned_to ||
        p.cover_assigned_to ||
        p.proof_assigned_to ||
        p.isbn_assigned_to;
      const editorName = activeEditorId ? usersMap.get(activeEditorId) || activeEditorId : null;

      const publishingType: "kairali_funded" | "self_publishing" = "kairali_funded";
      const publishingTypeLabel = "Kairali-funded";

      pipelineItems.push({
        id: `prod-${p.id}`,
        type: "production",
        title: p.titles.name,
        titleMl: p.titles.name_ml,
        author: p.titles.authors?.name ?? "Unknown Author",
        stage: p.status,
        stageLabel,
        stageCategory,
        stageBadgeClass,
        publishingType,
        publishingTypeLabel,
        editorName,
        editorId: activeEditorId ?? null,
        enteredStageAt: p.created_at || p.updated_at,
        daysInStage: days,
        isOverdue,
        needsMyAction,
        nextActionText,
        drawerData: {
          actionLinks: {
            primaryLink: `/production/${p.id}`,
            primaryLabel: "Open Production Console",
            secondaryLink: `/titles/${p.title_id}`,
            secondaryLabel: "View Title Details",
          },
        },
      });
    }

    // Collect all catalog title names & production titles to prevent published/completed or transitioned submissions from re-appearing
    const existingCatalogTitleNames = new Set<string>();
    allCatalogTitles.forEach((t) => {
      if (t.name) existingCatalogTitleNames.add(t.name.trim().toLowerCase());
      if (t.name_ml) existingCatalogTitleNames.add(t.name_ml.trim().toLowerCase());
    });
    productionProjects.forEach((p) => {
      if (p.titles?.name) existingCatalogTitleNames.add(p.titles.name.trim().toLowerCase());
      if (p.titles?.name_ml) existingCatalogTitleNames.add(p.titles.name_ml.trim().toLowerCase());
    });

    // Map Submissions (From new arrival to review & board decision before contracting)
    for (const s of submissionsList) {
      const subTitle = s.title.trim().toLowerCase();
      const subTitleMl = s.title_ml?.trim().toLowerCase();

      // Skip if this title is already in the published catalog or production
      if (existingCatalogTitleNames.has(subTitle) || (subTitleMl && existingCatalogTitleNames.has(subTitleMl))) {
        continue;
      }

      const days = calculateDaysInStage(s.updated_at || s.submitted_at);
      const isOverdue = days >= 6 && s.status !== "rejected";

      let stageLabel = "Initial Screen";
      let stageCategory: "review" | "production" | "contract" = "review";
      let stageBadgeClass = "bg-purple-50 text-purple-700 border-purple-200";
      let nextActionText = "Screening submission";
      let needsMyAction = false;

      if (s.status === "new" || s.status === "pending_review") {
        stageLabel = "Initial Screen";
        stageBadgeClass = "bg-purple-50 text-purple-700 border-purple-200";
        nextActionText = "Screen submission & assign editor";
        needsMyAction = true;
      } else if (s.status === "in_review" || s.status === "under_review") {
        stageLabel = "Editor Review";
        stageBadgeClass = "bg-sky-50 text-sky-700 border-sky-200";
        nextActionText = "Editorial review & feedback in progress";
        needsMyAction = false;
      } else if (s.status === "needs_revision") {
        stageLabel = "Needs Revision";
        stageBadgeClass = "bg-amber-50 text-amber-700 border-amber-200";
        nextActionText = "Awaiting author revisions";
        needsMyAction = false;
      } else if (s.status === "reviewed") {
        stageLabel = "Board Decision";
        stageBadgeClass = "bg-amber-50 text-amber-800 border-amber-300";
        nextActionText = "Awaiting your decision / board signoff";
        needsMyAction = true;
      } else if (s.status === "accepted") {
        stageLabel = "Contract Pending";
        stageCategory = "contract";
        stageBadgeClass = "bg-emerald-50 text-emerald-800 border-emerald-300";
        nextActionText = "Contract generation & author signing";
        needsMyAction = true;
      } else if (s.status === "rejected") {
        continue; // Exclude rejected submissions from active pipeline
      }

      const assignedEditor = s.users?.name ?? (s.reviewed_by ? usersMap.get(s.reviewed_by) : null) ?? null;
      const isSelfPub = s.publishing_type === "self_publishing";

      pipelineItems.push({
        id: `sub-${s.id}`,
        type: "submission",
        title: s.title,
        titleMl: s.title_ml,
        author: s.author_name,
        stage: s.status,
        stageLabel,
        stageCategory,
        stageBadgeClass,
        publishingType: isSelfPub ? "self_publishing" : "kairali_funded",
        publishingTypeLabel: isSelfPub ? "Self-published" : "Kairali-funded",
        editorName: assignedEditor,
        editorId: s.reviewed_by ?? null,
        enteredStageAt: s.updated_at || s.submitted_at,
        daysInStage: days,
        isOverdue,
        needsMyAction,
        nextActionText,
        drawerData: {
          actionLinks: {
            primaryLink: `/submissions/${s.id}`,
            primaryLabel: "Open Submission Review",
            secondaryLink: null,
            secondaryLabel: null,
          },
        },
      });
    }

    const getTimestamp = (dateStr: string | null | undefined): number => {
      if (!dateStr) return 0;
      try {
        const d = dateStr.length <= 10 ? new Date(`${dateStr}T00:00:00Z`) : parseStamp(dateStr);
        const ms = d.getTime();
        return Number.isNaN(ms) ? new Date(dateStr).getTime() || 0 : ms;
      } catch {
        return 0;
      }
    };

    // Sort pipeline items:
    // 1. Editor review / submissions on top
    // 2. Books in production after that
    // 3. Sorted by date so the one which came first (earliest date) is placed on top
    pipelineItems.sort((a, b) => {
      // Prioritize submissions (editor review) on top
      if (a.type !== b.type) {
        return a.type === "submission" ? -1 : 1;
      }

      // For both submissions and production items, place the one which came first on top (FIFO)
      const timeA = getTimestamp(a.enteredStageAt);
      const timeB = getTimestamp(b.enteredStageAt);
      return timeA - timeB;
    });

    // Calculate Editor Workloads (Zone 3)
    const staffMembers = usersList.filter((u) => {
      const roles = parseUserRoles(u.role);
      return roles.some((r) =>
        ["editor", "designer", "production"].includes(r)
      );
    });

    const editors: EditorWorkload[] = staffMembers.map((u) => {
      const assignedCount = pipelineItems.filter(
        (i) =>
          i.stageCategory !== "completed" &&
          (i.editorId === u.id || i.editorName === u.name)
      ).length;

      const overCapacity = assignedCount >= 3;
      const percentage = Math.min(100, Math.round((assignedCount / 3) * 100));

      return {
        id: u.id,
        name: u.name,
        role: u.role,
        activeCount: assignedCount,
        overCapacity,
        percentage,
      };
    });

    // Sort editors by active count descending
    editors.sort((a, b) => b.activeCount - a.activeCount);

    // Activity Feed (Zone 4)
    const activities: ActivityItem[] = recentAudit.map((a) => ({
      id: a.id,
      action: a.action.replace(/_/g, " "),
      entity: a.entity,
      userName: a.users?.name ?? "System",
      timestamp: a.at,
    }));

    return (
      <ManagerPipelineClient
        userName={firstName}
        pipelineItems={pipelineItems}
        editors={editors}
        activities={activities}
      />
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
              Welcome, {firstName}
            </h1>
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
                      <tr className="border-b border-black/[0.08] text-left font-bold   tracking-wider text-muted-foreground dark:border-white/[0.1]">
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
                              <ArrowRight size={12} />
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
                        <span className="inline-flex items-center gap-1">Review <ArrowRight size={11} /></span>
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
            <span className="inline-flex items-center gap-1">Go to Production Pipeline <ArrowRight size={11} /></span>
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
              Welcome, {firstName}
            </h1>
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
                  <tr className="border-b border-black/[0.08] text-left font-bold   tracking-wider text-muted-foreground">
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
                          <span>Open</span><ArrowRight size={11} />
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
  // 4. PRODUCTION DASHBOARD
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
          {/* <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-0.5 text-xs font-bold text-teal-700 dark:text-teal-300">
            <span className="h-2 w-2 rounded-full bg-teal-500" />
            <span>{ROLE_LABEL[userRoles[0]] || "Staff Workspace"}</span>
          </div> */}
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Welcome, {firstName}
          </h1>
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
                <tr className="border-b border-black/[0.08] text-left font-bold   tracking-wider text-muted-foreground">
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
                        <span>Open</span><ArrowRight size={11} />
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
