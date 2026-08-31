import "server-only";
import { prisma } from "@/lib/prisma";
import { stamp } from "@/lib/time";

const DEFAULTS = {
  "submissions.response_weeks": "8",
  "submissions.open": "true",
} as const;

export type SettingKey = keyof typeof DEFAULTS;

export async function getSetting(key: SettingKey): Promise<string> {
  const row = await prisma.settings.findUnique({ where: { key } });
  return row?.value ?? DEFAULTS[key];
}

export async function getSettings<K extends SettingKey>(keys: K[]): Promise<Record<K, string>> {
  const rows = await prisma.settings.findMany({ where: { key: { in: keys } } });
  const found = new Map(rows.map((r) => [r.key, r.value]));
  return Object.fromEntries(keys.map((k) => [k, found.get(k) ?? DEFAULTS[k]])) as Record<K, string>;
}

export async function setSetting(key: SettingKey, value: string, userId?: string): Promise<void> {
  await prisma.settings.upsert({
    where: { key },
    create: { key, value, updated_at: stamp(), updated_by: userId ?? null },
    update: { value, updated_at: stamp(), updated_by: userId ?? null },
  });
}

export async function getResponseWeeks(): Promise<number> {
  const raw = await getSetting("submissions.response_weeks");
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 8;
}

export async function submissionsOpen(): Promise<boolean> {
  return (await getSetting("submissions.open")) !== "false";
}
