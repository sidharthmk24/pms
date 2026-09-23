"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  Users,
  BookOpen,
  Layers,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

export interface PipelineItem {
  id: string;
  type: "production" | "submission";
  title: string;
  titleMl?: string | null;
  author: string;
  stage: string;
  stageLabel: string;
  stageCategory: "review" | "production" | "contract" | "completed";
  stageBadgeClass: string;
  publishingType: "kairali_funded" | "self_publishing";
  publishingTypeLabel: string;
  editorName: string | null;
  editorId: string | null;
  enteredStageAt: string;
  daysInStage: number;
  isOverdue: boolean;
  needsMyAction: boolean;
  nextActionText: string;
  drawerData?: {
    actionLinks?: {
      primaryLink: string;
      primaryLabel: string;
      secondaryLink?: string | null;
      secondaryLabel?: string | null;
    };
    [key: string]: any;
  };
}

export interface EditorWorkload {
  id: string;
  name: string;
  role: string;
  activeCount: number;
  overCapacity: boolean;
  percentage: number;
}

export interface ActivityItem {
  id: string;
  action: string;
  entity: string;
  userName: string;
  timestamp: string;
}

interface ManagerPipelineClientProps {
  userName: string;
  pipelineItems: PipelineItem[];
  editors: EditorWorkload[];
  activities: ActivityItem[];
}

