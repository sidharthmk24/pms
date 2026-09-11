import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatIST } from "@/lib/time";
import { can } from "@/lib/roles";
import ReviewForm from "./review-form";
import ReassignSelect from "../reassign-select";

export const metadata: Metadata = { title: "Submission Review" };
export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  new: "Pending Review",
  pending_review: "Pending Review",
  under_review: "Under Review",
  needs_revision: "Needs Revision",
  accepted: "Accepted",
  declined: "Declined",
  archived: "Archived",
  withdrawn: "Withdrawn",
};

const GENRE_LABELS: Record<string, string> = {
  novel: "Novel",
  short_stories: "Short Stories",
  poetry: "Poetry",
  essays: "Essays / Non-Fiction",
  biography: "Biography / Memoir",
  childrens: "Children's Literature",
  translation: "Translation",
  drama: "Drama",
  travelogue: "Travelogue",
  academic: "Academic / Reference",
  other: "Other",
};

export default async function SubmissionDetailPage({ params }: PageProps<"/submissions/[id]">) {
  const user = await requireCapability("submissions.read");
  const { id } = await params;

  const sub = await prisma.submissions.findUnique({
    where: { id },
    include: {
      users: { select: { id: true, name: true, role: true } },
    },
  });

  if (!sub) notFound();

  const isManager = can(user.role, "submissions.manage");
  const isEditorOrOwner = user.role === "editor" || user.role === "owner";
  const isAssignedEditor = sub.reviewed_by === user.id;
  const canReview = isEditorOrOwner && (isAssignedEditor || user.role === "owner") && ["new", "pending_review", "under_review", "needs_revision"].includes(sub.status);

  let editors: { id: string; name: string; role: string }[] = [];
  if (isManager) {
    editors = await prisma.users.findMany({
      where: { active: true, role: "editor" },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    });
  }

  // If accepted, retrieve contract if it exists for additional context
  let contract = null;
  if (sub.status === "accepted") {
    // Look up the contract linked to this submission
    // A submission acceptance creates a title with author, term notes mention sub.ref_no
    contract = await prisma.contracts.findFirst({
      where: {
        term_notes: { contains: sub.ref_no },
      },
      include: {
        titles: { select: { name: true } },
        authors: { select: { name: true } },
      },
    });
  }

  const statusClass = {
    new: "bg-[#faedf5] text-[#7e2562] border border-[#7e2562]/25 font-bold",
    pending_review: "bg-[#faedf5] text-[#7e2562] border border-[#7e2562]/25 font-bold",
    under_review: "bg-amber-50 text-amber-800 border border-amber-300 font-bold",
    needs_revision: "bg-orange-50 text-orange-800 border border-orange-300 font-bold",
    accepted: "bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold shadow-2xs",
    declined: "bg-rose-50 text-rose-800 border border-rose-300 font-bold",
    archived: "bg-gray-100 text-gray-700 border border-gray-200 font-semibold",
    withdrawn: "bg-gray-100 text-gray-700 border border-gray-200 font-semibold",
  }[sub.status] ?? "bg-gray-100 text-gray-700 border border-gray-200";

  const statusDot = {
    new: "bg-[#7e2562]",
    pending_review: "bg-[#7e2562]",
    under_review: "bg-amber-600",
    needs_revision: "bg-orange-600",
    accepted: "bg-emerald-600",
    declined: "bg-rose-600",
    archived: "bg-gray-500",
    withdrawn: "bg-gray-500",
  }[sub.status] ?? "bg-gray-500";

  return (
    <div className="mx-auto max-w-6xl animate-apple-in space-y-6">
      {/* Top Left Back Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/submissions"
          className="apple-button inline-flex items-center gap-2 rounded-xl border border-[#7e2562]/20 bg-white px-3.5 py-2 text-xs font-bold text-[#7e2562] shadow-2xs hover:bg-[#faedf5] hover:border-[#7e2562]/35 transition-all group"
        >
          <svg className="h-4 w-4 text-[#7e2562] transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Submissions</span>
        </Link>
      </div>

      {/* Header with Title and Status */}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end border-b border-[#7e2562]/10 pb-6">
        <div>
         
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {sub.title}
          </h1>
          {sub.title_ml && (
            <p className="font-ml text-base font-medium text-muted-foreground mt-1">{sub.title_ml}</p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            Submitted by <strong>{sub.author_name}</strong> on {formatIST(sub.submitted_at)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold whitespace-nowrap shadow-2xs ${statusClass}`}>
            {/* <span className={`h-2 w-2 rounded-full ${statusDot}`} /> */}
            {STATUS_LABELS[sub.status] ?? sub.status}
          </span>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Side: Metadata Card */}
        <section className="space-y-6 md:col-span-1">
          <div className="rounded-3xl border border-[#7e2562]/12 bg-white p-6 shadow-plum-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
              Author Details
            </h2>
            <div className="space-y-3.5 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Name</dt>
                <dd className="font-bold text-foreground text-sm">{sub.author_name}</dd>
                {sub.author_name_ml && (
                  <dd className="font-ml text-xs text-muted-foreground mt-0.5">{sub.author_name_ml}</dd>
                )}
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Email</dt>
                <dd className="font-medium text-foreground">{sub.email}</dd>
              </div>
              {sub.phone && (
                <div>
                  <dt className="text-xs text-muted-foreground">Phone</dt>
                  <dd className="numeric font-medium text-foreground">{sub.phone}</dd>
                </div>
              )}
              {sub.place && (
                <div>
                  <dt className="text-xs text-muted-foreground">Town / District</dt>
                  <dd className="font-medium text-foreground">{sub.place}</dd>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-[#7e2562]/12 bg-white p-6 shadow-plum-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
              Metadata &amp; Assignment
            </h2>
            <div className="space-y-3.5 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Genre</dt>
                <dd className="font-medium text-foreground">{GENRE_LABELS[sub.genre] ?? sub.genre}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Language</dt>
                <dd className="font-medium text-foreground">{sub.language}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground mb-1">Assigned Editor</dt>
                {isManager && ["new", "pending_review", "under_review", "needs_revision"].includes(sub.status) ? (
                  <div className="mt-1">
                    <ReassignSelect
                      submissionId={sub.id}
                      currentEditorId={sub.reviewed_by}
                      currentEditorName={sub.users?.name}
                      editors={editors}
                    />
                  </div>
                ) : (
                  <dd className="font-semibold text-foreground">
                    {sub.users?.name ?? "Unassigned"}
                  </dd>
                )}
                {sub.assigned_at && (
                  <span className="block text-[10px] text-muted-foreground mt-1">
                    Assigned: {formatIST(sub.assigned_at)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {sub.manuscript_filename && (
            <div className="rounded-3xl border border-[#7e2562]/12 bg-white p-6 shadow-plum-sm text-center">
              <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Manuscript Attachment
              </span>
              <p className="text-xs font-medium text-foreground truncate mb-4">
                {sub.manuscript_filename}
              </p>
              <a
                href={`/api/submissions/${sub.id}/download`}
                className="apple-button inline-flex w-full justify-center items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-plum-sm hover:bg-primary-hover transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download Manuscript ({Math.round((sub.manuscript_size ?? 0) / 1024 / 1024 * 100) / 100} MB)</span>
              </a>
            </div>
          )}
        </section>

        {/* Right Side: Main content */}
        <section className="space-y-6 md:col-span-2">
          {/* Synopsis Display */}
          <div className="rounded-3xl border border-[#7e2562]/12 bg-white p-6 shadow-plum-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Synopsis &amp; Abstract
            </h2>
            <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
              {sub.synopsis}
            </div>
          </div>

          {/* Feedback or Contract Status details */}
          {sub.review_notes && (
            <div className="rounded-3xl border border-[#7e2562]/12 bg-white p-6 shadow-plum-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Review Notes &amp; Editorial Feedback
              </h2>
              <div className="text-sm text-foreground whitespace-pre-wrap bg-[#faedf5]/40 p-4 border border-[#7e2562]/15 rounded-2xl leading-relaxed">
                {sub.review_notes}
              </div>
            </div>
          )}

          {sub.status === "accepted" && contract && (
            <div className="rounded-3xl border border-emerald-500/25 bg-emerald-50/40 p-6 shadow-plum-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-3">
                Generated Contract &amp; Publishing Details
              </h2>
              <div className="space-y-3 text-sm text-foreground">
                <div className="grid grid-cols-2 border-b border-emerald-500/10 pb-2">
                  <span className="text-muted-foreground">Publishing Option</span>
                  <span className="font-semibold capitalize">
                    {sub.publishing_type?.replace("_", " ") ?? "—"}
                  </span>
                </div>
                <div className="grid grid-cols-2 border-b border-emerald-500/10 pb-2">
                  <span className="text-muted-foreground">Royalty Rate</span>
                  <span className="font-semibold">{contract.royalty_pct}% ({contract.basis} basis)</span>
                </div>
                <div className="grid grid-cols-2 border-b border-emerald-500/10 pb-2">
                  <span className="text-muted-foreground">Advance Pay</span>
                  <span className="numeric font-semibold">
                    ₹{new Intl.NumberFormat("en-IN").format(contract.advance_paise / 100)}
                  </span>
                </div>
                <div className="grid grid-cols-2 pt-1 border-b border-emerald-500/10 pb-2">
                  <span className="text-muted-foreground">Author Digital Signature</span>
                  <span className="font-semibold">
                    {contract.signed_on ? (
                      <span className="text-emerald-700 font-bold">Signed on {formatIST(contract.signed_on, false)}</span>
                    ) : (
                      <span className="text-amber-700 font-bold">Pending Author Signature</span>
                    )}
                  </span>
                </div>
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground font-medium">Author Agreement Link</span>
                  <a
                    href={`/publish/contract/${contract.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline"
                  >
                    <span>Open Author Signing Link</span>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Decision actions panel */}
          {canReview ? (
            <ReviewForm submissionId={sub.id} />
          ) : (
            !canReview && ["new", "pending_review", "under_review", "needs_revision"].includes(sub.status) && (
              <div className="rounded-2xl border border-black/10 bg-slate-50 p-4 text-xs text-muted-foreground">
                Only the assigned editor ({sub.users?.name ?? "Unassigned"}) or the manager can review and submit decisions.
              </div>
            )
          )}
        </section>
      </div>
    </div>
  );
}
