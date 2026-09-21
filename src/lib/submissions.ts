import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { nextDocNo } from "@/lib/counters";
import { addHours, stamp } from "@/lib/time";
import { parseUserRoles, hasRole } from "@/lib/roles";
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

export type AssignedEditorInfo = {
  id: string;
  name: string;
  email: string;
} | null;

/**
 * Determines the next editor to assign using a fair round-robin rotation.
 */
export async function getNextRoundRobinEditor(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
): Promise<AssignedEditorInfo> {
  const activeStaff = await tx.users.findMany({
    where: {
      active: true,
      role: { not: "author" },
    },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { created_at: "asc" },
  });

  // Prioritize active users with explicit 'editor' role
  let eligibleEditors = activeStaff.filter((u) => parseUserRoles(u.role).includes("editor"));

  // Fallback if no dedicated editor accounts exist: include any staff with editor capability
  if (eligibleEditors.length === 0) {
    eligibleEditors = activeStaff.filter((u) => hasRole(u.role, "editor"));
  }

  if (eligibleEditors.length === 0) {
    return null;
  }

  // Retrieve custom editor ordering if configured
  const orderSetting = await tx.settings.findUnique({
    where: { key: "editors.round_robin_order" },
  });

  if (orderSetting?.value) {
    try {
      const orderIds: string[] = JSON.parse(orderSetting.value);
      if (Array.isArray(orderIds) && orderIds.length > 0) {
        eligibleEditors.sort((a, b) => {
          const idxA = orderIds.indexOf(a.id);
          const idxB = orderIds.indexOf(b.id);
          const sortA = idxA !== -1 ? idxA : 9999;
          const sortB = idxB !== -1 ? idxB : 9999;
          return sortA - sortB;
        });
      }
    } catch {
      // Fallback to default ordering
    }
  }

  // Atomically claim the next round-robin index
  const counter = await tx.counters.upsert({
    where: { name: "submission_editor_rr" },
    create: { name: "submission_editor_rr", value: 0 },
    update: { value: { increment: 1 } },
  });

  const nextIndex = Math.abs(counter.value) % eligibleEditors.length;
  const editor = eligibleEditors[nextIndex];
  return { id: editor.id, name: editor.name, email: editor.email };
}

/**
 * Creates the submission and claims its reference number in one transaction,
 * and automatically assigns an active editor via round-robin.
 */
export async function createSubmission(
  input: SubmissionInput,
  manuscript: ManuscriptMeta,
  cover?: ManuscriptMeta,
): Promise<{ id: string; refNo: string; assignedEditor: AssignedEditorInfo }> {
  return prisma.$transaction(async (tx) => {
    const refNo = await nextDocNo(tx, "submission", "SUB");
    const now = stamp();
    const assignedEditor = await getNextRoundRobinEditor(tx);
    const initialStatus = assignedEditor ? "under_review" : "new";
    const assignedAt = assignedEditor ? now : null;

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
        status: initialStatus,
        reviewed_by: assignedEditor?.id ?? null,
        assigned_at: assignedAt,
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

    return { id: row.id, refNo: row.ref_no, assignedEditor };
  });
}

function emptyToNull(v: string | undefined | null): string | null {
  const t = v?.trim();
  return t ? t : null;
}