export default function ManagerPipelineClient({
  userName,
  pipelineItems,
  editors,
  activities,
}: ManagerPipelineClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "submissions" | "production" | "needs_action">("all");
  const [selectedEditorFilter, setSelectedEditorFilter] = useState<string | null>(null);
  const [activityCollapsed, setActivityCollapsed] = useState(false);

  // Metrics matching the pipeline structure
  const totalPipelineCount = pipelineItems.filter((i) => i.stageCategory !== "completed").length;
  const submissionsCount = pipelineItems.filter((i) => i.type === "submission" && i.stageCategory !== "completed").length;
  const inProductionCount = pipelineItems.filter((i) => i.type === "production" && i.stageCategory !== "completed").length;
  const awaitingDecisionCount = pipelineItems.filter((i) => i.needsMyAction && i.stageCategory !== "completed").length;

  // Filtered pipeline items
  const filteredItems = useMemo(() => {
    return pipelineItems.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchAuthor = item.author.toLowerCase().includes(q);
        const matchEditor = (item.editorName || "").toLowerCase().includes(q);
        const matchStage = item.stageLabel.toLowerCase().includes(q);
        if (!matchTitle && !matchAuthor && !matchEditor && !matchStage) {
          return false;
        }
      }

      if (selectedEditorFilter) {
        if (item.editorId !== selectedEditorFilter && item.editorName !== selectedEditorFilter) {
          return false;
        }
      }

      if (activeFilter === "submissions") {
        return item.type === "submission" && item.stageCategory !== "completed";
      }
      if (activeFilter === "production") {
        return item.type === "production" && item.stageCategory !== "completed";
      }
      if (activeFilter === "needs_action") {
        return item.needsMyAction && item.stageCategory !== "completed";
      }

      return true;
    });
  }, [pipelineItems, searchQuery, activeFilter, selectedEditorFilter]);

  // Display all filtered pipeline items
  const displayedItems = useMemo(() => {
    return filteredItems;
  }, [filteredItems]);

  function handleStatCardClick(filter: "all" | "submissions" | "production" | "needs_action") {
    setActiveFilter(filter);
    setSelectedEditorFilter(null);
  }

  return (
    <div className="mx-auto max-w-7xl animate-apple-in space-y-6">
      {/* Top Header */}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-[#7e2562]/10 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs text-muted-foreground font-medium">Welcome, {userName}</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            Manuscript Pipeline
          </h1>
        </div>

        {/* Global Search & Quick Filter Chips */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, author, editor..."
              className="w-full rounded-xl border border-black/10 bg-white pl-9 pr-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-[#7e2562]/20 dark:border-white/10 dark:bg-surface"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="inline-flex rounded-xl border border-black/10 bg-white p-1 shadow-2xs dark:border-white/10 dark:bg-surface">
            <button
              type="button"
              onClick={() => {
                setActiveFilter("all");
                setSelectedEditorFilter(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeFilter === "all" && !selectedEditorFilter
                  ? "bg-[#7e2562] text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              All ({totalPipelineCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveFilter("submissions");
                setSelectedEditorFilter(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeFilter === "submissions"
                  ? "bg-[#7e2562] text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              Editorial Review ({submissionsCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveFilter("production");
                setSelectedEditorFilter(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeFilter === "production"
                  ? "bg-[#7e2562] text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              In Production ({inProductionCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveFilter("needs_action");
                setSelectedEditorFilter(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeFilter === "needs_action"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              Action Required ({awaitingDecisionCount})
            </button>
          </div>
        </div>
      </header>

      {/* Summary Stat Cards - Directly Matching the List Sections */}
      <section className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Editorial Review (Prior Reviews on Top) */}
        <button
          type="button"
          onClick={() => handleStatCardClick("submissions")}
          className={`text-left rounded-2xl border p-4.5 transition-all cursor-pointer shadow-2xs ${
            activeFilter === "submissions"
              ? "border-[#7e2562] bg-[#faedf5]/80 ring-2 ring-[#7e2562]/20"
              : "border-black/8 bg-white hover:border-[#7e2562]/30 hover:bg-[#faedf5]/20 dark:border-white/10 dark:bg-surface"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#7e2562] dark:text-pink-300">Editorial Review</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7e2562]/10 text-[#7e2562] dark:text-pink-300">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#7e2562] dark:text-pink-300">{submissionsCount}</span>
            <span className="text-xs font-medium text-muted-foreground">manuscripts in review</span>
          </div>
        </button>

        {/* Card 2: Books in Production */}
        <button
          type="button"
          onClick={() => handleStatCardClick("production")}
          className={`text-left rounded-2xl border p-4.5 transition-all cursor-pointer shadow-2xs ${
            activeFilter === "production"
              ? "border-sky-600 bg-sky-50/80 ring-2 ring-sky-600/20 dark:border-sky-400 dark:bg-sky-950/30"
              : "border-black/8 bg-white hover:border-sky-400 hover:bg-sky-50/30 dark:border-white/10 dark:bg-surface"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-sky-800 dark:text-sky-400">In Production</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-400">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-sky-800 dark:text-sky-400">{inProductionCount}</span>
            <span className="text-xs font-medium text-muted-foreground">books in layout & press</span>
          </div>
        </button>

        {/* Card 3: Action Required */}
        <button
          type="button"
          onClick={() => handleStatCardClick("needs_action")}
          className={`text-left rounded-2xl border p-4.5 transition-all cursor-pointer shadow-2xs ${
            activeFilter === "needs_action"
              ? "border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/20 dark:border-amber-500 dark:bg-amber-950/30"
              : "border-black/8 bg-white hover:border-amber-400 hover:bg-amber-50/30 dark:border-white/10 dark:bg-surface"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-400">Action Required</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-800 dark:text-amber-400">{awaitingDecisionCount}</span>
            <span className="text-xs font-medium text-muted-foreground">decisions & signoffs</span>
          </div>
        </button>

        {/* Card 4: Total Active Pipeline */}
        <button
          type="button"
          onClick={() => handleStatCardClick("all")}
          className={`text-left rounded-2xl border p-4.5 transition-all cursor-pointer shadow-2xs ${
            activeFilter === "all" && !selectedEditorFilter
              ? "border-[#3cb976] bg-[#3cb976]/10 ring-2 ring-[#3cb976]/20"
              : "border-black/8 bg-white hover:border-[#3cb976]/30 hover:bg-[#3cb976]/5 dark:border-white/10 dark:bg-surface"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#2d915c] dark:text-[#3cb976]">Total Pipeline</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#3cb976]/10 text-[#2d915c] dark:text-[#3cb976]">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-foreground">{totalPipelineCount}</span>
            <span className="text-xs font-medium text-muted-foreground">active titles</span>
          </div>
        </button>
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
        {/* Title Pipeline Table (Simplified & Clean) */}
        <section className="lg:col-span-2 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-foreground">Title Pipeline</h2>
              {selectedEditorFilter && (
                <div className="flex items-center gap-1.5 text-xs bg-black/5 px-2.5 py-0.5 rounded-lg dark:bg-white/10">
                  <span className="text-muted-foreground">Editor:</span>
                  <strong className="text-foreground">
                    {editors.find((e) => e.id === selectedEditorFilter)?.name || selectedEditorFilter}
                  </strong>
                  <button
                    type="button"
                    onClick={() => setSelectedEditorFilter(null)}
                    className="ml-1 text-rose-600 font-bold hover:underline cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            <Link
              href="/production"
              className="apple-button inline-flex items-center gap-1.5 rounded-xl border border-[#7e2562]/20 bg-[#faedf5]/80 px-3 py-1.5 text-xs font-bold text-[#7e2562] transition hover:bg-[#faedf5]"
            >
              <span>View All in Production</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-hidden rounded-3xl border border-black/8 bg-white shadow-plum-sm dark:border-white/10 dark:bg-surface">
            {displayedItems.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground">
                <FileText className="mx-auto h-8 w-8 opacity-40 mb-2" />
                <p className="text-sm font-bold text-foreground">No pipeline items match the active filter</p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveFilter("all");
                    setSelectedEditorFilter(null);
                    setSearchQuery("");
                  }}
                  className="mt-2 text-xs font-bold text-[#7e2562] underline cursor-pointer"
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-black/8 bg-black/[0.02] text-muted-foreground font-bold tracking-wider text-[11px] dark:border-white/8 dark:bg-white/[0.02]">
                      <th className="py-3 px-4 font-extrabold">TITLE / AUTHOR</th>
                      <th className="py-3 px-3 font-extrabold">STAGE</th>
                      <th className="py-3 px-3 font-extrabold">TYPE</th>
                      <th className="py-3 px-3 font-extrabold">EDITOR</th>
                      <th className="py-3 px-3 font-extrabold">DAYS IN STAGE</th>
                      <th className="py-3 px-3 font-extrabold text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {displayedItems.map((item) => {
                      const isAging = item.daysInStage >= 6 && item.stageCategory !== "completed";
                      const linkHref =
                        item.drawerData?.actionLinks?.primaryLink ||
                        (item.type === "production" ? `/production/${item.id.replace("prod-", "")}` : `/submissions/${item.id.replace("sub-", "")}`);

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                        >
                          {/* Title & Author */}
                          <td className="py-3 px-4 max-w-[220px]">
                            <Link
                              href={linkHref}
                              className="font-bold text-foreground hover:text-[#7e2562] transition-colors block truncate"
                            >
                              {item.title}
                            </Link>
                            {item.titleMl && (
                              <div className="font-ml text-[11px] text-muted-foreground truncate">
                                {item.titleMl}
                              </div>
                            )}
                            <div className="text-[11px] text-muted-foreground truncate">{item.author}</div>
                          </td>

                          {/* Stage Badge */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${item.stageBadgeClass}`}
                            >
                              {item.stageLabel}
                            </span>
                          </td>

                          {/* Publishing Type Tag */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-semibold border ${
                                item.publishingType === "self_publishing"
                                  ? "bg-slate-50 text-slate-700 border-slate-200 dark:bg-white/5 dark:text-slate-300 dark:border-white/10"
                                  : "bg-[#faedf5] text-[#7e2562] border-[#7e2562]/20"
                              }`}
                            >
                              {item.publishingTypeLabel}
                            </span>
                          </td>

                          {/* Assigned Editor */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            {item.editorName ? (
                              <span className="font-medium text-foreground flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#7e2562]" />
                                {item.editorName}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60 italic">— Unassigned —</span>
                            )}
                          </td>

                          {/* Days in Stage */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            {item.stageCategory === "completed" ? (
                              <span className="text-muted-foreground/60 font-medium">—</span>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1 font-bold ${
                                  isAging
                                    ? "text-rose-600 dark:text-rose-400 font-extrabold"
                                    : item.daysInStage >= 4
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {isAging && <Clock className="h-3.5 w-3.5 animate-pulse" />}
                                {item.daysInStage} day{item.daysInStage !== 1 ? "s" : ""}
                              </span>
                            )}
                          </td>

                          {/* Direct Action Link */}
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <Link
                              href={linkHref}
                              className="apple-button inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1 text-[11px] font-bold text-white shadow-plum-sm hover:bg-primary-hover"
                            >
                              <span>Open</span>
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Editorial Capacity & Recent Activity */}
        <section className="space-y-5 lg:col-span-1">
          {/* Editorial Capacity */}
          <div className="rounded-3xl border border-black/8 bg-white p-5 shadow-plum-sm dark:border-white/10 dark:bg-surface space-y-3.5">
            <div className="flex items-center justify-between pb-1 border-b border-black/5 dark:border-white/5">
              <h3 className="text-sm font-extrabold text-foreground">Editorial Capacity</h3>
              <span className="rounded-full bg-[#faedf5] px-2 py-0.5 text-[10px] font-bold text-[#7e2562]">
                {editors.length} Staff
              </span>
            </div>

            <div className="space-y-2.5">
              {editors.map((editor) => {
                const isSelected = selectedEditorFilter === editor.id;
                return (
                  <button
                    key={editor.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedEditorFilter(null);
                      } else {
                        setSelectedEditorFilter(editor.id);
                        setActiveFilter("all");
                      }
                    }}
                    className={`w-full text-left rounded-2xl p-3 border transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#7e2562] bg-[#faedf5]/60 ring-2 ring-[#7e2562]/30 shadow-2xs"
                        : "border-black/5 bg-black/[0.01] hover:bg-black/[0.03] hover:border-[#7e2562]/20 dark:border-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#7e2562]/10 text-[#7e2562] font-bold text-xs">
                          {editor.name.charAt(0)}
                        </div>
                        <span className="text-xs font-bold text-foreground truncate max-w-[120px]" title={editor.name}>
                          {editor.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">
                          {editor.activeCount} <span className="text-[10px] font-medium text-muted-foreground">active</span>
                        </span>
                        <span
                          className={`rounded-lg px-2 py-0.5 text-[10px] font-bold border transition ${
                            isSelected
                              ? "bg-[#7e2562] text-white border-[#7e2562]"
                              : "border-black/10 bg-white text-muted-foreground"
                          }`}
                        >
                          {isSelected ? "Filtered" : "Filter"}
                        </span>
                      </div>
                    </div>

                    {/* Workload Progress Bar */}
                    <div className="h-1.5 w-full rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          editor.overCapacity
                            ? "bg-rose-500"
                            : editor.activeCount >= 3
                            ? "bg-amber-500"
                            : "bg-[#7e2562]"
                        }`}
                        style={{ width: `${Math.min(100, Math.max(15, editor.percentage))}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-3xl border border-black/8 bg-white p-5 shadow-plum-sm dark:border-white/10 dark:bg-surface space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-black/5 dark:border-white/5">
              <h3 className="text-sm font-extrabold text-foreground">Recent Activity</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActivityCollapsed(!activityCollapsed)}
                  className="apple-button inline-flex items-center gap-1 rounded-xl border border-black/10 bg-white px-2.5 py-1 text-xs font-bold text-muted-foreground transition hover:text-foreground hover:bg-black/5 dark:border-white/10 dark:bg-surface cursor-pointer"
                >
                  {activityCollapsed ? "Expand" : "Collapse"}
                </button>
                <Link
                  href="/activity"
                  className="apple-button inline-flex items-center gap-1.5 rounded-xl border border-[#7e2562]/20 bg-[#faedf5]/80 px-2.5 py-1 text-xs font-bold text-[#7e2562] transition hover:bg-[#faedf5]"
                >
                  <span>All</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {!activityCollapsed && (
              <div className="space-y-3 pt-1">
                {activities.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No recent telemetry recorded.</p>
                ) : (
                  activities.slice(0, 6).map((act) => (
                    <div key={act.id} className="flex items-start gap-2.5 text-xs">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7e2562]" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground leading-snug">
                          <strong className="font-extrabold">{act.userName}</strong> {act.action}
                        </p>
                        <span className="text-[10px] text-muted-foreground">{act.timestamp}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

