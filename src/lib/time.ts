/**
 * The database stores timestamps as UTC strings, not native timestamp columns:
 *   timestamps -> 'YYYY-MM-DD HH24:MI:SS'
 *   dates      -> 'YYYY-MM-DD'
 * Every write must go through these helpers so app-generated values sort and
 * compare correctly against the column defaults.
 */

export function stamp(d: Date = new Date()): string {
  return d.toISOString().slice(0, 19).replace("T", " ");
}

export function dateOnly(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Parse a stored 'YYYY-MM-DD HH24:MI:SS' string as UTC. */
export function parseStamp(s: string): Date {
  return new Date(`${s.replace(" ", "T")}Z`);
}

export function addHours(hours: number, from: Date = new Date()): Date {
  return new Date(from.getTime() + hours * 3_600_000);
}

export function addMinutes(minutes: number, from: Date = new Date()): Date {
  return new Date(from.getTime() + minutes * 60_000);
}

/** Render a stored stamp in Asia/Kolkata for display. */
export function formatIST(s: string | null | undefined, withTime = true): string {
  if (!s) return "—";
  const d = s.length <= 10 ? new Date(`${s}T00:00:00Z`) : parseStamp(s);
  if (Number.isNaN(d.getTime())) return s;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" as const } : {}),
  }).format(d);
}
