import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { submissionsOpen } from "@/lib/settings";
import SubmissionForm from "@/app/(public)/publish/submit/submission-form";

export const metadata: Metadata = {
  title: "Submit Manuscript · Author Portal",
  description: "Submit a new book manuscript for editorial review by Kairali Books.",
};
export const dynamic = "force-dynamic";

export default async function AuthorSubmitPage() {
  const user = await requireUser();
  const isOpen = await submissionsOpen();

  const author = await prisma.authors.findFirst({
    where: { email: { equals: user.email, mode: "insensitive" } },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Top Breadcrumb / Back Link */}
      <div>
        <Link
          href="/author"
          className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <svg
            className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Author Dashboard</span>
        </Link>
      </div>

      {/* Header Banner */}
      <header className="rounded-[28px] border border-black/10 bg-surface p-6 shadow-sm backdrop-blur-xl dark:border-white/10 sm:p-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Author Intake Portal
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              Logged in as {user.email}
            </span>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl ">
            Submit a New Manuscript
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Fill in your manuscript details and upload your draft file. Once submitted, your work will be instantly assigned to an editor and tracked live on your Author Dashboard.
          </p>
        </div>
      </header>

      {!isOpen ? (
        <div className="rounded-3xl border border-warning/20 bg-warning/10 p-8 text-center text-sm font-bold text-warning">
          Submissions are temporarily closed for editorial intake. Please check back later.
        </div>
      ) : (
        <SubmissionForm
          isAuthorPortal={true}
          initialAuthorName={author?.name || user.name || ""}
          initialEmail={user.email}
          initialPhone={author?.phone || ""}
          initialPlace={author?.address || ""}
          onSuccessRedirect="/author"
        />
      )}
    </div>
  );
}
