import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import ProofApprovalClient from "./proof-approval-client";

export const metadata: Metadata = {
  title: "Author Final Proof Approval · Kairali Books",
  description: "Review your typeset manuscript and cover jacket files, and digitally confirm sign-off before printing.",
};

export const dynamic = "force-dynamic";

export default async function ProofApprovalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  const proj = await prisma.production_projects.findUnique({
    where: { id },
    include: {
      titles: {
        include: {
          authors: true,
          contracts: true,
        },
      },
    },
  });

  if (!proj) notFound();

  // Validate security token or logged in user
  const sessionUser = await getSessionUser();
  const isTokenMatch = Boolean(token && proj.proof_token && token === proj.proof_token);
  const isStaff = Boolean(sessionUser && (sessionUser.role === "owner" || sessionUser.role === "editor" || sessionUser.role === "production"));

  let isAuthorSession = false;
  if (sessionUser) {
    const linkedContract = await prisma.contracts.findFirst({
      where: {
        title_id: proj.title_id,
        authors: { email: { equals: sessionUser.email, mode: "insensitive" } },
      },
    });
    if (linkedContract) isAuthorSession = true;
  }

  const isAuthorized = isTokenMatch || isStaff || isAuthorSession;

  if (!isAuthorized) {
    return (
      <div className="mx-auto max-w-xl py-16 px-4 text-center">
        <div className="rounded-3xl border border-danger/20 bg-danger/5 p-8 space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger text-xl font-bold">
            🔒
          </div>
          <h1 className="text-xl font-bold text-foreground">Access Restricted</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The proof approval link is invalid, expired, or missing the authorization token. Please check the link in your email or log in to your Author Portal.
          </p>
          <div className="pt-2">
            <Link
              href="/author"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary-hover transition"
            >
              Go to Author Portal →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const authorName = proj.titles.authors?.name || "Author";
  const isbn = proj.titles.isbn || proj.isbn_registered;

  return (
    <div className="mx-auto max-w-3xl py-10 px-4 sm:px-6 space-y-8 animate-apple-in">
      {/* Brand Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-black/[0.08] pb-6 dark:border-white/[0.1]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="  font-black text-xl text-primary tracking-tight">Kairali Books</span>
            <span className="text-xs text-muted-foreground  ">· കൈരളി ബുക്സ്</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground  ">
            Author Final Proof Sign-Off
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Review typeset manuscript interior &amp; cover jacket before mass press execution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-black/10 bg-surface px-3 py-1 text-xs font-bold text-muted-foreground dark:border-white/10">
            {proj.titles.category || "Literature"} · {proj.titles.language || "Malayalam"}
          </span>
        </div>
      </header>

      {/* Book Metadata Card */}
      <section className="rounded-2xl border border-black/10 bg-surface p-6 shadow-sm dark:border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-primary font-bold">
              Publication Title
            </span>
            <h2 className="text-xl font-extrabold text-foreground  ">
              {proj.titles.name}
            </h2>
            {proj.titles.name_ml && (
              <p className="text-sm text-muted-foreground">{proj.titles.name_ml}</p>
            )}
            <p className="text-xs text-muted-foreground pt-1">
              Author: <strong>{authorName}</strong>
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5 border-t sm:border-t-0 pt-3 sm:pt-0 border-black/5 dark:border-white/5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Allocated ISBN
            </span>
            <span className="font-mono text-sm font-bold text-foreground">
              {isbn || "Assigned in Registry"}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
              ✓ Registered with National Agency
            </span>
          </div>
        </div>
      </section>

      {/* Interactive Sign-off & Inspection Client Component */}
      <ProofApprovalClient
        projectId={proj.id}
        token={token || proj.proof_token || ""}
        title={proj.titles.name}
        authorName={authorName}
        isbn={isbn}
        hasLayout={Boolean(proj.final_layout_path)}
        hasCover={Boolean(proj.final_cover_path)}
        isAlreadyApproved={Boolean(proj.proof_approved_at)}
        approvedAt={proj.proof_approved_at}
        initialStatus={proj.status}
      />
    </div>
  );
}
