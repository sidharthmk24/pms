import type { Metadata } from "next";
import { requireCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TitlesClient, type TitleItem } from "./titles-client";

export const metadata: Metadata = {
  title: "Published Books & Titles Catalog · Kairali Books",
  description: "Browse, filter, and inspect published titles, ISBN catalog records, and inventory stock.",
};

export const dynamic = "force-dynamic";

export default async function TitlesPage() {
  await requireCapability("titles.read");

  const titlesData = await prisma.titles.findMany({
    where: {
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
    include: {
      authors: {
        select: {
          id: true,
          name: true,
          name_ml: true,
          email: true,
          phone: true,
        },
      },
      contracts: {
        select: {
          id: true,
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
        },
      },
      print_jobs: {
        orderBy: { created_at: "desc" },
        take: 1,
        select: {
          id: true,
          job_no: true,
          qty: true,
          status: true,
        },
      },
      stock_movements: {
        orderBy: { at: "desc" },
        take: 5,
        select: {
          id: true,
          qty_delta: true,
          reason: true,
          balance_after: true,
          at: true,
          note: true,
        },
      },
    },
    orderBy: { created_at: "desc" },
  });

  // Extract distinct categories
  const categoriesSet = new Set<string>();
  titlesData.forEach((t) => {
    if (t.category && t.category.trim()) {
      categoriesSet.add(t.category.trim().toLowerCase());
    }
  });
  const categories = Array.from(categoriesSet).sort();

  const titles: TitleItem[] = titlesData.map((t) => ({
    id: t.id,
    isbn: t.isbn,
    name: t.name,
    name_ml: t.name_ml,
    category: t.category,
    language: t.language,
    edition: t.edition,
    edition_no: t.edition_no,
    mrp_paise: t.mrp_paise,
    unit_cost_paise: t.unit_cost_paise,
    pages: t.pages,
    binding: t.binding,
    reorder_level: t.reorder_level,
    stock: t.stock,
    status: t.status,
    created_at: t.created_at,
    authors: t.authors,
    contracts: t.contracts,
    production_projects: t.production_projects,
    latest_print_job: t.print_jobs[0] || null,
    recent_movements: t.stock_movements,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground font-serif">
            Published Books &amp; Titles Catalog
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Comprehensive catalog of printed books, allocated ISBN records, warehouse stock balances, and commercial specifications.
          </p>
        </div>
      </div>

      {/* Main Table with interactive filters & sorting */}
      <TitlesClient initialTitles={titles} categories={categories} />
    </div>
  );
}
