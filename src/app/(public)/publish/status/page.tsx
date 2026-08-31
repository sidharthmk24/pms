import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import TrackingDashboard from "./tracking-dashboard";

export const metadata: Metadata = { title: "Track Your Manuscript · Kairali Books" };
export const dynamic = "force-dynamic";

export default async function StatusTrackingPage({ searchParams }: PageProps<"/publish/status">) {
  const { ref, email } = await searchParams;

  const refNo = typeof ref === "string" ? ref.trim() : undefined;
  const authorEmail = typeof email === "string" ? email.trim().toLowerCase() : undefined;

  let submission = null;
  let contract = null;
  let production = null;
  let errorMsg = null;

  if (refNo && authorEmail) {
    submission = await prisma.submissions.findFirst({
      where: {
        ref_no: { equals: refNo, mode: "insensitive" },
        email: { equals: authorEmail, mode: "insensitive" },
      },
    });

    if (!submission) {
      errorMsg = "We could not find any submission matching those details. Please check your reference code and email address.";
    } else if (submission.status === "accepted") {
      contract = await prisma.contracts.findFirst({
        where: {
          term_notes: { contains: submission.ref_no },
        },
      });
      if (contract) {
        production = await prisma.production_projects.findFirst({
          where: { title_id: contract.title_id },
        });
      }
    }
  }

  return (
    <div className="mx-auto max-w-2xl animate-apple-in px-4 py-8 sm:py-12">
      {/* Navigation */}
      <nav className="mb-6">
        <Link
          href="/publish"
          className="apple-button inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-surface px-3.5 py-1.5 text-xs font-bold text-muted-foreground shadow-xs hover:bg-black/5 hover:text-foreground dark:border-white/10 dark:bg-surface-muted/60 dark:hover:bg-white/10"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Guidelines</span>
        </Link>
      </nav>

      {/* Header */}
      <header className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/[0.04] px-3.5 py-1 text-xs font-bold text-muted-foreground dark:border-white/10 dark:bg-white/[0.06]">
          <span className="h-2 w-2 rounded-full bg-foreground/80" />
          <span>Author Tracking Portal</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Track Your Manuscript
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Check live review progress, editorial feedback, revision requests, or digitally sign your publishing contract.
        </p>
      </header>

      {submission ? (
        <TrackingDashboard submission={submission} contract={contract} production={production} />
      ) : (
        <section className="rounded-[28px] border border-black/[0.08] bg-surface/90 p-7 shadow-[0_4px_16px_rgba(0,0,0,0.02)] backdrop-blur-xl dark:border-white/[0.1] dark:bg-surface/80 sm:p-9">
          <form method="GET" action="/publish/status" className="space-y-6">
            <div>
              <label htmlFor="ref" className="mb-2 block text-sm font-bold text-foreground">
                Reference Number <span className="text-danger">*</span>
              </label>
              <input
                id="ref"
                name="ref"
                type="text"
                required
                placeholder="e.g. SUB-2026-0004"
                defaultValue={refNo ?? ""}
                className="w-full rounded-xl border border-black/15 bg-background/90 px-4 py-3.5 text-base font-semibold text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground dark:border-white/15 dark:bg-surface-muted/80"
              />
              <p className="mt-1.5 text-xs font-medium text-muted-foreground">
                Found in your confirmation email or submission receipt screen
              </p>
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-bold text-foreground">
                Author Email Address <span className="text-danger">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                defaultValue={authorEmail ?? ""}
                className="w-full rounded-xl border border-black/15 bg-background/90 px-4 py-3.5 text-base font-semibold text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground dark:border-white/15 dark:bg-surface-muted/80"
              />
              <p className="mt-1.5 text-xs font-medium text-muted-foreground">
                The email address you submitted with the manuscript
              </p>
            </div>

            {errorMsg && (
              <div role="alert" className="rounded-2xl border border-danger/20 bg-danger/10 p-4 text-sm font-bold text-danger">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              className="apple-button inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-md hover:bg-primary-hover"
            >
              <span>Check Manuscript Status</span>
              <svg className="h-5 w-5 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>
        </section>
      )}
    </div>
  );
}

