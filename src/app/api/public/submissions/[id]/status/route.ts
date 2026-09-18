import { randomUUID } from "node:crypto";
import { fail, handler, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { queueEmail } from "@/lib/mail";
import { storeManuscript, storeCoverDesign, discardManuscript, resolveManuscript, UploadError } from "@/lib/storage";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { stamp, dateOnly } from "@/lib/time";

import { createNotification, notifyRoles, notifyAuthorByEmail } from "@/lib/notifications";

export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;

  // 1. Fetch submission
  const sub = await prisma.submissions.findUnique({
    where: { id },
    include: {
      users: { select: { email: true, name: true } },
    },
  });
  if (!sub) return fail(404, "Submission not found");

  // Determine content type (multipart/form-data for file uploads, application/json for signing)
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (!form) return fail(400, "Could not read form data");

    const action = form.get("action");
    if (action !== "upload_revision") return fail(400, "Invalid form action");

    if (sub.status !== "needs_revision") {
      return fail(422, "This submission does not require a revision at this time");
    }

    const file = form.get("manuscript");
    if (!(file instanceof File) || file.size === 0) {
      return fail(400, "Please attach a valid revised manuscript file");
    }

    const coverFile = form.get("cover");
    const hasCover = coverFile instanceof File && coverFile.size > 0;

    const brief = (form.get("brief") as string)?.trim() || "";

    const sessionUser = await getSessionUser();
    const now = stamp();

    // Determine version number & backfill legacy version 1 if needed
    const existingFiles = await prisma.submission_files.findMany({
      where: { submission_id: id },
      orderBy: { version: "desc" },
    });

    let nextVersion = 2;
    if (existingFiles.length === 0) {
      // Backfill version 1 from original submission record
      if (sub.manuscript_path) {
        await prisma.submission_files.create({
          data: {
            id: randomUUID(),
            submission_id: id,
            version: 1,
            file_type: "manuscript",
            file_path: sub.manuscript_path,
            filename: sub.manuscript_filename || "manuscript-v1.pdf",
            file_size: sub.manuscript_size || null,
            file_mime: sub.manuscript_mime || null,
            brief: "Initial manuscript submission",
            uploaded_by: "author",
            created_at: sub.submitted_at || now,
          },
        });
      }
      if (sub.cover_path) {
        await prisma.submission_files.create({
          data: {
            id: randomUUID(),
            submission_id: id,
            version: 1,
            file_type: "cover",
            file_path: sub.cover_path,
            filename: sub.cover_filename || "cover-v1.png",
            file_size: sub.cover_size || null,
            file_mime: sub.cover_mime || null,
            brief: "Initial cover design submission",
            uploaded_by: "author",
            created_at: sub.submitted_at || now,
          },
        });
      }
      nextVersion = 2;
    } else {
      nextVersion = (existingFiles[0]?.version || 1) + 1;
    }

    // Write new manuscript to disk
    let storedManuscript;
    try {
      storedManuscript = await storeManuscript(file, sessionUser?.id || null);
    } catch (err) {
      if (err instanceof UploadError) return fail(422, err.message);
      throw err;
    }

    // Write optional cover to disk
    let storedCover = null;
    if (hasCover) {
      try {
        storedCover = await storeCoverDesign(coverFile as File, sessionUser?.id || null);
      } catch (err) {
        await discardManuscript(storedManuscript.absolutePath);
        if (err instanceof UploadError) return fail(422, err.message);
        throw err;
      }
    }

    const updatedNotes = brief
      ? `[Author Revision Brief - v${nextVersion} - ${now}]:\n${brief}\n\n[Previous Editor Feedback]:\n${sub.review_notes || "None"}`
      : sub.review_notes;

    try {
      await prisma.$transaction(async (tx) => {
        // Record new manuscript version
        await tx.submission_files.create({
          data: {
            id: randomUUID(),
            submission_id: id,
            version: nextVersion,
            file_type: "manuscript",
            file_path: storedManuscript.relativePath,
            filename: storedManuscript.filename,
            file_size: storedManuscript.size,
            file_mime: storedManuscript.mime,
            brief: brief || `Revision ${nextVersion - 1}`,
            uploaded_by: "author",
            created_at: now,
          },
        });

        // Record new cover version if provided
        if (storedCover) {
          await tx.submission_files.create({
            data: {
              id: randomUUID(),
              submission_id: id,
              version: nextVersion,
              file_type: "cover",
              file_path: storedCover.relativePath,
              filename: storedCover.filename,
              file_size: storedCover.size,
              file_mime: storedCover.mime,
              brief: brief || `Revision ${nextVersion - 1} Cover`,
              uploaded_by: "author",
              created_at: now,
            },
          });
        }

        // Update active submission pointer
        await tx.submissions.update({
          where: { id },
          data: {
            status: "under_review",
            review_notes: updatedNotes,
            manuscript_path: storedManuscript.relativePath,
            manuscript_filename: storedManuscript.filename,
            manuscript_size: storedManuscript.size,
            manuscript_mime: storedManuscript.mime,
            ...(storedCover
              ? {
                  cover_path: storedCover.relativePath,
                  cover_filename: storedCover.filename,
                  cover_size: storedCover.size,
                  cover_mime: storedCover.mime,
                }
              : {}),
            updated_at: now,
          },
        });
      });
    } catch (err) {
      await discardManuscript(storedManuscript.absolutePath);
      if (storedCover) {
        await discardManuscript(storedCover.absolutePath);
      }
      throw err;
    }

    // Queue notification email to the assigned editor (if assigned)
    if (sub.reviewed_by && sub.users) {
      await queueEmail({
        to: sub.users.email,
        toName: sub.users.name,
        subject: `Revised manuscript uploaded — ${sub.ref_no}`,
        text: `Dear ${sub.users.name},\n\nThe author of "${sub.title}" (${sub.ref_no}) has uploaded a revised manuscript for your review.\n\n${
          brief ? `Author's Revision Brief:\n"${brief}"\n\n` : ""
        }Please log into the PMS dashboard to review the changes.`,
      });

      await createNotification(sub.reviewed_by, {
        title: "Revised Manuscript Uploaded",
        message: `"${sub.title}" (${sub.ref_no}) revised manuscript uploaded by ${sub.author_name}.`,
        type: "SUBMISSION",
        link: `/submissions/${sub.id}`,
      });
    }

    // In-app notifications to owner and author
    await notifyRoles(["owner"], {
      title: "Revised Manuscript Uploaded",
      message: `"${sub.title}" revised file submitted by ${sub.author_name}.`,
      type: "SUBMISSION",
      link: `/submissions/${sub.id}`,
    }, sub.reviewed_by || undefined);

    await notifyAuthorByEmail(sub.email, {
      title: "Revision Submitted",
      message: `Your revised manuscript for "${sub.title}" has been received by the editorial board.`,
      type: "SUBMISSION",
      link: `/author`,
    });

    await audit({
      userId: null,
      action: "author_upload_revision",
      entity: "submission",
      entityId: id,
      detail: { ref_no: sub.ref_no, title: sub.title, brief: brief ? brief.slice(0, 200) : undefined },
    });

    return ok({ success: true });
  } else {
    // JSON Payload
    const json = await req.json().catch(() => null);
    if (!json) return fail(400, "Invalid JSON payload");

    if (json.action === "sign") {
      if (sub.status !== "accepted") {
        return fail(422, "This submission is not in an accepted state");
      }

      // Find the contract
      const contract = await prisma.contracts.findFirst({
        where: {
          term_notes: { contains: sub.ref_no },
        },
      });
      if (!contract) return fail(404, "Contract record not found");

      if (contract.signed_on) {
        return fail(422, "Contract has already been signed");
      }

      const now = stamp();
      const today = dateOnly();

      await prisma.$transaction(async (tx) => {
        await tx.contracts.update({
          where: { id: contract.id },
          data: {
            signed_on: today,
          },
        });

        await tx.production_projects.create({
          data: {
            id: randomUUID(),
            title_id: contract.title_id,
            status: "under_contract",
            created_at: now,
            updated_at: now,
          },
        });
      });

      // Notify author of signed contract
      await queueEmail({
        to: sub.email,
        toName: sub.author_name,
        subject: `Contract Fully Signed — ${sub.ref_no}`,
        text: `Dear ${sub.author_name},\n\nThank you for signing the publishing contract for "${sub.title}".\n\nBoth parties have now executed the contract. Your book is officially moving to our production pipeline.\n\nSincerely,\nKairali Books`,
      });

      await audit({
        userId: null,
        action: "author_signed_contract",
        entity: "submission",
        entityId: id,
        detail: { ref_no: sub.ref_no, contract_id: contract.id },
      });

      return ok({ success: true });
    }

    if (json.action === "proof_decision") {
      const { decision, comment } = json;
      if (decision !== "approve" && decision !== "reject" && decision !== "rework") {
        return fail(400, "Invalid proof decision");
      }

      const contract = await prisma.contracts.findFirst({
        where: { term_notes: { contains: sub.ref_no } },
      });
      if (!contract) return fail(404, "Contract not found");

      const proj = await prisma.production_projects.findFirst({
        where: { title_id: contract.title_id },
      });
      if (!proj) return fail(404, "Production project not found");

      if (proj.status !== "final_proof") {
        return fail(422, "Project is not in final proof stage");
      }

      const now = stamp();

      if (decision === "reject" || decision === "rework") {
        if (!comment?.trim()) {
          return fail(422, "Please leave revision feedback comments");
        }

        await prisma.production_projects.update({
          where: { id: proj.id },
          data: {
            status: "editing",
            editing_completed_at: null,
            proof_approved_at: null,
            proof_completed_at: null,
            proof_feedback: comment,
            updated_at: now,
          },
        });

        if (proj.editing_assigned_to) {
          const editor = await prisma.users.findUnique({ where: { id: proj.editing_assigned_to } });
          if (editor) {
            await queueEmail({
              to: editor.email,
              toName: editor.name,
              subject: `Rework requested by Author — ${sub.ref_no}`,
              text: `Dear ${editor.name},\n\nThe author of "${sub.title}" (${sub.ref_no}) has rejected the final proof copy and requested changes.\n\nAuthor's comments:\n${comment}\n\nPlease review and revise accordingly.`,
            });
          }
        }

        await audit({
          userId: null,
          action: "author_reject_proof",
          entity: "production_project",
          entityId: proj.id,
          detail: { ref_no: sub.ref_no, title: sub.title, comment },
        });

        return ok({ success: true });
      }

      if (decision === "approve") {
        await prisma.production_projects.update({
          where: { id: proj.id },
          data: {
            status: "final_proof",
            proof_approved_at: now,
            updated_at: now,
          },
        });

        const managers = await prisma.users.findMany({ where: { role: "owner", active: true } });
        for (const manager of managers) {
          await queueEmail({
            to: manager.email,
            toName: manager.name,
            subject: `Author Sign-off received — ${sub.ref_no}`,
            text: `Dear ${manager.name},\n\nThe author of "${sub.title}" (${sub.ref_no}) has signed off on the final proof copy.\n\nYou can now review and click "Finish & Publish Book" in the Production pipeline to complete the project and add it to the published catalog.`,
          });
        }

        await audit({
          userId: null,
          action: "author_approve_proof",
          entity: "production_project",
          entityId: proj.id,
          detail: { ref_no: sub.ref_no, title: sub.title },
        });

        return ok({ success: true });
      }
    }

    return fail(400, "Invalid action");
  }
});
