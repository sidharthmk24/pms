import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { nextDocNo } from "@/lib/counters";
import { addHours, stamp } from "@/lib/time";
import type { SubmissionInput } from "@/lib/submission-fields";

export * from "@/lib/submission-fields";

const THROTTLE_MAX = 3;
const THROTTLE_WINDOW_HOURS = 24;

function hashIp(ip: string): string {
  return createHash("sha256")
    .update(`${ip}:${process.env.JWT_SECRET ?? "kairali"}`)
    .digest("hex");
}

/**
 * Per-IP throttle for the public form. Returns false when the caller has
 * exhausted the window. IPs are only ever stored as a salted hash.
 */
export async function allowSubmission(ip: string | null): Promise<boolean> {
  if (process.env.NODE_ENV !== "production") return true;
  if (!ip) return true;
  const ip_hash = hashIp(ip);
  const now = new Date();
  const windowStart = stamp(addHours(-THROTTLE_WINDOW_HOURS, now));

  const row = await prisma.submission_throttle.findUnique({ where: { ip_hash } });

  if (!row || row.window_start < windowStart) {
    await prisma.submission_throttle.upsert({
      where: { ip_hash },
      create: { ip_hash, count: 1, window_start: stamp(now), last_at: stamp(now) },
      update: { count: 1, window_start: stamp(now), last_at: stamp(now) },
    });
    return true;
  }

  if (row.count >= THROTTLE_MAX) return false;

  await prisma.submission_throttle.update({
    where: { ip_hash },
    data: { count: { increment: 1 }, last_at: stamp(now) },
  });
  return true;
}

export type ManuscriptMeta = {
  relativePath: string;
  filename: string;
  size: number;
  mime: string;
} | null;

/**
 * Creates the submission and claims its reference number in one transaction,
 * so a failure cannot leave a gap in the counter.
 */
export async function createSubmission(
  input: SubmissionInput,
  manuscript: ManuscriptMeta,
): Promise<{ id: string; refNo: string }> {
  return prisma.$transaction(async (tx) => {
    const refNo = await nextDocNo(tx, "submission", "SUB");
    const now = stamp();

    const activeEditors = await tx.users.findMany({
      where: { active: true, role: "editor" },
      orderBy: { email: "asc" },
    });
    const subCount = await tx.submissions.count();
    const editorId = activeEditors.length > 0 ? activeEditors[subCount % activeEditors.length].id : null;
    const assignedAt = editorId ? now : null;

    const row = await tx.submissions.create({
      data: {
        id: randomUUID(),
        ref_no: refNo,
        author_name: input.author_name,
        author_name_ml: emptyToNull(input.author_name_ml),
        email: input.email,
        phone: emptyToNull(input.phone),
        place: emptyToNull(input.place),
        title: input.title,
        title_ml: emptyToNull(input.title_ml),
        genre: input.genre,
        language: input.language,
        synopsis: input.synopsis,
        manuscript_path: manuscript?.relativePath ?? null,
        manuscript_filename: manuscript?.filename ?? null,
        manuscript_size: manuscript?.size ?? null,
        manuscript_mime: manuscript?.mime ?? null,
        status: "new",
        reviewed_by: editorId,
        assigned_at: assignedAt,
        source: "web",
        submitted_at: now,
        updated_at: now,
      },
      select: { id: true, ref_no: true },
    });

    return { id: row.id, refNo: row.ref_no };
  });
}

function emptyToNull(v: string | undefined | null): string | null {
  const t = v?.trim();
  return t ? t : null;
}
