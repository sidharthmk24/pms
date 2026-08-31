import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { stamp } from "@/lib/time";

type AuditInput = {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  detail?: string | Record<string, unknown> | null;
};

/**
 * Append-only activity trail. Never let an audit failure take down the
 * operation it was recording — log and move on.
 */
export async function audit({ userId, action, entity, entityId, detail }: AuditInput): Promise<void> {
  try {
    await prisma.audit_log.create({
      data: {
        id: randomUUID(),
        user_id: userId ?? null,
        action,
        entity,
        entity_id: entityId ?? null,
        detail: detail == null ? null : typeof detail === "string" ? detail : JSON.stringify(detail),
        at: stamp(),
      },
    });
  } catch (err) {
    console.error("[audit] failed to record", { action, entity, entityId }, err);
  }
}
