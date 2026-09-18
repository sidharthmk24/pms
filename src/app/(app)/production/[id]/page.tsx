import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseContractNotes } from "@/lib/contracts";
import { hasRole } from "@/lib/roles";
import ProductionFlowClient from "./production-flow-client";

export const metadata: Metadata = { title: "Production Detail" };
export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  under_contract: "Under Contract",
  dtp: "DTP (Typesetting)",
  editing: "Editing & Proofreading",
  cover_design: "Cover Design",
  isbn_registration: "ISBN Registration",
  final_proof: "Author Final Proof",
  completed: "Completed / Published",
  cancelled: "Cancelled",
};

export default async function ProductionDetailPage({ params }: PageProps<"/production/[id]">) {
  const user = await requireCapability("production_pipeline.read");
  const isOwner = hasRole(user.role, "owner");
  const { id } = await params;

  const proj = await prisma.production_projects.findUnique({
    where: { id },
    include: {
      titles: {
        include: {
          authors: true,
        },
      },
      print_jobs: true,
    },
  });

  if (!proj) notFound();

  // Enforce that non-owner team members can only view projects assigned to them
  const allProjectAssignees = [
    proj.dtp_assigned_to,
    proj.dtp_assignees,
    proj.editing_assigned_to,
    proj.editing_assignees,
    proj.cover_assigned_to,
    proj.cover_assignees,
    proj.isbn_assigned_to,
    proj.isbn_assignees,
    proj.proof_assigned_to,
    proj.proof_assignees,
  ]
    .filter(Boolean)
    .join(",");

  const isAssignedToProject =
    allProjectAssignees.includes(user.id) ||
    allProjectAssignees.includes(user.name);

  if (!isOwner && !isAssignedToProject) {
    notFound();
  }

  const [contract, activeUsers] = await Promise.all([
    prisma.contracts.findFirst({
      where: { title_id: proj.title_id },
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

  const contractMeta = parseContractNotes(contract?.term_notes);
  const publishingType = contractMeta.publishing_type ?? "kairali_funded";
  const contractFreeCopies = contractMeta.free_copies ?? 10;

  // Determine active stage assignees
  let activeAssigneesStr: string | null = null;
  let activeAssigneeId: string | null = null;
  if (proj.status === "dtp") {
    activeAssigneeId = proj.dtp_assigned_to;
    activeAssigneesStr = proj.dtp_assignees;
  } else if (proj.status === "editing") {
    activeAssigneeId = proj.editing_assigned_to;
    activeAssigneesStr = proj.editing_assignees;
  } else if (proj.status === "cover_design") {
    activeAssigneeId = proj.cover_assigned_to;
    activeAssigneesStr = proj.cover_assignees;
  } else if (proj.status === "isbn_registration") {
    activeAssigneeId = proj.isbn_assigned_to;
    activeAssigneesStr = proj.isbn_assignees;
  } else if (proj.status === "final_proof") {
    activeAssigneeId = proj.proof_assigned_to;
    activeAssigneesStr = proj.proof_assignees;
  }

  const activeAssigneeList = activeAssigneesStr
    ? activeAssigneesStr.split(",").map((s) => s.trim()).filter(Boolean)
    : activeAssigneeId
    ? [activeAssigneeId]
    : [];

  const isAssignee =
    activeAssigneeList.includes(user.id) || activeAssigneeList.includes(user.name);
  const canAdvance = isAssignee || isOwner;

  // Financial estimations (for managers)
  const mrp = proj.titles.mrp_paise;
  const advance = contract?.advance_paise ?? 0;
  const printCost = proj.print_jobs?.cost_paise ?? 0;

  const statusClass =
    {
      under_contract: "bg-slate-100 text-slate-700 border-slate-300 font-bold",
      dtp: "bg-sky-50 text-sky-800 border-sky-300 font-bold",
      editing: "bg-amber-50 text-amber-800 border-amber-300 font-bold",
      cover_design: "bg-indigo-50 text-indigo-800 border-indigo-300 font-bold",
      isbn_registration: "bg-blue-50 text-blue-800 border-blue-300 font-bold",
      final_proof: "bg-orange-50 text-orange-800 border-orange-300 font-bold",
      printing: "bg-[#faedf5] text-[#7e2562] border-[#7e2562]/35 font-bold",
      post_production: "bg-teal-50 text-teal-800 border-teal-300 font-bold",
      completed: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold shadow-2xs",
      cancelled: "bg-rose-50 text-rose-800 border-rose-300 font-bold",
    }[proj.status] ?? "bg-slate-100 text-slate-700 border-slate-300";

  const statusDot =
    {
      under_contract: "bg-slate-500",
      dtp: "bg-sky-600",
      editing: "bg-amber-600",
      cover_design: "bg-indigo-600",
      isbn_registration: "bg-blue-600",
      final_proof: "bg-orange-600",
      printing: "bg-[#7e2562]",
      post_production: "bg-teal-600",
      completed: "bg-emerald-600",
      cancelled: "bg-rose-600",
    }[proj.status] ?? "bg-slate-500";

  return (
    <ProductionFlowClient
      proj={proj}
      isOwner={isOwner}
      canAdvance={canAdvance}
      publishingType={publishingType}
      contractFreeCopies={contractFreeCopies}
      activeUsers={activeUsers}
      contract={contract}
      mrp={mrp}
      advance={advance}
      printCost={printCost}
      statusClass={statusClass}
      statusDot={statusDot}
      statusLabels={STATUS_LABELS}
    />
  );
}
