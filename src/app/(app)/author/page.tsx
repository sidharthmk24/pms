import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatIST } from "@/lib/time";
import { formatPaise } from "@/lib/money";
import { parseContractNotes, type ContractMetadata } from "@/lib/contracts";
import { ProofPreviewButtons } from "./proof-preview-button";
import { AuthorProofAction } from "./author-proof-action";

export const metadata: Metadata = {
  title: "Author Portal · Kairali Books",
  description: "Track manuscript reviews, digital contracts, and live production pipelines.",
};
export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  new: { label: "Pending Review", class: "bg-primary/10 text-primary border-primary/20" },
  pending_review: { label: "Pending Review", class: "bg-primary/10 text-primary border-primary/20" },
  under_review: { label: "Under Review", class: "bg-warning/10 text-warning border-warning/20" },
  needs_revision: { label: "Needs Revision", class: "bg-accent/10 text-accent border-accent/20" },
  accepted: { label: "Approved & Accepted", class: "bg-success/10 text-success border-success/20" },
  declined: { label: "Declined", class: "bg-muted text-muted-foreground border-border" },
  archived: { label: "Archived", class: "bg-muted text-muted-foreground border-border" },
  withdrawn: { label: "Withdrawn", class: "bg-muted text-muted-foreground border-border" },
};

