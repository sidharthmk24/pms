import type { Metadata } from "next";
import Link from "next/link";
import { requireCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatIST, formatTimeIST } from "@/lib/time";
import { can, hasRole } from "@/lib/roles";
import { parseContractNotes } from "@/lib/contracts";
import SubmissionsFilterBar from "./submissions-filter-bar";
import ReassignSelect from "./reassign-select";

export const metadata: Metadata = { title: "Manuscript Submissions · Kairali PMS" };
export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  new: "Pending Review",
  under_review: "Under Review",
  needs_revision: "Needs Revision",
  accepted: "Accepted",
  declined: "Declined",
  archived: "Archived",
  withdrawn: "Withdrawn",
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  new: "bg-[#7e2562]/10 text-[#7e2562] border border-[#7e2562]/25 font-bold",
  pending_review: "bg-[#7e2562]/10 text-[#7e2562] border border-[#7e2562]/25 font-bold",
  under_review: "bg-amber-50 text-amber-800 border border-amber-300 font-bold",
  needs_revision: "bg-orange-50 text-orange-800 border border-orange-300 font-bold",
  accepted: "bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold shadow-2xs",
  declined: "bg-rose-50 text-rose-800 border border-rose-300 font-bold",
  archived: "bg-gray-100 text-gray-700 border border-gray-200 font-semibold",
  withdrawn: "bg-gray-100 text-gray-700 border border-gray-200 font-semibold",
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

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireCapability("submissions.read");
  const isManager = can(user.role, "submissions.manage") || hasRole(user.role, "owner");

  const params = await searchParams;
  const filterStatus = typeof params.status === "string" ? params.status : "all";
  const filterEditor = typeof params.editor === "string" ? params.editor : "";
  const filterSearch = typeof params.q === "string" ? params.q.trim() : "";
  const filterSort = typeof params.sort === "string" ? params.sort : "newest";

  // Build sorting
  let orderBy: Record<string, "asc" | "desc"> = { submitted_at: "desc" };
  if (filterSort === "oldest") orderBy = { submitted_at: "asc" };
  if (filterSort === "title") orderBy = { title: "asc" };
  if (filterSort === "author") orderBy = { author_name: "asc" };

  const [submissions, allActiveStaff] = await Promise.all([
    prisma.submissions.findMany({
      where: {
        ...(isManager
          ? filterEditor
            ? { reviewed_by: filterEditor }
            : {}
          : { reviewed_by: user.id }),
        ...(filterSearch
          ? {
              OR: [
                { title: { contains: filterSearch, mode: "insensitive" } },
                { author_name: { contains: filterSearch, mode: "insensitive" } },
                { email: { contains: filterSearch, mode: "insensitive" } },
                { ref_no: { contains: filterSearch, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(filterStatus !== "all"
          ? filterStatus === "pending"
            ? { status: { in: ["new", "pending_review"] } }
            : { status: filterStatus }
          : {}),
      },
      orderBy,
      include: {
        users: { select: { name: true, role: true } },
      },
    }),
    prisma.users.findMany({
      where: {
        active: true,
        role: { not: "author" },
      },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const acceptedSubIds = submissions.filter((s) => s.status === "accepted").map((s) => s.id);
  const acceptedSubRefs = submissions.filter((s) => s.status === "accepted").map((s) => s.ref_no);

  const relatedContracts = acceptedSubIds.length > 0
    ? await prisma.contracts.findMany({
        where: {
          OR: [
            ...acceptedSubIds.map((id) => ({ term_notes: { contains: id } })),
            ...acceptedSubRefs.map((ref) => ({ term_notes: { contains: ref } })),
          ],
        },
        select: {
          id: true,
          signed_on: true,
          term_notes: true,
        },
      })
    : [];

  const editors = allActiveStaff.filter(
    (u) => hasRole(u.role, "editor") || hasRole(u.role, "owner")
  );

  return (
    <div className="mx-auto max-w-6xl animate-apple-in space-y-6">
      {/* Header */}
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Manuscript Submissions
          </h1>
          <p className="mt-1.5 text-base text-muted-foreground">
            {isManager
              ? "Review and evaluate submitted book manuscripts"
              : "Manuscripts assigned to your editorial desk for evaluation"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-[#7e2562]/20 bg-white px-4 py-1.5 text-xs font-bold text-[#7e2562] shadow-2xs">
            {submissions.length} {isManager ? "Total Submissions" : "Assigned Manuscripts"}
          </span>
        </div>
      </header>

      {/* Filter Toolbar */}
      <SubmissionsFilterBar
        statusLabels={STATUS_LABELS}
        editors={editors}
        currentStatus={filterStatus}
        currentEditor={filterEditor}
        currentSort={filterSort}
        showEditorFilter={isManager}
      />

      {/* Submissions Table Card */}
      <section className="relative z-10 overflow-hidden rounded-3xl border border-[#7e2562]/15 bg-white shadow-plum-sm">
        {submissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7e2562]/8 text-[#7e2562]">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-base font-bold text-foreground">No submissions found</p>
            <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters or search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="border-b border-[#7e2562]/10 bg-[#faf6f9]/60 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-4 whitespace-nowrap">Ref # / Title</th>
                  <th className="px-6 py-4 whitespace-nowrap">Author</th>
                  <th className="px-6 py-4 whitespace-nowrap">Genre / Lang</th>
                  <th className="px-6 py-4 whitespace-nowrap">Status</th>
                  <th className="px-6 py-4 whitespace-nowrap">Assigned Editor</th>
                  <th className="px-6 py-4 text-right whitespace-nowrap">Submitted</th>
                  <th className="px-6 py-4 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#7e2562]/8">
                {submissions.map((sub) => {
                  const linkedContract = relatedContracts.find((c) => {
                    const meta = parseContractNotes(c.term_notes);
                    return (
                      (meta.submission_id && meta.submission_id === sub.id) ||
                      (meta.submission_ref && meta.submission_ref === sub.ref_no) ||
                      (c.term_notes && (c.term_notes.includes(sub.id) || c.term_notes.includes(sub.ref_no)))
                    );
                  });

                  const contractMeta = linkedContract ? parseContractNotes(linkedContract.term_notes) : null;
                  const isRenegotiation = contractMeta?.renegotiation_requested ?? false;
                  const isContractDeclined = contractMeta?.status === "declined" || Boolean(contractMeta?.declined_at);
                  const isSigned = Boolean(linkedContract?.signed_on);

                  const displayLabel = isContractDeclined
                    ? "Offer Concluded"
                    : isRenegotiation
                    ? "Terms Review Requested"
                    : isSigned
                    ? "Dual-Signed / In Production"
                    : STATUS_LABELS[sub.status] ?? sub.status;

                  const statusClass = isContractDeclined
                    ? "bg-rose-100 text-rose-800 border border-rose-300 font-bold"
                    : isRenegotiation
                    ? "bg-amber-100 text-amber-900 border border-amber-300 font-bold shadow-2xs"
                    : isSigned
                    ? "bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold shadow-2xs"
                    : STATUS_BADGE_STYLES[sub.status] ?? "bg-[#7e2562]/8 text-[#7e2562]";

                  return (
                    <tr
                      key={sub.id}
                      className="transition-colors hover:bg-[#faf6f9]/50"
                    >
                      <td className="px-6 py-4.5">
                        <span className="numeric block text-xs font-bold text-primary">
                          {sub.ref_no}
                        </span>
                        <span className="block text-base font-bold text-foreground">{sub.title}</span>
                      </td>
                      <td className="px-6 py-4.5 font-semibold text-foreground">{sub.author_name}</td>
                      <td className="px-6 py-4.5 text-sm">
                        <span className="font-semibold text-foreground">
                          {GENRE_LABELS[sub.genre] ?? sub.genre}
                        </span>
                        <span className="block text-xs text-muted-foreground">{sub.language}</span>
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap ${statusClass}`}>
                          {isRenegotiation ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse" />
                          ) : isSigned || sub.status === "accepted" ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                          ) : null}
                          {displayLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        {isManager ? (
                          <ReassignSelect
                            submissionId={sub.id}
                            currentEditorId={sub.reviewed_by}
                            currentEditorName={sub.users?.name}
                            editors={editors}
                          />
                        ) : (
                          <span className="text-sm font-semibold text-foreground">
                            {sub.users?.name ?? "Unassigned"}
                          </span>
                        )}
                      </td>
                      <td className="numeric px-6 py-4.5 text-right text-sm whitespace-nowrap">
                        <span className="block font-semibold text-foreground">
                          {formatIST(sub.submitted_at, false)}
                        </span>
                        <span className="block text-xs font-medium text-muted-foreground">
                          {formatTimeIST(sub.submitted_at)}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-right whitespace-nowrap">
                        <Link
                          href={`/submissions/${sub.id}`}
                          className="apple-button inline-flex items-center gap-1.5 rounded-xl border border-[#7e2562]/25 bg-white px-3.5 py-1.5 text-xs font-bold text-[#7e2562] shadow-2xs hover:bg-[#7e2562] hover:text-white hover:border-[#7e2562] hover:shadow-plum-sm transition-all group"
                        >
                          <span>Review</span>
                          <svg className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

