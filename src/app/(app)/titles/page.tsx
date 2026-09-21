import type { Metadata } from "next";
import { requireCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasRole, hasAnyRole, parseUserRoles } from "@/lib/roles";
import { TitlesClient, type TitleItem } from "./titles-client";

export const metadata: Metadata = {
  title: "Published Books & Titles Catalog · Kairali Books",
  description: "Browse, filter, and inspect published titles, ISBN catalog records, and inventory stock.",
};

export const dynamic = "force-dynamic";

export default async function TitlesPage() {
  const user = await requireCapability("titles.read");

  const isOwner = hasRole(user.role, "owner");
  const isFullAccess = isOwner || hasAnyRole(user.role, ["production", "accounts", "store"]);

  let roleFilter: Record<string, unknown> | null = null;

  if (!isFullAccess) {
    const roles = parseUserRoles(user.role);

    if (roles.includes("editor")) {
      // Find submission IDs reviewed by this editor
      const reviewedSubmissions = await prisma.submissions.findMany({
        where: { reviewed_by: user.id },
        select: { id: true, ref_no: true },
      });
      const subIds = reviewedSubmissions.map((s) => s.id);
      const subRefs = reviewedSubmissions.map((s) => s.ref_no);

      // Find contracts referencing those submissions
      const contracts = subIds.length > 0
        ? await prisma.contracts.findMany({
            where: {
              OR: [
                ...subIds.map((id) => ({ term_notes: { contains: id } })),
                ...subRefs.map((ref) => ({ term_notes: { contains: ref } })),
              ],
            },
            select: { title_id: true },
          })
        : [];
      const submissionTitleIds = contracts.map((c) => c.title_id);

      roleFilter = {
        OR: [
          {
            production_projects: {
              OR: [
                { editing_assigned_to: user.id },
                { editing_assigned_to: user.name },
                { editing_assignees: { contains: user.id } },
                { editing_assignees: { contains: user.name } },
              ],
            },
          },
          ...(submissionTitleIds.length > 0
            ? [{ id: { in: submissionTitleIds } }]
            : []),
        ],
      };
    } else if (roles.includes("designer")) {
      roleFilter = {
        production_projects: {
          OR: [
            { cover_assigned_to: user.id },
            { cover_assigned_to: user.name },
            { cover_assignees: { contains: user.id } },
            { cover_assignees: { contains: user.name } },
          ],
        },
      };
    } else if (roles.includes("dtp")) {
      roleFilter = {
        production_projects: {
          OR: [
            { dtp_assigned_to: user.id },
            { dtp_assigned_to: user.name },
            { dtp_assignees: { contains: user.id } },
            { dtp_assignees: { contains: user.name } },
          ],
        },
      };
    } else if (roles.includes("proofreader")) {
      roleFilter = {
        production_projects: {
          OR: [
            { proof_assigned_to: user.id },
            { proof_assigned_to: user.name },
            { proof_assignees: { contains: user.id } },
            { proof_assignees: { contains: user.name } },
          ],
        },
      };
    }
  }

  const titlesData = await prisma.titles.findMany({
    where: {
      AND: [
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
        ...(roleFilter ? [roleFilter] : []),
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
          <h1 className="text-3xl font-black tracking-tight text-foreground ">
            Published Books &amp; Titles Catalog
          </h1>
          <p className="text-base text-muted-foreground mt-0.5">
            Comprehensive catalog of printed books, allocated ISBN records, warehouse stock balances, and commercial specifications.
          </p>
        </div>
      </div>

      {/* Main Table with interactive filters & sorting */}
      <TitlesClient initialTitles={titles} categories={categories} />
    </div>
  );
}
