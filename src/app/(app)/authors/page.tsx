import type { Metadata } from "next";
import { requireCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/roles";
import AuthorsClient, { type AuthorDetailItem } from "./authors-client";

export const metadata: Metadata = { title: "Authors & Contributors" };
export const dynamic = "force-dynamic";

export default async function AuthorsPage() {
  const user = await requireCapability("authors.read");
  const isOwner = hasRole(user.role, "owner");

  const [authors, authorUsers, submissions] = await Promise.all([
    prisma.authors.findMany({
      include: {
        titles: {
          select: {
            id: true,
            name: true,
            name_ml: true,
            isbn: true,
            category: true,
            language: true,
            edition: true,
            edition_no: true,
            mrp_paise: true,
            stock: true,
            status: true,
            created_at: true,
          },
          orderBy: { created_at: "desc" },
        },
        contracts: {
          select: {
            id: true,
            title_id: true,
            royalty_pct: true,
            basis: true,
            advance_paise: true,
            signed_on: true,
            term_notes: true,
            created_at: true,
            titles: {
              select: {
                id: true,
                name: true,
                name_ml: true,
              },
            },
          },
        },
        payouts: {
          select: {
            id: true,
            gross_paise: true,
            tds_paise: true,
            net_paise: true,
            paid_on: true,
            method: true,
            reference: true,
            note: true,
          },
          orderBy: { paid_on: "desc" },
        },
      },
      orderBy: { name: "asc" },
    }),

    prisma.users.findMany({
      where: { role: "author" },
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
        created_at: true,
      },
    }),

    prisma.submissions.findMany({
      select: {
        id: true,
        ref_no: true,
        title: true,
        title_ml: true,
        genre: true,
        email: true,
        author_name: true,
        status: true,
        submitted_at: true,
        decided_on: true,
      },
      orderBy: { submitted_at: "desc" },
    }),
  ]);

  // Group submissions by email
  const submissionsByEmail = new Map<string, typeof submissions>();
  for (const sub of submissions) {
    const key = sub.email.toLowerCase().trim();
    if (!submissionsByEmail.has(key)) {
      submissionsByEmail.set(key, []);
    }
    submissionsByEmail.get(key)!.push(sub);
  }

  // Lookup author user accounts by email
  const authorUsersByEmail = new Map<string, (typeof authorUsers)[0]>();
  for (const user of authorUsers) {
    authorUsersByEmail.set(user.email.toLowerCase().trim(), user);
  }

  // Build full author items
  const fullAuthors: AuthorDetailItem[] = authors.map((author) => {
    const emailKey = author.email?.toLowerCase().trim() || "";
    const userAccount = emailKey ? authorUsersByEmail.get(emailKey) ?? null : null;
    const authorSubmissions = emailKey ? submissionsByEmail.get(emailKey) ?? [] : [];

    return {
      id: author.id,
      name: author.name,
      name_ml: author.name_ml,
      phone: author.phone,
      email: author.email,
      address: author.address,
      pan: author.pan,
      notes: author.notes,
      created_at: author.created_at,
      titles: author.titles,
      contracts: author.contracts,
      payouts: author.payouts,
      userAccount,
      submissions: authorSubmissions,
      isSynthesized: false,
    };
  });

  // Check for any registered author user accounts without an authors table entry
  const existingEmails = new Set(
    authors
      .map((a) => a.email?.toLowerCase().trim())
      .filter((e): e is string => Boolean(e))
  );

  for (const u of authorUsers) {
    const key = u.email.toLowerCase().trim();
    if (!existingEmails.has(key)) {
      fullAuthors.push({
        id: `usr_${u.id}`,
        name: u.name,
        name_ml: null,
        phone: null,
        email: u.email,
        address: null,
        pan: null,
        notes: null,
        created_at: u.created_at,
        titles: [],
        contracts: [],
        payouts: [],
        userAccount: u,
        submissions: submissionsByEmail.get(key) ?? [],
        isSynthesized: true,
      });
    }
  }

  return (
    <div className="space-y-6">
      <AuthorsClient initialAuthors={fullAuthors} isOwner={isOwner} />
    </div>
  );
}
