import type { Metadata } from "next";
import { requireCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TeamClient from "./team-client";

export const metadata: Metadata = { title: "Team & Roles" };
export const dynamic = "force-dynamic";

export default async function TeamManagementPage() {
  const user = await requireCapability("users.manage");

  const [users, orderSetting, rrCounter] = await Promise.all([
    prisma.users.findMany({
      where: {
        role: { not: "author" },
      },
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
      orderBy: [
        { active: "desc" },
        { created_at: "asc" },
      ],
    }),
    prisma.settings.findUnique({
      where: { key: "editors.round_robin_order" },
    }),
    prisma.counters.findUnique({
      where: { name: "submission_editor_rr" },
    }),
  ]);

  let initialEditorOrder: string[] = [];
  if (orderSetting?.value) {
    try {
      initialEditorOrder = JSON.parse(orderSetting.value);
    } catch {
      initialEditorOrder = [];
    }
  }

  return (
    <div className="space-y-6">
      <TeamClient
        users={users}
        currentUserId={user.id}
        initialEditorOrder={initialEditorOrder}
        rrCounterValue={rrCounter?.value ?? 0}
      />
    </div>
  );
}
