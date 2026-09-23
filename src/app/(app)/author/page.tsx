import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatIST } from "@/lib/time";
import { formatPaise } from "@/lib/money";
import { parseContractNotes, type ContractMetadata } from "@/lib/contracts";
import { ProofPreviewButtons } from "./proof-preview-button";
import ArrowRight from "@/components/ui/arrow-right";
import { AuthorProofAction } from "./author-proof-action";
import { OrderTracker, type TrackerData } from "./order-tracker";

export const metadata: Metadata = {
  title: "Author Portal · Kairali Books",
  description: "Track manuscript reviews, digital contracts, and live production pipelines.",
};
export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  new: { label: "Pending Review", class: "bg-amber-50 text-amber-800 border-amber-300 font-bold" },
  pending_review: { label: "Pending Review", class: "bg-amber-50 text-amber-800 border-amber-300 font-bold" },
  under_review: { label: "Under Review", class: "bg-amber-50 text-amber-800 border-amber-300 font-bold" },
  needs_revision: { label: "Needs Revision", class: "bg-orange-50 text-orange-800 border-orange-300 font-bold" },
  accepted: { label: "Approved & Accepted", class: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold shadow-2xs" },
  declined: { label: "Declined", class: "bg-rose-50 text-rose-700 border-rose-300 font-bold" },
  rejected: { label: "Declined", class: "bg-rose-50 text-rose-700 border-rose-300 font-bold" },
  archived: { label: "Archived", class: "bg-muted text-muted-foreground border-border font-semibold" },
  withdrawn: { label: "Withdrawn", class: "bg-muted text-muted-foreground border-border font-semibold" },
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
      include: {
        submission_files: {
          orderBy: [{ version: "desc" }, { created_at: "desc" }],
        },
      },
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

  let authorAvatar: string | null = null;
  if (author?.notes) {
    try {
      const parsed = JSON.parse(author.notes);
      if (parsed.avatar) authorAvatar = parsed.avatar;
    } catch {
      // plain text note
    }
  }
  const initialLetter = authorDisplayName.charAt(0).toUpperCase();

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

      {/* Welcome Banner with Author Portrait */}
      <header className="relative overflow-hidden rounded-[28px] border border-[#7e2562]/15 bg-white p-6 shadow-plum-sm sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-[#7e2562]/20 bg-gradient-to-br from-[#7e2562] to-[#591443] flex items-center justify-center text-white shadow-plum-sm">
              {authorAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={authorAvatar} alt={authorDisplayName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl sm:text-3xl font-extrabold">{initialLetter}</span>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">


              </div>
              <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                Welcome, {authorDisplayName}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/author/submit"
              className="apple-button inline-flex items-center gap-2 rounded-xl bg-[#7E2562] px-5 py-3 text-xs font-extrabold text-background shadow-xs hover:opacity-90 transition-all"
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
        <a
          href="#manuscripts"
          className="rounded-2xl border border-black/10 bg-surface p-5 dark:border-white/10 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all group shadow-2xs block cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-muted-foreground group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
              In Review
            </span>
            <ArrowRight size={13} className="text-amber-600 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="mt-1.5 text-2xl font-black text-amber-600 sm:text-3xl">
            {inReviewCount}
          </p>
          <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">Manuscripts being evaluated</span>
        </a>

        <a
          href="#manuscripts"
          className="rounded-2xl border border-black/10 bg-surface p-5 dark:border-white/10 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all group shadow-2xs block cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-muted-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
              Approved Titles
            </span>
            <ArrowRight size={13} className="text-emerald-600 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="mt-1.5 text-2xl font-black text-emerald-600 sm:text-3xl">
            {approvedCount}
          </p>
          <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">Accepted for publishing</span>
        </a>

        <a
          href="#production"
          className="rounded-2xl border border-black/10 bg-surface p-5 dark:border-white/10 hover:border-purple-500/40 hover:bg-purple-500/5 transition-all group shadow-2xs block cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-muted-foreground group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">
              In Production
            </span>
            <ArrowRight size={13} className="text-purple-600 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="mt-1.5 text-2xl font-black text-warning sm:text-3xl">
            {inProductionCount}
          </p>
          <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">DTP, ISBN &amp; Proofing</span>
        </a>

        <Link
          href="/author/contracts"
          className="rounded-2xl border border-[#7e2562]/20 bg-[#faedf5]/40 p-5 hover:bg-[#faedf5] transition-all group shadow-2xs block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-[#7e2562]">My Contracts</span>
            <ArrowRight size={13} className="text-[#7e2562] group-hover:translate-x-0.5 transition-transform" />
          </div>
          <p className="mt-1.5 text-2xl font-black text-[#7e2562] sm:text-3xl">{contracts.length}</p>
          <span className="text-[11px] font-bold text-[#7e2562]/80">View legal agreements</span>
        </Link>
      </div>

      {/* SECTION 1: Live Production Pipeline (The Works Being Done) */}
      <section id="production" className="scroll-mt-6 rounded-[24px] border border-black/10 bg-surface p-6 shadow-sm dark:border-white/10 sm:p-7">
        <div className="flex items-center justify-between border-b border-black/[0.06] pb-4 dark:border-white/[0.08]">
          <div>
            <h2 className="text-lg font-bold text-foreground">Live Production Flow</h2>
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
                "printing",
                "final_proof",
                "completed",
              ];
              const currentStageIdx = project.status === "completed" ? PIPELINE_ORDER.length : PIPELINE_ORDER.indexOf(project.status);

              const stages = [
                { key: "under_contract", name: "Contract Signed" },
                { key: "dtp", name: "DTP / Typeset" },
                { key: "editing", name: "Editorial Review" },
                { key: "cover_design", name: "Cover Design" },
                { key: "isbn_registration", name: "ISBN Assigned", extra: project.isbn_registered },
                { key: "printing", name: "Press Printing", extra: project.print_jobs?.qty ? `${project.print_jobs.qty} copies` : (project.author_copies_qty ? `${project.author_copies_qty} author copies` : null) },
                { key: "final_proof", name: "Final Proof" },
              ].map((st) => {
                const stepIdx = PIPELINE_ORDER.indexOf(st.key);
                const done = project.status === "completed" || (currentStageIdx !== -1 && stepIdx < currentStageIdx);
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
                      <span className="text-[11px] font-mono font-bold   text-primary">
                        Production Track · {project.titles.language || "Malayalam"}
                      </span>
                      <h3 className="text-base font-extrabold text-foreground  ">
                        {project.titles.name}
                      </h3>
                      {project.titles.name_ml && (
                        <p className="text-xs text-muted-foreground">{project.titles.name_ml}</p>
                      )}
                    </div>
                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-bold text-foreground border border-black/10 shadow-xs dark:border-white/10">
                        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        Status: {project.status === "editing" && project.proof_feedback ? "UNDER REWORK" : project.status === "completed" ? "PUBLISHED" : project.status.replace(/_/g, " ").toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Visual Stepper */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6 pt-3">
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
                        <svg className="h-4 w-4 text-warning shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
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
                            Manuscript Layout &amp; Cover Proofs
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
                        <svg className="h-4 w-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
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
      <section id="manuscripts" className="scroll-mt-6 rounded-[24px] border border-black/10 bg-surface p-6 shadow-sm dark:border-white/10 sm:p-7">
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
          <div className="py-14 text-center text-sm text-muted-foreground bg-[#faf6f9]/50 rounded-2xl border border-[#7e2562]/10 p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7e2562]/10 text-[#7e2562] mb-3">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <p className="font-bold text-foreground text-base">No manuscripts submitted yet.</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Once you submit a manuscript via the onboarding portal, it will be automatically linked and tracked in real time here.
            </p>
            <Link
              href="/author/submit"
              className="apple-button mt-4 inline-flex items-center gap-2 rounded-xl bg-[#7e2562] px-6 py-2.5 text-xs font-extrabold text-white shadow-plum-sm hover:bg-[#681b50] transition-all"
            >
              <span>Submit Your First Manuscript</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {submissions.map((sub) => {
              const matchedContract = contracts.find((c) => {
                const meta = parseContractNotes(c.term_notes);
                if (meta.submission_id && meta.submission_id === sub.id) return true;
                if (meta.submission_ref && meta.submission_ref === sub.ref_no) return true;
                if (c.titles.name.toLowerCase() === sub.title.toLowerCase()) return true;
                if (sub.title_ml && c.titles.name_ml?.toLowerCase() === sub.title_ml.toLowerCase()) return true;
                return false;
              });

              const matchedProject = projects.find(
                (p) =>
                  p.titles.name.toLowerCase() === sub.title.toLowerCase() ||
                  (sub.title_ml && p.titles.name_ml?.toLowerCase() === sub.title_ml.toLowerCase())
              );

              const matchedMeta = matchedContract ? parseContractNotes(matchedContract.term_notes) : null;
              const isRenegotiation = matchedMeta?.renegotiation_requested ?? false;
              const isContractDeclined = matchedMeta?.status === "declined" || Boolean(matchedMeta?.declined_at);

              const trackerData: TrackerData = {
                id: sub.id,
                refNo: sub.ref_no,
                title: sub.title,
                titleMl: sub.title_ml,
                genre: sub.genre,
                language: sub.language,
                submittedAt: sub.submitted_at,
                statusCode: isContractDeclined
                  ? "declined"
                  : isRenegotiation
                  ? "renegotiation_requested"
                  : sub.status,
                statusLabel: isContractDeclined
                  ? "Offer Concluded / Declined"
                  : isRenegotiation
                  ? "Terms Review in Progress"
                  : STATUS_LABELS[sub.status]?.label || sub.status,
                reviewNotes: sub.review_notes,
                contractId: matchedContract?.id,
                contractSignedOn: matchedContract?.signed_on,
                contractStatus: matchedContract?.signed_on ? "signed" : matchedMeta?.status,
                renegotiationRequested: isRenegotiation,
                productionId: matchedProject?.id,
                productionStatus: matchedProject?.status,
                courierDocket: matchedProject?.author_dispatch_tracking,
                authorCopiesQty: matchedProject?.author_copies_qty,
                manuscriptFilename: sub.manuscript_filename,
                manuscriptSize: sub.manuscript_size,
                coverFilename: sub.cover_filename,
                coverSize: sub.cover_size,
                coverMime: sub.cover_mime,
                submissionFiles: sub.submission_files,
              };

              return <OrderTracker key={sub.id} data={trackerData} />;
            })}
          </div>
        )}
      </section>

      {/* SECTION 3: Dedicated Author Contracts Section Banner */}
      <section id="contracts" className="scroll-mt-6 rounded-[28px] border border-[#7e2562]/20 bg-[#faedf5]/60 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#7e2562] text-white shadow-plum-xs">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-black text-foreground">My Author Contracts &amp; Agreements</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Contracts are now located in a dedicated section for your author account ({contracts.length} contract{contracts.length === 1 ? "" : "s"}). View dual-signed agreements, royalty terms, and pending offers.
            </p>
          </div>
        </div>

        <Link
          href="/author/contracts"
          className="apple-button inline-flex items-center gap-2 shrink-0 rounded-2xl bg-[#7e2562] px-6 py-3 text-xs font-extrabold text-white shadow-plum-sm hover:bg-[#681b50] transition-all"
        >
          <span>Open My Contracts Page</span>
          <ArrowRight size={13} />
        </Link>
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
              <ArrowRight size={12} />
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
                    <span className="text-[10px] font-mono   text-muted-foreground">
                      {t.category || "General"} · {t.language}
                    </span>
                    <h3 className="text-base font-extrabold text-foreground   mt-0.5">
                      {t.name}
                    </h3>
                    {t.name_ml && <p className="text-xs text-muted-foreground  ">{t.name_ml}</p>}
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
                    <span className="block text-[10px] font-bold   tracking-wider text-muted-foreground mb-1.5">
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
