import type { Metadata } from "next";
import { requireCapability, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuthorBooksClient, type AuthorBookItem } from "./author-books-client";

export const metadata: Metadata = {
  title: "My Published Books · Author Portal · Kairali Books",
  description: "View all published, printed, and circulated titles, ISBN allocations, and distribution channels.",
};

export const dynamic = "force-dynamic";

export default async function AuthorBooksPage() {
  await requireCapability("author_portal.access");
  const user = await requireUser();

  const author = await prisma.authors.findFirst({
    where: { email: { equals: user.email, mode: "insensitive" } },
  });

  const titlesData = await prisma.titles.findMany({
    where: {
      AND: [
        author?.id
          ? {
              OR: [
                { author_id: author.id },
                { contracts: { is: { author_id: author.id } } },
                { contracts: { authors: { email: { equals: user.email, mode: "insensitive" } } } },
              ],
            }
          : {
              contracts: {
                is: {
                  authors: { email: { equals: user.email, mode: "insensitive" } },
                },
              },
            },
        {
          OR: [
            {
              production_projects: {
                OR: [
                  { status: "completed" },
                  { print_completed_at: { not: null } },
                ],
              },
            },
            {
              production_projects: null,
              stock: { gt: 0 },
            },
          ],
        },
      ],
    },
    include: {
      contracts: {
        select: {
          basis: true,
          royalty_pct: true,
          advance_paise: true,
          signed_on: true,
        },
      },
      production_projects: {
        select: {
          id: true,
          status: true,
          print_completed_at: true,
          final_cover_path: true,
          final_layout_path: true,
          author_copies_qty: true,
          author_copies_dispatched_at: true,
          author_dispatch_tracking: true,
          channels_activated: true,
        },
      },
      print_jobs: {
        select: {
          job_no: true,
          qty: true,
          status: true,
          received_on: true,
        },
      },
    },
    orderBy: { created_at: "desc" },
  });

  const categoriesSet = new Set<string>();
  titlesData.forEach((t) => {
    if (t.category && t.category.trim()) {
      categoriesSet.add(t.category.trim().toLowerCase());
    }
  });
  const categories = Array.from(categoriesSet).sort();

  const books: AuthorBookItem[] = titlesData.map((t) => ({
    id: t.id,
    name: t.name,
    name_ml: t.name_ml,
    isbn: t.isbn,
    category: t.category,
    language: t.language,
    edition: t.edition,
    edition_no: t.edition_no,
    mrp_paise: t.mrp_paise,
    pages: t.pages,
    binding: t.binding,
    stock: t.stock,
    status: t.status,
    created_at: t.created_at,
    contracts: t.contracts,
    production_projects: t.production_projects,
    print_jobs: t.print_jobs,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground  ">
            My Published Books &amp; Printed Titles
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Official catalog records, printed edition specs, sales channels, and complimentary author copies.
          </p>
        </div>
      </div>

      <AuthorBooksClient initialBooks={books} categories={categories} />
    </div>
  );
}
