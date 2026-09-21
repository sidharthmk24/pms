import { z } from "zod";
import { fail, handler, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireApiCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stamp } from "@/lib/time";

const EditorOrderSchema = z.object({
  editorIds: z.array(z.string()).min(1, "At least one editor ID is required"),
});

export const GET = handler(async () => {
  await requireApiCapability("users.manage");

  const [orderSetting, counter] = await Promise.all([
    prisma.settings.findUnique({
      where: { key: "editors.round_robin_order" },
    }),
    prisma.counters.findUnique({
      where: { name: "submission_editor_rr" },
    }),
  ]);

  let editorIds: string[] = [];
  if (orderSetting?.value) {
    try {
      editorIds = JSON.parse(orderSetting.value);
    } catch {
      editorIds = [];
    }
  }

  return ok({
    editorIds,
    counterValue: counter?.value ?? 0,
  });
});

export const POST = handler(async (req: Request) => {
  const admin = await requireApiCapability("users.manage");

  const json = await req.json().catch(() => null);
  const { editorIds } = EditorOrderSchema.parse(json);

  const now = stamp();

  await prisma.settings.upsert({
    where: { key: "editors.round_robin_order" },
    create: {
      key: "editors.round_robin_order",
      value: JSON.stringify(editorIds),
      updated_at: now,
      updated_by: admin.id,
    },
    update: {
      value: JSON.stringify(editorIds),
      updated_at: now,
      updated_by: admin.id,
    },
  });

  await audit({
    userId: admin.id,
    action: "update_editor_round_robin_order",
    entity: "settings",
    entityId: "editors.round_robin_order",
    detail: { editorIds },
  });

  return ok({ success: true, editorIds });
});
