import { randomUUID } from "node:crypto";
import { fail, handler, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { queueEmail } from "@/lib/mail";
import { storeManuscript, discardManuscript, resolveManuscript, UploadError } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import { stamp, dateOnly } from "@/lib/time";

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

    // Write new file to disk
    let stored;
    try {
      stored = await storeManuscript(file);
    } catch (err) {
      if (err instanceof UploadError) return fail(422, err.message);
      throw err;
    }

    const oldPath = sub.manuscript_path;

    try {
      // Update database
      await prisma.submissions.update({
        where: { id },
        data: {
          status: "under_review",
          manuscript_path: stored.relativePath,
          manuscript_filename: stored.filename,
          manuscript_size: stored.size,
          manuscript_mime: stored.mime,
          updated_at: stamp(),
        },
      });

      // Cleanup old file best effort
      if (oldPath) {
        await discardManuscript(resolveManuscript(oldPath));
      }
    } catch (err) {
      // If DB update fails, clean up the newly uploaded file to avoid leaving orphans
      await discardManuscript(stored.absolutePath);
      throw err;
    }

    // Queue notification email to the assigned editor (if assigned)
    if (sub.reviewed_by && sub.users) {
      await queueEmail({
        to: sub.users.email,
        toName: sub.users.name,
        subject: `Revised manuscript uploaded — ${sub.ref_no}`,
        text: `Dear ${sub.users.name},\n\nThe author of "${sub.title}" (${sub.ref_no}) has uploaded a revised manuscript for your review.\n\nPlease log into the PMS dashboard to review the changes.`,
      });
    }

    await audit({
      userId: null,
      action: "author_upload_revision",
      entity: "submission",
      entityId: id,
      detail: { ref_no: sub.ref_no, title: sub.title },
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
      if (decision !== "approve" && decision !== "reject") {
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

      if (decision === "reject") {
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
            status: "printing",
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
            text: `Dear ${manager.name},\n\nThe author of "${sub.title}" (${sub.ref_no}) has signed off on the final proof copy.\n\nThe project is now in the printing queue. Please link the print run deliverables once complete.`,
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