export default async function AuthorDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ submitted?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const submittedRef = params?.submitted;

  const author = await prisma.authors.findFirst({
    where: { email: { equals: user.email, mode: "insensitive" } },
  });

  const [submissions, contracts, projects, titles, payouts] = await Promise.all([
    prisma.submissions.findMany({
      where: { email: { equals: user.email, mode: "insensitive" } },
      orderBy: { submitted_at: "desc" },
    }),
    prisma.contracts.findMany({
      where: {
        OR: [
          { authors: { email: { equals: user.email, mode: "insensitive" } } },
          { term_notes: { contains: user.email } },
        ],
      },
      include: { titles: true, authors: true },
      orderBy: { created_at: "desc" },
    }),
    prisma.production_projects.findMany({
      where: author?.id
        ? {
            titles: {
              OR: [
                { author_id: author.id },
                { contracts: { is: { author_id: author.id } } },
              ],
            },
          }
        : {
            titles: {
              contracts: {
                is: {
                  authors: { email: { equals: user.email, mode: "insensitive" } },
                },
              },
            },
          },
      include: {
        titles: {
          include: { authors: true },
        },
        print_jobs: true,
      },
      orderBy: { created_at: "desc" },
    }),
    prisma.titles.findMany({
      where: {
        AND: [
          author?.id
            ? {
                OR: [
                  { author_id: author.id },
                  { contracts: { is: { author_id: author.id } } },
                  { contracts: { authors: { email: { equals: user.email, mode: "insensitive" } } } },
                ],
              }
            : {
                contracts: {
                  is: {
                    authors: { email: { equals: user.email, mode: "insensitive" } },
                  },
                },
              },
          {
            OR: [
              {
                production_projects: {
                  OR: [
                    { status: "completed" },
                    { print_completed_at: { not: null } },
                  ],
                },
              },
              {
                production_projects: null,
                stock: { gt: 0 },
              },
            ],
          },
        ],
      },
      include: {
        production_projects: true,
      },
      orderBy: { created_at: "desc" },
    }),
    prisma.payouts.findMany({
      where: {
        authors: { email: { equals: user.email, mode: "insensitive" } },
      },
      orderBy: { paid_on: "desc" },
    }),
  ]);

  const authorDisplayName = author?.name || user.name || "Author";

  const inReviewCount = submissions.filter((s) => ["new", "pending_review", "under_review"].includes(s.status)).length;
  const approvedCount = submissions.filter((s) => s.status === "accepted").length;
  const inProductionCount = projects.filter((p) => p.status !== "published").length;
  const publishedCount = titles.filter((t) => t.status === "active").length;

  return (
    <div className="space-y-8 pb-12">
      {/* Submission Success Alert */}
      {submittedRef && (
        <div className="rounded-2xl border border-success/30 bg-success/10 p-5 text-sm font-bold text-success flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success text-background font-black text-xs">
              ✓
            </span>
            <div>
              <p className="text-foreground font-extrabold">Manuscript Submitted Successfully!</p>
              <p className="text-xs text-muted-foreground font-normal">
                Reference: <strong className="font-mono text-foreground">{submittedRef}</strong> · Your work has entered our intake queue for editorial review.
              </p>
            </div>
          </div>
          <Link href="/author" className="text-xs font-bold text-muted-foreground hover:text-foreground">
            Dismiss
          </Link>
        </div>
      )}

      {/* Welcome Banner */}
      <header className="relative overflow-hidden rounded-[28px] border border-black/10 bg-surface p-6 shadow-sm backdrop-blur-xl dark:border-white/10 sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Kairali Author Portal
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                {user.email}
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl font-serif">
              Welcome back, {authorDisplayName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
              Track the live editorial evaluation of your manuscripts, view executed publishing agreements, and monitor real-time production stages from DTP to printing.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/author/submit"
              className="apple-button inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-3 text-xs font-extrabold text-background shadow-xs hover:opacity-90 transition-all"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Submit New Manuscript</span>
            </Link>
          </div>
        </div>
      </header>

      {/* KPI Metric Tiles */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <div className="rounded-2xl border border-black/10 bg-surface p-5 dark:border-white/10">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            In Review
          </span>
          <p className="mt-1.5 text-2xl font-black text-foreground sm:text-3xl">
            {inReviewCount}
          </p>
          <span className="text-[11px] text-muted-foreground">Manuscripts being evaluated</span>
        </div>

        <div className="rounded-2xl border border-black/10 bg-surface p-5 dark:border-white/10">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Approved Titles
          </span>
          <p className="mt-1.5 text-2xl font-black text-success sm:text-3xl">
            {approvedCount}
          </p>
          <span className="text-[11px] text-muted-foreground">Accepted for publishing</span>
        </div>

        <div className="rounded-2xl border border-black/10 bg-surface p-5 dark:border-white/10">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            In Production
          </span>
          <p className="mt-1.5 text-2xl font-black text-warning sm:text-3xl">
            {inProductionCount}
          </p>
          <span className="text-[11px] text-muted-foreground">DTP, ISBN &amp; Proofing</span>
        </div>

        <div className="rounded-2xl border border-black/10 bg-surface p-5 dark:border-white/10">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Active Contracts
          </span>
          <p className="mt-1.5 text-2xl font-black text-foreground sm:text-3xl">
            {contracts.length}
          </p>
          <span className="text-[11px] text-muted-foreground">Signed legal agreements</span>
        </div>
      </div>

      {/* SECTION 1: Live Production Pipeline (The Works Being Done) */}
      <section id="production" className="rounded-[24px] border border-black/10 bg-surface p-6 shadow-sm dark:border-white/10 sm:p-7">
        <div className="flex items-center justify-between border-b border-black/[0.06] pb-4 dark:border-white/[0.08]">
          <div>
            <h2 className="text-lg font-bold text-foreground">Live Production Pipeline</h2>
            <p className="text-xs text-muted-foreground">
              Real-time progress for your accepted books moving through typesetting, cover design, ISBN allocation, and printing.
            </p>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-extrabold text-primary">
            {projects.length} Active Project{projects.length === 1 ? "" : "s"}
          </span>
        </div>

        {projects.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <p className="font-medium text-foreground">No active production projects yet.</p>
            <p className="text-xs mt-1">Once a manuscript is approved and the contract is signed, production progress will display here.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {projects.map((project) => {
              const PIPELINE_ORDER = [
                "under_contract",
                "dtp",
                "editing",
                "cover_design",
                "isbn_registration",
                "final_proof",
                "printing",
                "post_production",
                "completed",
              ];
              const currentStageIdx = PIPELINE_ORDER.indexOf(project.status);

              const stages = [
                { key: "under_contract", name: "Contract Signed" },
                { key: "dtp", name: "DTP / Typeset" },
                { key: "editing", name: "Editorial Review" },
                { key: "cover_design", name: "Cover Design" },
                { key: "isbn_registration", name: "ISBN Assigned", extra: project.isbn_registered },
                { key: "final_proof", name: "Final Proof" },
                { key: "printing", name: "Printing Run" },
                { key: "post_production", name: "Intake & Courier" },
              ].map((st) => {
                const stepIdx = PIPELINE_ORDER.indexOf(st.key);
                const done = stepIdx < currentStageIdx;
                const current = st.key === project.status;
                return { ...st, done, current };
              });

              return (
                <div
                  key={project.id}
                  className="rounded-2xl border border-black/10 bg-background/50 p-5 dark:border-white/10 dark:bg-surface-muted/40"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                    <div>
                      <span className="text-[11px] font-mono font-bold uppercase text-primary">
                        Production Track · {project.titles.language || "Malayalam"}
                      </span>
                      <h3 className="text-base font-extrabold text-foreground font-serif">
                        {project.titles.name}
                      </h3>
                      {project.titles.name_ml && (
                        <p className="text-xs text-muted-foreground">{project.titles.name_ml}</p>
                      )}
                    </div>
                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-bold text-foreground border border-black/10 shadow-xs dark:border-white/10">
                        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        Status: {project.status === "editing" && project.proof_feedback ? "UNDER REWORK" : project.status.replace(/_/g, " ").toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Visual Stepper */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-8 pt-3">
                    {stages.map((st, idx) => (
                      <div
                        key={st.name}
                        className={`flex flex-col rounded-xl p-2.5 text-xs transition-all ${
                          st.done
                            ? "border border-success/30 bg-success/10 text-success font-bold"
                            : st.current
                            ? "border border-warning/40 bg-warning/10 text-warning font-bold ring-2 ring-warning/20 animate-pulse"
                            : "border border-black/5 bg-surface text-muted-foreground opacity-60 dark:border-white/5"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono opacity-80">{idx + 1}</span>
                          {st.done && (
                            <svg className="h-3.5 w-3.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-[11px] leading-tight truncate">{st.name}</span>
                        {st.extra && st.done && (
                          <span className="mt-1 font-mono text-[10px] text-foreground font-bold truncate">
                            {st.extra}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Rework Notice for Author */}
                  {project.status === "editing" && project.proof_feedback && (
                    <div className="mt-3 rounded-xl border border-warning/30 bg-warning/5 p-3.5 text-xs animate-in fade-in">
                      <div className="flex items-center gap-2 font-bold text-warning mb-1">
                        <span>🔄</span>
                        <span>Revisions &amp; Rework in Progress</span>
                      </div>
                      <p className="text-muted-foreground">
                        Your title has been returned to the editorial team for adjustments based on the proof review notes:
                      </p>
                      <div className="mt-2 rounded-lg bg-background/90 border border-border p-2.5 text-xs text-foreground font-medium whitespace-pre-wrap">
                        &ldquo;{project.proof_feedback}&rdquo;
                      </div>
                    </div>
                  )}

                  {/* Proof Files Download & Review Block */}
                  {(project.final_layout_path || project.final_cover_path || project.status === "final_proof") && (
                    <div className="mt-4 rounded-xl border border-black/10 bg-surface p-4 dark:border-white/10 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-foreground">
                            Galley Proof Files &amp; Final Layout Draft
                          </h4>
                          <p className="text-[11px] text-muted-foreground">
                            Download and inspect the typeset interior layout and final cover design before print execution.
                          </p>
                        </div>
                        {project.proof_approved_at ? (
                          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            ✓ Proof Signed Off &amp; Approved
                          </span>
                        ) : project.status === "final_proof" ? (
                          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 animate-pulse">
                            Awaiting Author Review &amp; Sign-Off
                          </span>
                        ) : null}
                      </div>

                      <ProofPreviewButtons
                        projectId={project.id}
                        title={project.titles.name}
                        hasLayout={Boolean(project.final_layout_path)}
                        hasCover={Boolean(project.final_cover_path)}
                      />

                      {project.status === "final_proof" && (
                        <div className="pt-2">
                          <AuthorProofAction
                            projectId={project.id}
                            title={project.titles.name}
                            proofApprovedAt={project.proof_approved_at}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Author Copies & Courier Tracking Docket Block */}
                  {project.author_dispatch_tracking && (
                    <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4 dark:border-primary/20 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-primary">
                        <span>📦</span>
                        <span>Author Copies Courier Handover &amp; Dispatch</span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Courier / Tracking Docket: </span>
                          <span className="font-mono font-bold text-foreground">{project.author_dispatch_tracking}</span>
                        </div>
                        {project.author_copies_qty && (
                          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                            {project.author_copies_qty} Complimentary Copies
                          </span>
                        )}
                      </div>
                      {project.author_copies_dispatched_at && (
                        <p className="text-[11px] text-muted-foreground">
                          Dispatched on {project.author_copies_dispatched_at.split(" ")[0]}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 2: Manuscript Submissions (Approved / In Review / Revision) */}
      <section id="manuscripts" className="rounded-[24px] border border-black/10 bg-surface p-6 shadow-sm dark:border-white/10 sm:p-7">
        <div className="flex items-center justify-between border-b border-black/[0.06] pb-4 dark:border-white/[0.08]">
          <div>
            <h2 className="text-lg font-bold text-foreground">My Submitted Manuscripts</h2>
            <p className="text-xs text-muted-foreground">
              Review status, editorial feedback, and approval updates for your submissions.
            </p>
          </div>
          <Link
            href="/author/submit"
            className="apple-button inline-flex items-center gap-1.5 rounded-xl border border-black/15 bg-surface px-3.5 py-1.5 text-xs font-bold text-foreground shadow-xs hover:bg-black/5 dark:border-white/15 dark:bg-surface-muted/60"
          >
            <span>+ New Submission</span>
          </Link>
        </div>

        {submissions.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <p className="font-medium text-foreground">You have not submitted any manuscripts yet.</p>
            <Link href="/author/submit" className="mt-2 inline-block font-bold text-primary hover:underline">
              Submit your first manuscript &rarr;
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {submissions.map((sub) => {
              const statusInfo = STATUS_LABELS[sub.status] || {
                label: sub.status,
                class: "bg-muted text-muted-foreground border-border",
              };

              return (
                <div
                  key={sub.id}
                  className="rounded-2xl border border-black/10 bg-background/60 p-5 dark:border-white/10 dark:bg-surface-muted/40 transition-all hover:border-black/20 dark:hover:border-white/20"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">
                          {sub.ref_no}
                        </span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{sub.genre}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{sub.language}</span>
                      </div>
                      <h3 className="text-base font-extrabold text-foreground font-serif">
                        {sub.title}
                      </h3>
                      {sub.title_ml && (
                        <p className="text-xs text-muted-foreground font-serif">{sub.title_ml}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${statusInfo.class}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {sub.synopsis}
                  </p>

                  {/* Editorial Feedback / Revision Note Alert */}
                  {sub.review_notes && (
                    <div className="mt-4 rounded-xl border border-accent/20 bg-accent/5 p-3.5 text-xs text-foreground">
                      <div className="flex items-center gap-1.5 font-bold text-accent mb-1">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        <span>Editorial Review Feedback</span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed pl-5">
                        {sub.review_notes}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-between border-t border-black/[0.04] pt-3 text-[11px] text-muted-foreground dark:border-white/[0.04]">
                    <span>Submitted: {formatIST(sub.submitted_at)}</span>
                    {sub.status === "accepted" && (
                      <Link
                        href="#contracts"
                        className="font-bold text-success hover:underline inline-flex items-center gap-1"
                      >
                        <span>View Publishing Agreement</span>
                        <span>&rarr;</span>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 3: Publishing Contracts & Digital Agreements */}
      <section id="contracts" className="rounded-[24px] border border-black/10 bg-surface p-6 shadow-sm dark:border-white/10 sm:p-7">
        <div className="flex items-center justify-between border-b border-black/[0.06] pb-4 dark:border-white/[0.08]">
          <div>
            <h2 className="text-lg font-bold text-foreground">Signed Publishing Contracts</h2>
            <p className="text-xs text-muted-foreground">
              Access your legally executed agreements, royalty terms, and digital certificate copies.
            </p>
          </div>
          <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-extrabold text-success">
            {contracts.length} Contract{contracts.length === 1 ? "" : "s"}
          </span>
        </div>

        {contracts.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <p className="font-medium text-foreground">No contracts on file.</p>
            <p className="text-xs mt-1">When an editorial offer is accepted, your signed contract will appear here.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {contracts.map((c) => {
              const meta: ContractMetadata = parseContractNotes(c.term_notes);
              const isFullySigned = !!(meta.author_signed_at && meta.publisher_signed_at);

              return (
                <div
                  key={c.id}
                  className="rounded-2xl border border-black/10 bg-background/50 p-5 dark:border-white/10 dark:bg-surface-muted/40 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold text-muted-foreground">
                        {meta.contract_ref || "CON-2026"}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          isFullySigned
                            ? "bg-success/10 text-success border border-success/20"
                            : "bg-warning/10 text-warning border border-warning/20"
                        }`}
                      >
                        {isFullySigned ? "Fully Dual-Signed" : "Awaiting Signature"}
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-foreground font-serif">
                      {c.titles.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Track: {meta.publishing_type === "self_publishing" ? "Self-Publishing" : "Kairali Books Publishing"}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-black/5 bg-surface p-3 text-xs dark:border-white/5">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase">Royalty Rate</span>
                        <p className="font-extrabold text-foreground">{c.royalty_pct}% ({c.basis.toUpperCase()})</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase">Advance</span>
                        <p className="font-extrabold text-foreground">{formatPaise(c.advance_paise)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      Signed: {c.signed_on ? c.signed_on.slice(0, 10) : "Pending"}
                    </span>
                    <Link
                      href={`/publish/contract/${c.id}`}
                      className="apple-button inline-flex items-center gap-1 rounded-xl bg-foreground px-3.5 py-1.5 text-xs font-extrabold text-background shadow-xs hover:opacity-90"
                    >
                      <span>View Agreement</span>
                      <span>&rarr;</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 4: Published Titles & Royalties */}
      {titles.length > 0 && (
        <section className="rounded-[24px] border border-black/10 bg-surface p-6 shadow-sm dark:border-white/10 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] pb-4 dark:border-white/[0.08]">
            <div>
              <h2 className="text-lg font-bold text-foreground">My Published Books</h2>
              <p className="text-xs text-muted-foreground">
                Official catalog listings, inventory, and retail sales channel availability.
              </p>
            </div>
            <Link
              href="/author/books"
              className="apple-button inline-flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition shadow-2xs"
            >
              <span>View Full Table &amp; Filter</span>
              <span>&rarr;</span>
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {titles.map((t) => {
              const proj = t.production_projects;
              const activeChannels = (proj?.channels_activated || "retail,dealer,fair,online").split(",");

              return (
                <div
                  key={t.id}
                  className="rounded-2xl border border-black/10 bg-background/50 p-5 dark:border-white/10 dark:bg-surface-muted/40 space-y-3"
                >
                  <div>
                    <span className="text-[10px] font-mono uppercase text-muted-foreground">
                      {t.category || "General"} · {t.language}
                    </span>
                    <h3 className="text-base font-extrabold text-foreground font-serif mt-0.5">
                      {t.name}
                    </h3>
                    {t.name_ml && <p className="text-xs text-muted-foreground font-serif">{t.name_ml}</p>}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-black/[0.06] dark:border-white/[0.08]">
                    <span className="font-extrabold text-foreground">{formatPaise(t.mrp_paise)}</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      Warehouse Stock: {t.stock}
                    </span>
                  </div>

                  {/* Author Copies Delivery Status */}
                  {proj && (proj.author_copies_qty ?? 0) > 0 && (
                    <div className="rounded-xl border border-black/5 bg-surface p-2.5 text-xs dark:border-white/5 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Author Copies:</span>
                        <strong className="text-foreground">{proj.author_copies_qty} copies</strong>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">Dispatch:</span>
                        <span className={proj.author_copies_dispatched_at ? "text-emerald-600 font-bold" : "text-amber-600 font-semibold"}>
                          {proj.author_copies_dispatched_at
                            ? `✓ Dispatched (${proj.author_dispatch_tracking || "Delivered"})`
                            : "Preparing for dispatch"}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Channel Distribution Badges */}
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Available In Sales Channels
                    </span>
                    <div className="flex flex-wrap gap-1 text-[10px]">
                      {[
                        { id: "retail", label: "Retail" },
                        { id: "dealer", label: "Dealers" },
                        { id: "fair", label: "Book Fairs" },
                        { id: "online", label: "Online" },
                      ].map((ch) => {
                        const isLive = activeChannels.includes(ch.id);
                        return (
                          <span
                            key={ch.id}
                            className={`rounded-md px-2 py-0.5 font-bold ${
                              isLive
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                : "bg-black/5 text-muted-foreground opacity-50"
                            }`}
                          >
                            {ch.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
