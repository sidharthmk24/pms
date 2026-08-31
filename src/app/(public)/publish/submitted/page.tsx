import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Submission Received · Kairali Books" };
export const dynamic = "force-dynamic";

export default async function SubmittedPage({ searchParams }: PageProps<"/publish/submitted">) {
  const { ref, weeks } = await searchParams;
  const refNo = typeof ref === "string" ? ref : "—";
  const responseWeeks = typeof weeks === "string" ? weeks : "8";

  return (
    <div className="mx-auto max-w-2xl animate-apple-in px-4 py-12 text-center sm:py-16">
      {/* Success Badge */}
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground text-background shadow-md">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="h-8 w-8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>

      <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/[0.04] px-3.5 py-1 text-xs font-bold text-muted-foreground dark:border-white/10 dark:bg-white/[0.06]">
        <span className="h-2 w-2 rounded-full bg-foreground/80" />
        <span>Submission Confirmed</span>
      </div>

      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Manuscript Received
      </h1>
      <p className="mt-3 text-base text-muted-foreground">
        Thank you for submitting your work to Kairali Books. Our editorial committee has received your manuscript.
      </p>

      {/* Details Card */}
      <div className="my-8 rounded-[24px] border border-black/[0.08] bg-surface/90 p-7 text-left shadow-[0_2px_8px_rgba(0,0,0,0.02)] backdrop-blur-xl dark:border-white/[0.1] dark:bg-surface/80 sm:p-8">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Submission Telemetry</h2>
        <dl className="mt-5 space-y-4">
          <div className="flex items-center justify-between border-b border-black/[0.06] pb-3.5 dark:border-white/[0.08]">
            <dt className="text-sm font-semibold text-muted-foreground">Reference Tracking Number</dt>
            <dd className="numeric rounded-xl bg-black/[0.05] px-3.5 py-1 text-base font-bold text-foreground dark:bg-white/[0.08]">
              {refNo}
            </dd>
          </div>
          <div className="flex items-center justify-between pt-1">
            <dt className="text-sm font-semibold text-muted-foreground">Expected Editorial Reply</dt>
            <dd className="text-base font-bold text-foreground">Within {responseWeeks} weeks</dd>
          </div>
        </dl>
      </div>

      {/* Confirmation Note */}
      <div className="rounded-2xl border border-black/[0.06] bg-black/[0.02] p-5 text-left text-sm leading-relaxed text-muted-foreground dark:border-white/[0.08] dark:bg-white/[0.03]">
        <p>
          We have dispatched an automated confirmation email to your registered address with this reference code.
          Please keep this number safe for any future correspondence with our editorial staff.
        </p>
      </div>

      {/* Action Navigation */}
      <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/publish"
          className="apple-button inline-flex items-center gap-2 rounded-2xl border border-black/15 bg-surface px-6 py-3.5 text-sm font-bold text-foreground shadow-xs hover:bg-black/5 dark:border-white/15 dark:bg-surface-muted/60 dark:hover:bg-white/10"
        >
          <span>Return to Guidelines</span>
        </Link>
      </div>
    </div>
  );
}

