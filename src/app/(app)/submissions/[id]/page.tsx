import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatIST } from "@/lib/time";
import { can, hasRole, parseUserRoles } from "@/lib/roles";
import { parseContractNotes } from "@/lib/contracts";
import ReviewForm from "./review-form";
import ReassignSelect from "../reassign-select";
import ContractActions from "./contract-actions";
import { RevisionFeedbackView } from "@/components/revision-feedback-view";
import { ManuscriptVersionHistory } from "@/components/manuscript-version-history";

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
  academic: "Academic / Textbook",
  children: "Children's Literature",
  translation: "Translation",
  other: "Other",
};

export default async function SubmissionReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCapability("submissions.read");
  const { id } = await params;

  const sub = await prisma.submissions.findUnique({
    where: { id },
    include: {
      users: { select: { id: true, name: true, email: true, role: true } },
      submission_files: {
        orderBy: [{ version: "desc" }, { created_at: "desc" }],
      },
    },
  });

  if (!sub) notFound();

  const isManager = can(user.role, "submissions.manage") || hasRole(user.role, "owner");
  if (!isManager && sub.reviewed_by !== user.id) {
    notFound();
  }

  const isEditorOrOwner = hasRole(user.role, "editor") || hasRole(user.role, "owner");
  const isAssignedEditor = sub.reviewed_by === user.id;
  const canReview = isEditorOrOwner && (isAssignedEditor || hasRole(user.role, "owner")) && ["new", "pending_review", "under_review", "needs_revision"].includes(sub.status);

  let editors: { id: string; name: string; role: string; orderPos?: number; totalEditors?: number; isNext?: boolean }[] = [];
  if (isManager) {
    const [activeStaff, orderSetting, rrCounter] = await Promise.all([
      prisma.users.findMany({
        where: {
          active: true,
          role: { not: "author" },
        },
        select: { id: true, name: true, role: true },
        orderBy: { name: "asc" },
      }),
      prisma.settings.findUnique({
        where: { key: "editors.round_robin_order" },
      }),
      prisma.counters.findUnique({
        where: { name: "submission_editor_rr" },
      }),
    ]);

    let editorOrder: string[] = [];
    if (orderSetting?.value) {
      try {
        editorOrder = JSON.parse(orderSetting.value);
      } catch {
        editorOrder = [];
      }
    }

    const activeStaffEditors = activeStaff.filter(
      (u) => hasRole(u.role, "editor") || hasRole(u.role, "owner")
    );
    const dedicatedEditors = activeStaffEditors.filter((u) => parseUserRoles(u.role).includes("editor"));
    const sortedDedicated = (dedicatedEditors.length > 0 ? dedicatedEditors : activeStaffEditors).sort((a, b) => {
      const idxA = editorOrder.indexOf(a.id);
      const idxB = editorOrder.indexOf(b.id);
      const sortA = idxA !== -1 ? idxA : 9999;
      const sortB = idxB !== -1 ? idxB : 9999;
      if (sortA !== sortB) return sortA - sortB;
      return a.name.localeCompare(b.name);
    });

    const totalEditors = sortedDedicated.length;
    const nextIdx = totalEditors > 0 ? ((rrCounter?.value ?? 0) % totalEditors) : 0;

    editors = sortedDedicated.map((e, idx) => ({
      id: e.id,
      name: e.name,
      role: e.role,
      orderPos: idx + 1,
      totalEditors,
      isNext: idx === nextIdx,
    }));
  }

  // Retrieve linked contract if it exists for this submission
  const contract = await prisma.contracts.findFirst({
    where: {
      OR: [
        { term_notes: { contains: sub.id } },
        { term_notes: { contains: sub.ref_no } },
      ],
    },
    include: {
      titles: { select: { id: true, name: true } },
      authors: { select: { id: true, name: true, email: true } },
    },
  });

  const contractMeta = contract ? parseContractNotes(contract.term_notes) : null;
  const isRenegotiation = contractMeta?.renegotiation_requested ?? false;
  const isContractDeclined = contractMeta?.status === "declined" || Boolean(contractMeta?.declined_at);
  const isSigned = Boolean(contract?.signed_on);

  const displayStatusLabel = isContractDeclined
    ? "Contract Declined / Closed"
    : isRenegotiation
    ? "Terms Review Requested"
    : isSigned
    ? "Dual-Signed / In Production"
    : sub.status === "accepted"
    ? "Accepted (Awaiting Author Signature)"
    : STATUS_LABELS[sub.status] ?? sub.status;

  const statusClass = isContractDeclined
    ? "bg-rose-100 text-rose-800 border border-rose-300 font-bold"
    : isRenegotiation
    ? "bg-amber-100 text-amber-900 border border-amber-300 font-bold shadow-2xs"
    : isSigned
    ? "bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold shadow-2xs"
    : {
        new: "bg-amber-50 text-amber-800 border border-amber-300 font-bold",
        pending_review: "bg-amber-50 text-amber-800 border border-amber-300 font-bold",
        under_review: "bg-blue-50 text-blue-800 border border-blue-300 font-bold",
        needs_revision: "bg-orange-50 text-orange-800 border border-orange-300 font-bold",
        accepted: "bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold shadow-2xs",
        declined: "bg-rose-50 text-rose-800 border border-rose-300 font-bold",
        archived: "bg-gray-100 text-gray-700 border border-gray-200 font-semibold",
        withdrawn: "bg-gray-100 text-gray-700 border border-gray-200 font-semibold",
      }[sub.status] ?? "bg-gray-100 text-gray-700 border border-gray-200";

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
            {isRenegotiation && <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse" />}
            {displayStatusLabel}
          </span>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Side: Metadata Card */}
        <section className="space-y-6 md:col-span-1">
          <div className="rounded-3xl border border-[#7e2562]/12 bg-white p-6 shadow-plum-sm">
            <h2 className="text-xs font-bold   tracking-wider text-muted-foreground mb-4">
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
            <h2 className="text-xs font-bold   tracking-wider text-muted-foreground mb-4">
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
              <div className="flex items-center justify-between mb-2">
                <span className="block text-xs font-bold   tracking-wider text-muted-foreground">
                  Manuscript File
                </span>
                <span className="rounded-md bg-[#faedf5] px-2 py-0.5 text-[10px] font-bold text-[#7e2562]">
                  Draft Document
                </span>
              </div>
              <p className="text-xs font-medium text-foreground truncate mb-4" title={sub.manuscript_filename}>
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

          {sub.cover_filename && sub.cover_path ? (
            <div className="rounded-3xl border border-emerald-500/20 bg-white p-6 shadow-plum-sm text-center">
              <div className="flex items-center justify-between mb-2">
                <span className="block text-xs font-bold   tracking-wider text-muted-foreground">
                  Cover Design Attachment
                </span>
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  Author Cover
                </span>
              </div>

              {/* Cover Preview Image if visual format */}
              {(sub.cover_mime?.startsWith("image/") || /\.(png|jpg|jpeg|webp)$/i.test(sub.cover_filename)) && (
                <div className="mb-3 flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/submissions/${sub.id}/download?file=cover`}
                    alt="Author Cover Design"
                    className="h-32 w-24 rounded-lg object-cover shadow-sm border border-gray-200"
                  />
                </div>
              )}

              <p className="text-xs font-medium text-foreground truncate mb-4" title={sub.cover_filename}>
                {sub.cover_filename}
              </p>
              <a
                href={`/api/submissions/${sub.id}/download?file=cover`}
                className="apple-button inline-flex w-full justify-center items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-emerald-sm hover:bg-emerald-800 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download Cover Design ({Math.round((sub.cover_size ?? 0) / 1024 / 1024 * 100) / 100} MB)</span>
              </a>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50/60 p-4 text-center">
              <span className="block text-xs font-bold text-muted-foreground">Cover Design</span>
              <p className="text-[11px] text-muted-foreground/80 mt-0.5">None uploaded by author (standard editorial design applies)</p>
            </div>
          )}
        </section>

        {/* Right Side: Main content */}
        <section className="space-y-6 md:col-span-2">
          {/* Version History Card */}
          <div className="rounded-3xl border border-[#7e2562]/12 bg-white p-6 shadow-plum-sm">
            <ManuscriptVersionHistory
              submissionId={sub.id}
              files={sub.submission_files}
              fallbackManuscript={{
                filename: sub.manuscript_filename,
                size: sub.manuscript_size,
                submittedAt: sub.submitted_at,
              }}
              fallbackCover={{
                filename: sub.cover_filename,
                size: sub.cover_size,
                submittedAt: sub.submitted_at,
              }}
            />
          </div>

          {/* Synopsis Display */}
          <div className="rounded-3xl border border-[#7e2562]/12 bg-white p-6 shadow-plum-sm">
            <h2 className="text-xs font-bold   tracking-wider text-muted-foreground mb-3">
              Synopsis &amp; Abstract
            </h2>
            <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
              {sub.synopsis}
            </div>
          </div>

          {/* Feedback, Revisions or Decline Status details */}
          {(sub.review_notes || sub.status === "declined") && (
            <div className="rounded-3xl border border-[#7e2562]/12 bg-white p-6 shadow-plum-sm">
              <h2 className="text-xs font-bold   tracking-wider text-muted-foreground mb-3">
                {sub.status === "declined" ? "Decline Evaluation & Remarks" : "Review Notes & Editorial Feedback"}
              </h2>
              <RevisionFeedbackView notes={sub.review_notes} status={sub.status} />
            </div>
          )}

          {contract && (
            <div className="rounded-3xl border border-emerald-500/25 bg-emerald-50/40 p-6 shadow-plum-sm">
              <h2 className="text-xs font-bold   tracking-wider text-emerald-800 mb-3">
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
                  <span className="font-semibold">{contract.royalty_pct}%</span>
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

                <ContractActions
                  contract={{
                    id: contract.id,
                    royalty_pct: contract.royalty_pct,
                    basis: contract.basis,
                    advance_paise: contract.advance_paise,
                    signed_on: contract.signed_on,
                    term_notes: contract.term_notes,
                    titles: contract.titles,
                    authors: contract.authors,
                  }}
                  canManage={isEditorOrOwner}
                />
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
