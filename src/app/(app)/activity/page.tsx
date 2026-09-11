import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ActivityClient, { type EntityLookup } from "./activity-client";

export const metadata: Metadata = {
  title: "Activity & Audit Logs · Kairali PMS",
  description: "Comprehensive system logs, audit telemetry, and operational activity records across Kairali Books.",
};

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const user = await requireUser();
  if (user.role === "author") {
    redirect("/author");
  }

  // Fetch audit logs and entity dictionaries in parallel for human-readable resolution
  const [
    logs,
    authorsList,
    titlesList,
    submissionsList,
    contractsList,
    productionList,
    usersList,
  ] = await Promise.all([
    prisma.audit_log.findMany({
      orderBy: { at: "desc" },
      take: 1000,
      select: {
        id: true,
        action: true,
        entity: true,
        entity_id: true,
        detail: true,
        at: true,
        user_id: true,
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    }),
    prisma.authors.findMany({
      select: { id: true, name: true, name_ml: true, email: true },
    }),
    prisma.titles.findMany({
      select: { id: true, name: true, name_ml: true, isbn: true },
    }),
    prisma.submissions.findMany({
      select: { id: true, title: true, author_name: true, ref_no: true },
    }),
    prisma.contracts.findMany({
      select: {
        id: true,
        titles: { select: { name: true } },
        authors: { select: { name: true } },
      },
    }),
    prisma.production_projects.findMany({
      select: {
        id: true,
        titles: { select: { name: true } },
      },
    }),
    prisma.users.findMany({
      select: { id: true, name: true, email: true, role: true },
    }),
  ]);

  const entityLookup: EntityLookup = {
    authors: {},
    titles: {},
    submissions: {},
    contracts: {},
    production: {},
    users: {},
  };

  authorsList.forEach((a) => {
    entityLookup.authors[a.id] = a.name_ml ? `${a.name} (${a.name_ml})` : a.name;
  });

  titlesList.forEach((t) => {
    entityLookup.titles[t.id] = t.name_ml ? `${t.name} (${t.name_ml})` : t.name;
  });

  submissionsList.forEach((s) => {
    entityLookup.submissions[s.id] = {
      title: s.title,
      author_name: s.author_name,
      ref_no: s.ref_no,
    };
  });

  contractsList.forEach((c) => {
    entityLookup.contracts[c.id] = {
      title: c.titles?.name ?? "Unknown Title",
      author: c.authors?.name ?? "Unknown Author",
    };
  });

  productionList.forEach((p) => {
    entityLookup.production[p.id] = {
      title: p.titles?.name ?? "Production Project",
    };
  });

  usersList.forEach((u) => {
    entityLookup.users[u.id] = {
      name: u.name,
      role: u.role,
      email: u.email,
    };
  });

  return (
    <div className="mx-auto max-w-7xl animate-apple-in space-y-6">
      <ActivityClient
        initialLogs={logs}
        currentUserRole={user.role}
        entityLookup={entityLookup}
      />
    </div>
  );
}
