import type { Metadata } from "next";
import Link from "next/link";
import { getResponseWeeks, submissionsOpen } from "@/lib/settings";
import { GENRES } from "@/lib/submission-fields";
import { ALLOWED_LABEL, MAX_UPLOAD_BYTES } from "@/lib/storage";

export const metadata: Metadata = {
  title: "Publish With Us · Kairali Books",
  description: "Submit your manuscript to Kairali Books. Transparent editorial evaluation and publishing.",
};
export const dynamic = "force-dynamic";

export default async function PublishGuidelinesPage() {
  const [weeks, open] = await Promise.all([getResponseWeeks(), submissionsOpen()]);
  const maxMb = MAX_UPLOAD_BYTES / 1024 / 1024;

  return (
    <div className="mx-auto max-w-5xl animate-apple-in px-4 py-8 sm:py-14">
      {/* Hero Header Section */}
      <header className="mb-14 text-center sm:text-left">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/[0.04] px-4 py-1.5 text-xs font-bold text-muted-foreground dark:border-white/10 dark:bg-white/[0.06]">
          <span className="h-2 w-2 rounded-full bg-foreground/80" />
          <span>Author Submission Portal</span>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl sm:leading-[1.1]">
          Publish With Us
        </h1>

        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Kairali Books has proudly published renowned literature, criticism, and academic works for readers across Kerala and worldwide. Every manuscript submitted to our editorial committee is carefully read and evaluated.
        </p>

        {/* Feature Badges */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-surface px-3.5 py-1.5 text-xs font-bold text-foreground shadow-xs dark:border-white/10 dark:bg-surface-muted/60">
            <svg className="h-3.5 w-3.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>No Reading Fees</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-surface px-3.5 py-1.5 text-xs font-bold text-foreground shadow-xs dark:border-white/10 dark:bg-surface-muted/60">
            <svg className="h-3.5 w-3.5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{weeks}-Week Turnaround</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-surface px-3.5 py-1.5 text-xs font-bold text-foreground shadow-xs dark:border-white/10 dark:bg-surface-muted/60">
            <svg className="h-3.5 w-3.5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Digital Contract & Royalty</span>
          </span>
        </div>

        {/* Hero Actions */}
        {open && (
          <div className="mt-8 flex flex-col items-center gap-3.5 sm:flex-row">
            <Link
              href="/publish/submit"
              className="apple-button inline-flex w-full items-center justify-center gap-2.5 rounded-2xl bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-md hover:bg-primary-hover sm:w-auto"
            >
              <span>Begin Manuscript Submission</span>
              <svg className="h-5 w-5 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
            <Link
              href="/publish/status"
              className="apple-button inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-black/15 bg-surface px-6 py-4 text-sm font-bold text-foreground shadow-xs hover:bg-black/5 dark:border-white/15 dark:bg-surface-muted/60 dark:hover:bg-white/10 sm:w-auto"
            >
              <span>Track Existing Submission</span>
            </Link>
          </div>
        )}
      </header>

      {!open && (
        <div role="alert" className="mb-10 rounded-2xl border border-warning/20 bg-warning/10 p-5 text-base font-semibold text-warning">
          We have temporarily paused new submissions while reviewing current backlogs. Please check back soon.
        </div>
      )}

      {/* Section 1: What We Publish */}
      <section className="mb-10 rounded-[28px] border border-black/[0.08] bg-surface/90 p-7 shadow-[0_4px_16px_rgba(0,0,0,0.02)] backdrop-blur-xl dark:border-white/[0.1] dark:bg-surface/80 sm:p-9">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              What We Publish
            </h2>
            <p className="mt-1 text-base text-muted-foreground">
              We welcome completed original manuscripts in Malayalam and English, as well as authorized translations.
            </p>
          </div>
          <span className="rounded-full bg-black/[0.05] px-3.5 py-1 text-xs font-bold text-muted-foreground dark:bg-white/[0.08]">
            {GENRES.length} Categories
          </span>
        </div>

        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {GENRES.filter((g) => g.value !== "other").map((g) => (
            <li
              key={g.value}
              className="apple-button group flex items-center justify-between rounded-2xl border border-black/[0.08] bg-black/[0.02] p-4.5 transition-all hover:border-black/20 hover:bg-black/[0.04] dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-white/[0.06]"
            >
              <span className="text-base font-bold text-foreground">{g.en}</span>
              <svg className="h-4 w-4 opacity-40 transition-transform group-hover:translate-x-1 group-hover:opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </li>
          ))}
        </ul>
      </section>

      {/* Section 2: What to Send */}
      <section className="mb-10">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            What to Prepare
          </h2>
          <p className="mt-1 text-base text-muted-foreground">
            Please ensure you have the following ready before starting your submission form:
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {/* Card 1 */}
          <div className="flex flex-col justify-between rounded-[28px] border border-black/[0.08] bg-surface/90 p-7 shadow-[0_4px_16px_rgba(0,0,0,0.02)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 dark:border-white/[0.1] dark:bg-surface/80">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background shadow-sm">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="mt-5 text-xl font-bold text-foreground">1. Full Manuscript</h3>
              <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                One complete document ({ALLOWED_LABEL}) up to {maxMb} MB. Please submit finished manuscripts rather than preliminary excerpts.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Max {maxMb}MB · Single File
              </span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="flex flex-col justify-between rounded-[28px] border border-black/[0.08] bg-surface/90 p-7 shadow-[0_4px_16px_rgba(0,0,0,0.02)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 dark:border-white/[0.1] dark:bg-surface/80">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background shadow-sm">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="mt-5 text-xl font-bold text-foreground">2. Synopsis & Overview</h3>
              <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                A summary (min. 100 characters) covering the theme, target audience, key characters, and any previous publications or awards.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Minimum 100 characters
              </span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="flex flex-col justify-between rounded-[28px] border border-black/[0.08] bg-surface/90 p-7 shadow-[0_4px_16px_rgba(0,0,0,0.02)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 dark:border-white/[0.1] dark:bg-surface/80">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background shadow-sm">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="mt-5 text-xl font-bold text-foreground">3. Author Profile</h3>
              <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                Your full name, verified email address, phone number, and location so our editors can correspond with you directly.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Instant Confirmation Email
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: What Happens Next */}
      <section className="mb-14 rounded-[28px] border border-black/[0.08] bg-surface/90 p-7 shadow-[0_4px_16px_rgba(0,0,0,0.02)] backdrop-blur-xl dark:border-white/[0.1] dark:bg-surface/80 sm:p-9">
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            The Publishing Journey
          </h2>
          <p className="mt-1 text-base text-muted-foreground">
            What you can expect after submitting your manuscript to Kairali Books:
          </p>
        </div>

        <div className="space-y-6">
          {[
            {
              step: "01",
              title: "Immediate Reference Tracking Code",
              desc: "You will receive an automated tracking code (e.g. SUB-2026-0004) immediately on screen and delivered to your email inbox.",
            },
            {
              step: "02",
              title: "Comprehensive Editorial Review",
              desc: "Our editorial committee reviews every work without reading charges. We assess narrative structure, linguistic merit, and market relevance.",
            },
            {
              step: "03",
              title: `Formal Decision Within ${weeks} Weeks`,
              desc: `Whether accepted, requested for revision, or declined, our team guarantees a direct, transparent editorial response within ${weeks} weeks.`,
            },
          ].map((item, idx) => (
            <div
              key={item.step}
              className="flex items-start gap-5 rounded-2xl border border-black/[0.05] bg-black/[0.02] p-5.5 dark:border-white/[0.06] dark:bg-white/[0.03]"
            >
              <span className="numeric flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-sm font-bold text-background shadow-xs">
                {item.step}
              </span>
              <div>
                <h3 className="text-lg font-bold text-foreground">{item.title}</h3>
                <p className="mt-1 text-base font-medium leading-relaxed text-muted-foreground">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Primary CTA Bottom Banner */}
      {open && (
        <section className="relative overflow-hidden rounded-[28px] border border-black/15 bg-foreground p-8 text-center text-background shadow-xl dark:border-white/20 dark:bg-surface sm:p-12">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-background dark:text-foreground">
              Ready to Share Your Story?
            </h2>
            <p className="mt-3 text-base opacity-80 text-background dark:text-foreground">
              Join Kerala&apos;s celebrated authors. Submitting your manuscript takes less than 3 minutes.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
              <Link
                href="/publish/submit"
                className="apple-button inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-background px-8 py-4 text-base font-bold text-foreground shadow-md hover:bg-background/90 dark:bg-foreground dark:text-background sm:w-auto"
              >
                <span>Submit Manuscript Now</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}


