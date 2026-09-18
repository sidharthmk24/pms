"use client";

import Link from "next/link";
import { formatIST } from "@/lib/time";
import { formatPaise } from "@/lib/money";
import {
  CheckCircle2,
  BookOpen,
  UserCheck,
  Coins,
  Layers,
  Store,
  Truck,
  Sparkles,
  Globe,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

interface PostProductionDashboardProps {
  projectId: string;
  project: {
    id: string;
    status: string;
    proof_approved_at?: string | null;
    updated_at?: string | null;
    isbn_registered?: string | null;
    channels_activated?: string | null;
    handover_completed_at?: string | null;
  };
  title: {
    name: string;
    name_ml?: string | null;
    isbn?: string | null;
    stock: number;
    mrp_paise: number;
    authors?: { name: string; email?: string | null } | null;
  };
  printJob?: any;
  publishingType: "kairali_funded" | "self_publishing";
}

const CHANNELS = [
  {
    id: "retail",
    name: "Retail Bookstore",
    desc: "Kozhikode Stadium Store POS",
    icon: Store,
  },
  {
    id: "dealer",
    name: "Wholesale Dealers",
    desc: "Regional Distributors & Stores",
    icon: Truck,
  },
  {
    id: "fair",
    name: "Book Fairs & Expos",
    desc: "Kerala Cultural Fests",
    icon: Sparkles,
  },
  {
    id: "online",
    name: "Online Store & Web",
    desc: "Direct Web Catalog Order",
    icon: Globe,
  },
];

export default function PostProductionDashboard({
  projectId,
  project,
  title,
  publishingType,
}: PostProductionDashboardProps) {
  const isSelfPublishing = publishingType === "self_publishing";
  const activeChannels = (project.channels_activated || "retail,dealer,fair,online").split(",");
  const isbnNumber = title.isbn || project.isbn_registered || "Allocated";
  const completionDate = project.proof_approved_at || project.updated_at;

  return (
    <div className="space-y-6 font-sans animate-apple-in">
      {/* Official Completion & Publication Seal Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-6 dark:border-emerald-500/30 shadow-xs">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white font-black text-xl shadow-md">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider text-emerald-700 dark:text-emerald-400">
                  Production Complete
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                  <ShieldCheck className="h-3 w-3" />
                  <span>PUBLISHED &amp; LIVE</span>
                </span>
              </div>
              <h2 className="text-xl font-bold text-foreground mt-0.5">
                Book Published &amp; Active in Catalog
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                All production stages finalized and author sign-off recorded. The title is officially active in the published catalog.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-2 text-xs shrink-0">
            <Link
              href="/titles"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
            >
              <span>View in Published Books</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <span
              className={`rounded-full px-3 py-0.5 font-bold ${
                isSelfPublishing
                  ? "border border-accent/20 bg-accent/10 text-accent"
                  : "border border-primary/20 bg-primary/10 text-primary"
              }`}
            >
              {isSelfPublishing ? "Self-Publishing Track" : "Kairali Books Publishing Track"}
            </span>
          </div>
        </div>
      </div>

      {/* Spacious 2x2 Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Card 1: Catalog Status & ISBN */}
        <div className="rounded-2xl border border-black/8 bg-surface p-5 shadow-2xs dark:border-white/10 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <BookOpen className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-muted-foreground">
                1. Catalog Status
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Live in Catalog</span>
            </span>
          </div>

          <div>
            <h3 className="text-xl font-extrabold text-foreground tracking-tight">
              Active &amp; Published
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Available in central database and commercial index
            </p>
          </div>

          <div className="border-t border-black/5 pt-3 dark:border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-mono text-xs font-bold text-foreground bg-black/5 dark:bg-white/10 px-2.5 py-1 rounded-lg">
              ISBN: {isbnNumber}
            </span>
            <span className="text-[11px] text-muted-foreground">
              Direct BMS Sync
            </span>
          </div>
        </div>

        {/* Card 2: Author Sign-off */}
        <div className="rounded-2xl border border-black/8 bg-surface p-5 shadow-2xs dark:border-white/10 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <UserCheck className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-muted-foreground">
                2. Author Sign-Off
              </span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Sign-Off Recorded</span>
            </span>
          </div>

          <div>
            <h3 className="text-xl font-extrabold text-foreground tracking-tight">
              {title.authors?.name || "Author"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Digital proof consent and publication approval confirmed
            </p>
          </div>

          <div className="border-t border-black/5 pt-3 dark:border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-[11px] text-muted-foreground">
              Sign-Off Date:{" "}
              <strong className="text-foreground">
                {completionDate ? formatIST(completionDate, false) : "Verified"}
              </strong>
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              Consent Verified
            </span>
          </div>
        </div>

        {/* Card 3: Commercial Pricing */}
        <div className="rounded-2xl border border-black/8 bg-surface p-5 shadow-2xs dark:border-white/10 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#7e2562]/10 text-[#7e2562] dark:text-pink-300">
                <Coins className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-muted-foreground">
                3. Commercial Pricing
              </span>
            </div>
            <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 shrink-0">
              Retail MRP
            </span>
          </div>

          <div>
            <div className="numeric text-2xl font-black text-foreground">
              {title.mrp_paise > 0 ? formatPaise(title.mrp_paise) : "Locked"}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Standard retail selling price locked for distribution
            </p>
          </div>

          <div className="border-t border-black/5 pt-3 dark:border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-[11px] text-muted-foreground">
              Royalty calculation basis active
            </span>
            <span className="text-[11px] font-medium text-foreground">
              Point-of-Sale Live
            </span>
          </div>
        </div>

        {/* Card 4: Production Lifecycle */}
        <div className="rounded-2xl border border-black/8 bg-surface p-5 shadow-2xs dark:border-white/10 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Layers className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-muted-foreground">
                4. Production Lifecycle
              </span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
              <span>5 of 5 Completed</span>
            </span>
          </div>

          <div>
            <h3 className="text-xl font-extrabold text-foreground tracking-tight">
              All Milestones Met
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              DTP · Editorial Proof · Cover Design · ISBN · Final Proof
            </p>
          </div>

          <div className="border-t border-black/5 pt-3 dark:border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-[11px] text-muted-foreground">
              Completed on:{" "}
              <strong className="text-foreground">
                {completionDate ? formatIST(completionDate, false) : "Finished"}
              </strong>
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              Archived &amp; Locked
            </span>
          </div>
        </div>
      </div>

      {/* Multi-Channel Sales Distribution Status */}
      <div className="rounded-2xl border border-black/8 bg-surface p-6 shadow-2xs dark:border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Multi-Channel Sales Distribution Status
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Commercial availability across Kairali Books retail, regional, and web channels:
            </p>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
            {activeChannels.length} Channels Live
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CHANNELS.map((ch) => {
            const isLive = activeChannels.includes(ch.id);
            const Icon = ch.icon;
            return (
              <div
                key={ch.id}
                className={`rounded-2xl border p-4 transition ${
                  isLive
                    ? "border-emerald-500/30 bg-emerald-500/5 dark:border-emerald-400/30 dark:bg-emerald-400/5"
                    : "border-black/10 bg-surface-muted/40 opacity-50 dark:border-white/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Icon className="h-4 w-4" />
                  </div>
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
                <h4 className="mt-3 text-xs font-bold text-foreground">{ch.name}</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">{ch.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
