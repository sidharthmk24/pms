import { ZodError } from "zod";
import { fail, handler, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { queueEmail, submissionReceivedEmail } from "@/lib/mail";
import { getResponseWeeks, submissionsOpen } from "@/lib/settings";
import { discardManuscript, storeManuscript, storeCoverDesign, UploadError } from "@/lib/storage";
import { getSessionUser } from "@/lib/session";
import {
  allowSubmission,
  createSubmission,
  SubmissionSchema,
  type ManuscriptMeta,
  type AssignedEditorInfo,
} from "@/lib/submissions";
import { createNotification, notifyRoles, notifyAuthorByEmail } from "@/lib/notifications";

/** Manuscript submission endpoint — requires authenticated author. */
export const POST = handler(async (req: Request) => {
  if (!(await submissionsOpen())) {
    return fail(503, "Submissions are closed at the moment. Please check back soon.");
  }

  // Author MUST be signed in to submit
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return fail(401, "You must be signed in with an author account to submit a manuscript. Please log in or create an account.");
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

  if (!(await allowSubmission(ip))) {
    return fail(429, "You have reached the submission limit for today. Please try again tomorrow.");
  }

  const form = await req.formData().catch(() => null);
  if (!form) return fail(400, "Could not read the submitted form.");

  // Honeypot: a real person never fills a field they cannot see.
  if (String(form.get("website") ?? "").trim() !== "") {
    // Look successful so a bot gains no signal, but record nothing.
    return ok({ refNo: "SUB-0000-0000", responseWeeks: await getResponseWeeks() });
  }

  const fields = SubmissionSchema.parse({
    author_name: (form.get("author_name") as string)?.trim() || sessionUser.name,
    author_name_ml: form.get("author_name_ml") ?? "",
    email: sessionUser.email.toLowerCase().trim(),
    phone: form.get("phone") ?? "",
    place: form.get("place") ?? "",
    title: form.get("title") ?? "",
    title_ml: form.get("title_ml") ?? "",
    genre: form.get("genre") ?? "",
    language: form.get("language") || "Malayalam",
    synopsis: form.get("synopsis") ?? "",
  });

  const file = form.get("manuscript");
  if (!(file instanceof File) || file.size === 0) {
    throw new ZodError([
      { code: "custom", path: ["manuscript"], message: "Please attach your manuscript file." },
    ]);
  }

  let stored: Awaited<ReturnType<typeof storeManuscript>>;
  try {
    stored = await storeManuscript(file, sessionUser.id);
  } catch (err) {
    console.error("[public-submissions] storeManuscript failed:", err);
    if (err instanceof UploadError) {
      throw new ZodError([{ code: "custom", path: ["manuscript"], message: err.message }]);
    }
    throw err;
  }

  const manuscript: ManuscriptMeta = {
    relativePath: stored.relativePath,
    filename: stored.filename,
    size: stored.size,
    mime: stored.mime,
  };

  // Optional Cover Design Upload
  const coverFile = form.get("cover");
  let storedCover: Awaited<ReturnType<typeof storeCoverDesign>> | null = null;
  if (coverFile instanceof File && coverFile.size > 0) {
    try {
      storedCover = await storeCoverDesign(coverFile, sessionUser.id);
    } catch (err) {
      console.error("[public-submissions] storeCoverDesign failed:", err);
      await discardManuscript(stored.absolutePath);
      if (err instanceof UploadError) {
        throw new ZodError([{ code: "custom", path: ["cover"], message: err.message }]);
      }
      throw err;
    }
  }

  const coverMeta: ManuscriptMeta = storedCover
    ? {
        relativePath: storedCover.relativePath,
        filename: storedCover.filename,
        size: storedCover.size,
        mime: storedCover.mime,
      }
    : null;

  let created: { id: string; refNo: string; assignedEditor: AssignedEditorInfo };
  try {
    created = await createSubmission(fields, manuscript, coverMeta);
  } catch (err) {
    console.error("[public-submissions] createSubmission failed:", err);
    // Never leave an orphaned file behind a failed insert.
    await discardManuscript(stored.absolutePath);
    if (storedCover) {
      await discardManuscript(storedCover.absolutePath);
    }
    throw err;
  }

  const responseWeeks = await getResponseWeeks();

  // Neither of these may block the author's confirmation.
  const mail = submissionReceivedEmail({
    authorName: fields.author_name,
    refNo: created.refNo,
    title: fields.title,
    responseWeeks,
  });
  await queueEmail({
    to: fields.email,
    toName: fields.author_name,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
    template: "submission_received",
    refType: "submission",
    refId: created.id,
  });

  await audit({
    userId: null,
    action: "submission_received",
    entity: "submission",
    entityId: created.id,
    detail: {
      ref_no: created.refNo,
      genre: fields.genre,
      title: fields.title,
      assigned_editor_id: created.assignedEditor?.id ?? null,
      assigned_editor_name: created.assignedEditor?.name ?? null,
    },
  });

  // Notify the Owner
  await notifyRoles(["owner"], {
    title: "New Manuscript Submitted",
    message: created.assignedEditor
      ? `"${fields.title}" submitted by ${fields.author_name} (${created.refNo}) — Auto-assigned to ${created.assignedEditor.name}`
      : `"${fields.title}" submitted by ${fields.author_name} (${created.refNo})`,
    type: "SUBMISSION",
    link: `/submissions/${created.id}`,
  });

  // In-app real-time notification to the automatically assigned editor
  if (created.assignedEditor) {
    await createNotification(created.assignedEditor.id, {
      title: "Manuscript Assigned",
      message: `You have been automatically assigned to review "${fields.title}" (${created.refNo}).`,
      type: "TASK",
      link: `/submissions/${created.id}`,
    });
  }

  await notifyAuthorByEmail(fields.email, {
    title: "Manuscript Received",
    message: `Your manuscript "${fields.title}" has been successfully received (Ref: ${created.refNo}).`,
    type: "SUBMISSION",
    link: `/author`,
  });

  return ok({ refNo: created.refNo, responseWeeks });
});

