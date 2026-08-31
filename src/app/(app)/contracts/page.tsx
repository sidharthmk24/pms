import type { Metadata } from "next";
import { requireCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ContractsClient from "./contracts-client";

export const metadata: Metadata = { title: "Contracts & Agreements · Kairali PMS" };
export const dynamic = "force-dynamic";

export default async function ContractsPage() {
  const user = await requireCapability("contracts.read");

  const contracts = await prisma.contracts.findMany({
    include: {
      authors: {
        select: {
          id: true,
          name: true,
          name_ml: true,
          email: true,
          phone: true,
          pan: true,
          address: true,
        },
      },
      titles: {
        select: {
          id: true,
          name: true,
          name_ml: true,
          category: true,
          language: true,
          stock: true,
          status: true,
        },
      },
    },
    orderBy: { created_at: "desc" },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Publishing Contracts
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage author agreements, commercial terms, and digital dual-signature workflows.
          </p>
        </div>
      </div>

      <ContractsClient
        contracts={contracts}
        currentUserId={user.id}
        currentUserName={user.name}
      />
    </div>
  );
}
