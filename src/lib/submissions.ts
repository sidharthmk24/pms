import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { nextDocNo } from "@/lib/counters";
import { addHours, stamp } from "@/lib/time";
import type { SubmissionInput } from "@/lib/submission-fields";

export * from "@/lib/submission-fields";

const THROTTLE_MAX = process.env.SUBMISSION_THROTTLE_MAX
  ? parseInt(process.env.SUBMISSION_THROTTLE_MAX, 10)
  : 20;
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
  cover?: ManuscriptMeta,
): Promise<{ id: string; refNo: string }> {
  return prisma.$transaction(async (tx) => {
    const refNo = await nextDocNo(tx, "submission", "SUB");
    const now = stamp();

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
        cover_path: cover?.relativePath ?? null,
        cover_filename: cover?.filename ?? null,
        cover_size: cover?.size ?? null,
        cover_mime: cover?.mime ?? null,
        status: "new",
        reviewed_by: null,
        assigned_at: null,
        source: "web",
        submitted_at: now,
        updated_at: now,
      },
      select: { id: true, ref_no: true },
    });

    if (manuscript) {
      await tx.submission_files.create({
        data: {
          id: randomUUID(),
          submission_id: row.id,
          version: 1,
          file_type: "manuscript",
          file_path: manuscript.relativePath,
          filename: manuscript.filename,
          file_size: manuscript.size,
          file_mime: manuscript.mime,
          brief: "Initial manuscript submission",
          uploaded_by: "author",
          created_at: now,
        },
      });
    }

    if (cover) {
      await tx.submission_files.create({
        data: {
          id: randomUUID(),
          submission_id: row.id,
          version: 1,
          file_type: "cover",
          file_path: cover.relativePath,
          filename: cover.filename,
          file_size: cover.size,
          file_mime: cover.mime,
          brief: "Initial cover artwork submission",
          uploaded_by: "author",
          created_at: now,
        },
      });
    }

    return { id: row.id, refNo: row.ref_no };
  });
}

function emptyToNull(v: string | undefined | null): string | null {
  const t = v?.trim();
  return t ? t : null;
}
