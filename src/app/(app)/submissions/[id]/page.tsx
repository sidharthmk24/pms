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
    new: "bg-primary/10 text-primary",
    pending_review: "bg-warning/10 text-warning",
    under_review: "bg-warning/10 text-warning",
    needs_revision: "bg-accent/10 text-accent",
    accepted: "bg-success/10 text-success",
    declined: "bg-danger/10 text-danger",
    archived: "bg-muted-foreground/10 text-muted-foreground",
    withdrawn: "bg-muted-foreground/10 text-muted-foreground",
  }[sub.status] ?? "bg-surface-muted text-foreground";

  return (
    <div className="mx-auto max-w-4xl">
      <nav className="mb-6 text-sm">
        <Link href="/submissions" className="text-muted-foreground hover:text-foreground">
          ← Back to submissions list
        </Link>
      </nav>

      <header className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <span className="numeric text-xs font-semibold text-muted-foreground">
            Submission Reference: {sub.ref_no}
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{sub.title}</h1>
          {sub.title_ml && (
            <p className="font-ml text-base text-muted-foreground mt-1">{sub.title_ml}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${statusClass}`}>
            {STATUS_LABELS[sub.status] ?? sub.status}
          </span>
          <span className="text-xs text-muted-foreground">
            Submitted {formatIST(sub.submitted_at)}
          </span>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Side: Metadata Card */}
        <section className="space-y-6 md:col-span-1">
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
              Author Details
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Name</dt>
                <dd className="font-medium text-foreground">{sub.author_name}</dd>
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

          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
              Metadata
            </h2>
            <div className="space-y-3 text-sm">
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
                  <dd className="font-medium text-foreground">
                    {sub.users?.name ?? "Unassigned"}
                  </dd>
                )}
                {sub.assigned_at && (
                  <span className="block text-[10px] text-muted-foreground mt-0.5">
                    Assigned: {formatIST(sub.assigned_at)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {sub.manuscript_filename && (
            <div className="rounded-xl border border-border bg-surface p-5 text-center">
              <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Manuscript Attachment
              </span>
              <p className="text-xs font-medium text-foreground truncate mb-4">
                {sub.manuscript_filename}
              </p>
              <a
                href={`/api/submissions/${sub.id}/download`}
                className="inline-flex w-full justify-center items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover"
              >
                Download File ({Math.round((sub.manuscript_size ?? 0) / 1024 / 1024 * 100) / 100} MB)
              </a>
            </div>
          )}
        </section>

        {/* Right Side: Main content */}
        <section className="space-y-6 md:col-span-2">
          {/* Synopsis Display */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Synopsis
            </h2>
            <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
              {sub.synopsis}
            </div>
          </div>

          {/* Feedback or Contract Status details */}
          {sub.review_notes && (
            <div className="rounded-xl border border-border bg-surface p-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Review Notes & Feedback
              </h2>
              <div className="text-sm text-foreground whitespace-pre-wrap bg-surface-muted/50 p-4 border border-border rounded-lg leading-relaxed">
                {sub.review_notes}
              </div>
            </div>
          )}

          {sub.status === "accepted" && contract && (
            <div className="rounded-xl border border-success/20 bg-success/5 p-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-success mb-3">
                Generated Contract & Publishing Details
              </h2>
              <div className="space-y-3 text-sm text-foreground">
                <div className="grid grid-cols-2 border-b border-success/10 pb-2">
                  <span className="text-muted-foreground">Publishing Option</span>
                  <span className="font-semibold capitalize">
                    {sub.publishing_type?.replace("_", " ") ?? "—"}
                  </span>
                </div>
                <div className="grid grid-cols-2 border-b border-success/10 pb-2">
                  <span className="text-muted-foreground">Royalty Rate</span>
                  <span className="font-semibold">{contract.royalty_pct}% ({contract.basis} basis)</span>
                </div>
                <div className="grid grid-cols-2 border-b border-success/10 pb-2">
                  <span className="text-muted-foreground">Advance Pay</span>
                  <span className="numeric font-semibold">
                    ₹{new Intl.NumberFormat("en-IN").format(contract.advance_paise / 100)}
                  </span>
                </div>
                <div className="grid grid-cols-2 pt-1 border-b border-success/10 pb-2">
                  <span className="text-muted-foreground">Author Digital Signature</span>
                  <span className="font-semibold">
                    {contract.signed_on ? (
                      <span className="text-success">Signed on {formatIST(contract.signed_on, false)}</span>
                    ) : (
                      <span className="text-warning">Pending Author Signature</span>
                    )}
                  </span>
                </div>
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground font-medium">Author Agreement Link</span>
                  <a
                    href={`/publish/contract/${contract.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-success hover:underline"
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
              <div className="rounded-lg bg-surface-muted p-4 text-xs text-muted-foreground">
                Only the assigned editor ({sub.users?.name ?? "Unassigned"}) or the manager can review and submit decisions.
              </div>
            )
          )}
        </section>
      </div>
    </div>
  );
}
