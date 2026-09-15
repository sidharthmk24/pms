"use client";

import { useState } from "react";
import { formatIST } from "@/lib/time";

interface PostProductionDashboardProps {
  projectId: string;
  project: {
    id: string;
    status: string;
    qc_passed_at: string | null;
    qc_notes: string | null;
    damaged_qty: number | null;
    author_copies_qty: number | null;
    author_copies_dispatched_at: string | null;
    author_dispatch_tracking: string | null;
    warehouse_received_qty: number | null;
    channels_activated: string | null;
    handover_completed_at: string | null;
    print_completed_at: string | null;
  };
  title: {
    name: string;
    name_ml?: string | null;
    isbn?: string | null;
    stock: number;
    mrp_paise: number;
    authors?: { name: string; email?: string | null } | null;
  };
  printJob?: {
    job_no: string;
    qty: number;
    paper?: string | null;
    binding?: string | null;
    vendor?: string | null;
    cost_paise: number;
  } | null;
  publishingType: "kairali_funded" | "self_publishing";
}

const ALL_CHANNELS = [
  { id: "retail", name: "Retail Bookstore", desc: "Kozhikode Stadium Store POS", icon: "🏪" },
  { id: "dealer", name: "Wholesale Dealers", desc: "Regional Distributors & Stores", icon: "📦" },
  { id: "fair", name: "Book Fairs & Expos", desc: "Kerala Cultural Fests", icon: "🎪" },
  { id: "online", name: "Online Store & Web", desc: "Direct Web Catalog Order", icon: "🌐" },
];

