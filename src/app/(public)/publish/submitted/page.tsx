import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Submission Received · Kairali Books" };
export const dynamic = "force-dynamic";

export default async function SubmittedPage({ searchParams }: PageProps<"/publish/submitted">) {
  const { ref, weeks, name, email } = await searchParams;
  const refNo = typeof ref === "string" ? ref : "—";
  const responseWeeks = typeof weeks === "string" ? weeks : "4";
  const authorName = typeof name === "string" ? name : "";
  const authorEmail = typeof email === "string" ? email : "";

  const registerQuery = new URLSearchParams();
  if (refNo && refNo !== "—") registerQuery.set("ref", refNo);
  if (authorName) registerQuery.set("name", authorName);
  if (authorEmail) registerQuery.set("email", authorEmail);
  const registerUrl = `/author/register?${registerQuery.toString()}`;

  return (
    <div className="mx-auto max-w-3xl animate-apple-in px-4 py-12 text-center sm:py-16">
      {/* Success Badge */}
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-sm bg-gradient-to-br from-[#7e2562] to-[#591443] text-white shadow-plum-md">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="h-10 w-10">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>

      <div className="mb-3 inline-flex items-center gap-2 rounded-sm border border-[#7e2562]/20 bg-[#faedf5] px-4 py-1.5 text-xs font-bold text-[#7e2562]">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>Manuscript Intake Confirmed</span>
      </div>

      <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        Manuscript Received Successfully!
      </h1>
      <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl mx-auto">
        {authorName ? `Thank you, ${authorName}. ` : "Thank you. "}
        Your manuscript has been safely ingested into the Kairali Books editorial repository.
      </p>

      {/* Telemetry Tracking Reference Box */}
      <div className="my-8 rounded-sm border border-[#7e2562]/15 bg-white p-6 sm:p-8 text-left shadow-plum-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#7e2562]/10 pb-5">
          <div>
            <span className="text-xs font-bold   tracking-wider text-[#7e2562]">
              Unique Submission Reference
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">Keep this reference identifier for your records</p>
          </div>
          <span className="numeric self-start sm:self-auto rounded-sm bg-[#faedf5] border border-[#7e2562]/25 px-4 py-2 text-lg font-black text-[#7e2562] font-mono tracking-wider">
            {refNo}
          </span>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-foreground">Estimated Decision Window:</span>
            <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-sm">
              Within {responseWeeks} weeks
            </span>
          </div>
          <span className="text-muted-foreground text-xs">
            Assigned to: Senior Editorial Evaluation Board
          </span>
        </div>
      </div>

      {/* PROMINENT CLAIM & CREATE AUTHOR ACCOUNT BANNER */}
      <div className="relative overflow-hidden rounded-sm border-2 border-[#7e2562] bg-gradient-to-br from-[#faf4f8] via-white to-[#faedf5] p-7 sm:p-10 text-left shadow-plum-md my-8">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-[#7e2562]/10 blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-sm bg-[#7e2562] px-3.5 py-1 text-xs font-bold text-white shadow-plum-sm">
              <span>★</span>
              <span>Next Step: Author Portal Activation</span>
            </div>

            <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl ">
              Create Your Author Account
            </h2>

            <p className="text-sm text-foreground/80 leading-relaxed">
              Activate your personal author account to unlock <strong>Amazon/Flipkart-style live tracking</strong> for this manuscript, follow editorial stages, review reader reports, and sign digital contracts.
            </p>

            <ul className="grid sm:grid-cols-2 gap-2.5 pt-2 text-xs font-semibold text-foreground/90">
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-emerald-100 text-emerald-700 text-[11px] font-bold">✓</span>
                <span>Live Delivery-Style Tracking</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-emerald-100 text-emerald-700 text-[11px] font-bold">✓</span>
                <span>Direct Editorial Communication</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-emerald-100 text-emerald-700 text-[11px] font-bold">✓</span>
                <span>Instant Auto-Linking to Dashboard</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-emerald-100 text-emerald-700 text-[11px] font-bold">✓</span>
                <span>Royalty &amp; Contract Access</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col items-center sm:items-start shrink-0">
            <Link
              href={registerUrl}
              className="apple-button group inline-flex w-full sm:w-auto items-center justify-center gap-3 rounded-sm bg-[#7e2562] px-8 py-4 text-base font-extrabold text-white shadow-plum-md hover:bg-[#681b50] hover:shadow-plum-lg active:scale-[0.99] transition-all cursor-pointer"
            >
              <span>Set Up Author Account</span>
              <svg className="h-5 w-5 opacity-90 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
            <p className="mt-2.5 text-center sm:text-left text-[11px] font-medium text-muted-foreground">
              Takes less than 1 minute · Instant dashboard access
            </p>
          </div>
        </div>
      </div>

      {/* Secondary Actions */}
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href={`/publish/status?ref=${encodeURIComponent(refNo)}`}
          className="apple-button inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-sm border border-[#7e2562]/20 bg-white px-6 py-3.5 text-xs font-bold text-[#7e2562] shadow-xs hover:bg-[#faedf5] transition-all"
        >
          <span>Check Status with Ref ID</span>
        </Link>
        <Link
          href="/publish"
          className="apple-button inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-sm border border-black/10 bg-white px-6 py-3.5 text-xs font-bold text-muted-foreground shadow-xs hover:text-foreground hover:bg-black/5 transition-all"
        >
          <span>Return to Guidelines</span>
        </Link>
      </div>
    </div>
  );
}
