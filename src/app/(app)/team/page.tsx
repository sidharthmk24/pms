import type { Metadata } from "next";
import { requireCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TeamClient from "./team-client";

export const metadata: Metadata = { title: "Team & Roles" };
export const dynamic = "force-dynamic";

export default async function TeamManagementPage() {
  const user = await requireCapability("users.manage");

  const users = await prisma.users.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      created_at: true,
      _count: {
        select: {
          submissions: true,
        },
      },
    },
    orderBy: { created_at: "asc" },
  });

  return (
    <div className="space-y-6">
      <TeamClient users={users} currentUserId={user.id} />
    </div>
  );
}