export default function PostProductionDashboard({
  projectId,
  project,
  title,
  printJob,
  publishingType,
}: PostProductionDashboardProps) {
  const isSelfPublishing = publishingType === "self_publishing";
  const activeChannels = (project.channels_activated || "retail,dealer,fair,online").split(",");

  // State for updating dispatch tracking if needed
  const [dispatchTracking, setDispatchTracking] = useState(project.author_dispatch_tracking || "");
  const [dispatchedAt, setDispatchedAt] = useState(project.author_copies_dispatched_at || "");
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);

  async function handleSaveDispatch(e: React.FormEvent) {
    e.preventDefault();
    if (!dispatchTracking) return;
    setUpdating(true);
    setUpdateMsg(null);

    try {
      const res = await fetch(`/api/production/${projectId}/print-receipt`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracking: dispatchTracking }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setDispatchedAt(data.dispatchedAt);
        setShowDispatchModal(false);
        setUpdateMsg("Author copies tracking details saved successfully!");
      } else {
        setUpdateMsg(data.error || "Failed to update tracking");
      }
    } catch {
      setUpdateMsg("Failed to connect to server");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Official Handover Milestone Seal */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-6 dark:border-emerald-500/30">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white font-black text-xl shadow-md">
              ✓
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Lifecycle Phase 8b Complete
                </span>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 dark:text-emerald-300">
                  READY FOR SALE
                </span>
              </div>
              <h2 className="text-xl font-bold text-foreground   mt-0.5">
                PMS to BMS Handover Complete
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Physical press batch received, inspected, and title inventory is fully live across active sales channels.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-1 text-xs">
            <span
              className={`rounded-full px-3 py-1 font-bold ${
                isSelfPublishing
                  ? "border border-accent/20 bg-accent/10 text-accent"
                  : "border border-primary/20 bg-primary/10 text-primary"
              }`}
            >
              {isSelfPublishing ? "Self-Publishing Track" : "Kairali Books Publishing Track"}
            </span>
            {project.handover_completed_at && (
              <span className="text-[11px] text-muted-foreground">
                Handover Executed: <strong>{formatIST(project.handover_completed_at)}</strong>
              </span>
            )}
          </div>
        </div>

        {updateMsg && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            {updateMsg}
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* 1. Quality Control & Delivery */}
        <div className="rounded-2xl border border-black/10 bg-surface p-5 shadow-xs dark:border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              1. Delivery &amp; QC
            </span>
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              QC Passed
            </span>
          </div>
          <div>
            <span className="numeric text-2xl font-black text-foreground">
              {printJob?.qty || project.warehouse_received_qty || 0}
            </span>
            <span className="text-xs text-muted-foreground ml-1.5">copies delivered</span>
          </div>
          <div className="space-y-1 border-t border-black/5 pt-2 text-xs text-muted-foreground dark:border-white/5">
            <p>
              Damages Logged: <strong className="text-foreground">{project.damaged_qty || 0} copies</strong>
            </p>
            {project.qc_notes && (
              <p className="text-[11px] italic truncate">&ldquo;{project.qc_notes}&rdquo;</p>
            )}
          </div>
        </div>

        {/* 2. Author Copies Handover */}
        <div className="rounded-2xl border border-black/10 bg-surface p-5 shadow-xs dark:border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              2. Author Copies
            </span>
            <span
              className={`text-[11px] font-bold ${
                dispatchedAt ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {dispatchedAt ? "✓ Dispatched" : "Pending Courier"}
            </span>
          </div>
          <div>
            <span className="numeric text-2xl font-black text-foreground">
              {project.author_copies_qty || 0}
            </span>
            <span className="text-xs text-muted-foreground ml-1.5">author copies</span>
          </div>
          <div className="space-y-1 border-t border-black/5 pt-2 text-xs text-muted-foreground dark:border-white/5">
            <p>
              Recipient: <strong className="text-foreground">{title.authors?.name || "Author"}</strong>
            </p>
            {dispatchTracking ? (
              <p className="text-[11px] truncate">
                Docket: <strong className="text-foreground">{dispatchTracking}</strong>
              </p>
            ) : (
              <button
                onClick={() => setShowDispatchModal(true)}
                className="text-[11px] font-bold text-primary hover:underline"
              >
                + Add Courier Docket Details
              </button>
            )}
          </div>
        </div>

        {/* 3. Commercial Warehouse Intake */}
        <div className="rounded-2xl border border-black/10 bg-surface p-5 shadow-xs dark:border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              3. Warehouse Stock
            </span>
            <span className="text-[11px] font-bold text-foreground">Kozhikode Central</span>
          </div>
          <div>
            <span className="numeric text-2xl font-black text-foreground">
              {project.warehouse_received_qty || title.stock}
            </span>
            <span className="text-xs text-muted-foreground ml-1.5">inward added</span>
          </div>
          <div className="space-y-1 border-t border-black/5 pt-2 text-xs text-muted-foreground dark:border-white/5">
            <p>
              Current Live Balance: <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold">{title.stock} copies</strong>
            </p>
            <p className="text-[11px]">Automatic sync to BMS active</p>
          </div>
        </div>
      </div>

      {/* Multi-Channel Distribution Grid */}
      <div className="rounded-2xl border border-black/10 bg-surface p-6 shadow-xs dark:border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">Multi-Channel Sales Distribution Status</h3>
            <p className="text-xs text-muted-foreground">
              Commercial availability across Kairali Books retail and wholesale channels:
            </p>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            {activeChannels.length} Channels Live
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ALL_CHANNELS.map((ch) => {
            const isLive = activeChannels.includes(ch.id);
            return (
              <div
                key={ch.id}
                className={`rounded-xl border p-4 transition ${
                  isLive
                    ? "border-emerald-500/30 bg-emerald-500/5 dark:border-emerald-400/30 dark:bg-emerald-400/5"
                    : "border-black/10 bg-surface-muted/40 opacity-50 dark:border-white/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  {/* <span className="text-2xl">{ch.icon}</span> */}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      isLive
                        ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                        : "bg-black/10 text-muted-foreground"
                    }`}
                  >
                    {isLive ? "LIVE" : "INACTIVE"}
                  </span>
                </div>
                <h4 className="mt-2 text-xs font-bold text-foreground">{ch.name}</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">{ch.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inline Modal to update dispatch tracking */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-black/10 bg-surface p-6 shadow-xl dark:border-white/10">
            <h3 className="text-base font-bold text-foreground  ">
              Record Author Copies Dispatch
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Enter courier details or delivery notes for the author&apos;s physical copies handover.
            </p>

            <form onSubmit={handleSaveDispatch} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Courier / Handover Tracking Details *
                </label>
                <input
                  type="text"
                  value={dispatchTracking}
                  onChange={(e) => setDispatchTracking(e.target.value)}
                  placeholder="e.g. Professional Couriers #123456 / Delivered to author residence"
                  required
                  className="w-full rounded-xl border border-black/15 bg-surface px-3 py-2 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-foreground/20 dark:border-white/15"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDispatchModal(false)}
                  className="rounded-xl border border-black/10 px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-black/5 dark:border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="rounded-xl bg-foreground px-4 py-2 text-xs font-bold text-background hover:bg-foreground/90 disabled:opacity-50"
                >
                  {updating ? "Saving..." : "Save Dispatch Info"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
