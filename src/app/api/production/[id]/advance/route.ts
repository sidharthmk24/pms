import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { z } from "zod";
import { fail, handler, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireApiCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stamp } from "@/lib/time";
import { resolveManuscript, storeProductionFile } from "@/lib/storage";
import {
  queueEmail,
  productionStageCompletedEmail,
  proofApprovalEmail,
  publicationCelebrationEmail,
} from "@/lib/mail";
import { notifyUsers, notifyRoles, notifyAuthorByEmail } from "@/lib/notifications";

function getAssigneeList(primary: string | null, assignees: string | null): string[] {
  const ids: string[] = [];
  if (primary) ids.push(primary);
  if (assignees) ids.push(...assignees.split(",").map((s) => s.trim()).filter(Boolean));
  return Array.from(new Set(ids));
}

export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireApiCapability("production_pipeline.write");
  const { id } = await params;

  const proj = await prisma.production_projects.findUnique({
    where: { id },
    include: {
      titles: {
        include: {
          authors: true,
          contracts: true,
        },
      },
    },
  });
  if (!proj) return fail(404, "Production project not found");
  if (proj.status === "completed") {
    return fail(400, "This book production is completed and published. Step modifications are locked.");
  }

  const now = stamp();

  function isUserAssigned(assignedTo: string | null, assignees: string | null, userId: string): boolean {
    if (assignedTo === userId) return true;
    if (assignees) {
      const list = assignees.split(",").map((s) => s.trim());
      if (list.includes(userId)) return true;
    }
    return false;
  }

  // Validate that the user is authorized to advance the current stage (either assignee or production/owner/editor staff)
  let isAuthorized = user.role === "owner" || user.role === "production" || user.role === "editor";
  if (proj.status === "dtp" && isUserAssigned(proj.dtp_assigned_to, proj.dtp_assignees, user.id)) isAuthorized = true;
  else if (proj.status === "editing" && isUserAssigned(proj.editing_assigned_to, proj.editing_assignees, user.id)) isAuthorized = true;
  else if (proj.status === "cover_design" && isUserAssigned(proj.cover_assigned_to, proj.cover_assignees, user.id)) isAuthorized = true;
  else if (proj.status === "isbn_registration" && isUserAssigned(proj.isbn_assigned_to, proj.isbn_assignees, user.id)) isAuthorized = true;
  else if (proj.status === "final_proof") isAuthorized = user.role === "owner" || user.role === "production" || user.role === "editor";
  else if (proj.status === "printing") isAuthorized = user.role === "owner" || user.role === "production";

  if (!isAuthorized) {
    return fail(403, "You are not assigned to the active stage of this production project");
  }

  const host = req.headers.get("host") || "localhost:3000";
  const protoHeader = req.headers.get("x-forwarded-proto");
  const protocol = protoHeader || (host.includes("localhost") ? "http" : "https");
  const baseUrl = `${protocol}://${host}`;
  const authorTrackingUrl = `${baseUrl}/author`;

  // Resolve author email & name
  let authorEmail = proj.titles.authors?.email || null;
  const authorName = proj.titles.authors?.name || "Author";
  if (!authorEmail && proj.titles.contracts?.term_notes) {
    const emailMatch = proj.titles.contracts.term_notes.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) authorEmail = emailMatch[0];
  }

  const contentType = req.headers.get("content-type") || "";
  let formData: FormData | null = null;
  let jsonData: any = null;
  if (contentType.includes("multipart/form-data")) {
    formData = await req.formData();
  } else {
    jsonData = await req.json().catch(() => null);
  }

  const isEditMode =
    formData?.get("is_edit") === "true" ||
    formData?.get("is_edit") === "1" ||
    Boolean(jsonData?.is_edit);

  const targetStage =
    (formData?.get("target_stage") as string) ||
    jsonData?.target_stage ||
    proj.status;

  // --- EDIT MODE HANDLERS (Update files & metadata without altering pipeline progress) ---
  if (isEditMode) {
    if (targetStage === "dtp" || targetStage === "editing") {
      let final_layout_path = proj.final_layout_path;
      if (formData) {
        const file = formData.get("layout_file") as File | null;
        if (file && file.size > 0) {
          final_layout_path = await storeProductionFile(
            file,
            [
              "application/pdf",
              "application/msword",
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ],
            ["pdf", "doc", "docx"],
            user.id
          );
        }
      }

      await prisma.production_projects.update({
        where: { id },
        data: {
          final_layout_path,
          updated_at: now,
        },
      });

      await audit({
        userId: user.id,
        action: `update_production_${targetStage}_data`,
        entity: "production_project",
        entityId: id,
        detail: { project_id: id, final_layout_path, edited_stage: targetStage },
      });

      return ok({ success: true, is_edit: true, stage: targetStage });
    }

    if (targetStage === "cover_design") {
      let final_cover_path = proj.final_cover_path;
      if (formData) {
        const file = formData.get("cover_file") as File | null;
        if (file && file.size > 0) {
          final_cover_path = await storeProductionFile(
            file,
            ["image/png", "image/jpeg", "image/webp", "application/pdf"],
            ["png", "jpg", "jpeg", "webp", "pdf"],
            user.id
          );
        }
      }

      await prisma.production_projects.update({
        where: { id },
        data: {
          final_cover_path,
          updated_at: now,
        },
      });

      await audit({
        userId: user.id,
        action: "update_production_cover_data",
        entity: "production_project",
        entityId: id,
        detail: { project_id: id, final_cover_path, edited_stage: "cover_design" },
      });

      return ok({ success: true, is_edit: true, stage: "cover_design" });
    }

    if (targetStage === "isbn_registration") {
      let isbn = "";
      let applicationRef = "";

      if (formData) {
        isbn = (formData.get("isbn") as string) || "";
        applicationRef = (formData.get("application_ref") as string) || "";
      } else if (jsonData) {
        isbn = jsonData.isbn || "";
        applicationRef = jsonData.application_ref || "";
      }

      const trimmedIsbn = isbn.trim();
      const trimmedRef = applicationRef.trim();

      if (trimmedIsbn) {
        // Validate ISBN uniqueness against other titles
        const existingTitleWithIsbn = await prisma.titles.findFirst({
          where: {
            isbn: trimmedIsbn,
            id: { not: proj.title_id },
          },
          select: { id: true, name: true },
        });

        if (existingTitleWithIsbn) {
          return fail(
            409,
            `This ISBN (${trimmedIsbn}) already exists and is assigned to "${existingTitleWithIsbn.name}". Please check and enter a unique ISBN.`
          );
        }

        try {
          await prisma.$transaction(async (tx) => {
            await tx.production_projects.update({
              where: { id },
              data: {
                isbn_registered: trimmedIsbn,
                ...(trimmedRef ? { isbn_request_ref: trimmedRef } : {}),
                updated_at: now,
              },
            });

            await tx.titles.update({
              where: { id: proj.title_id },
              data: { isbn: trimmedIsbn },
            });
          });
        } catch (err: any) {
          if (err?.code === "P2002" || String(err?.message || "").includes("Unique constraint")) {
            return fail(
              409,
              `This ISBN (${trimmedIsbn}) already exists in the catalog. Please enter a unique ISBN.`
            );
          }
          throw err;
        }
      } else if (trimmedRef) {
        await prisma.production_projects.update({
          where: { id },
          data: {
            isbn_request_ref: trimmedRef,
            updated_at: now,
          },
        });
      }

      await audit({
        userId: user.id,
        action: "update_production_isbn_data",
        entity: "production_project",
        entityId: id,
        detail: { project_id: id, isbn: trimmedIsbn, application_ref: trimmedRef },
      });

      return ok({ success: true, is_edit: true, stage: "isbn_registration" });
    }

    if (targetStage === "final_proof") {
      let feedback = "";
      if (formData) {
        feedback = (formData.get("proof_feedback") as string) || (formData.get("rework_notes") as string) || "";
      } else if (jsonData) {
        feedback = jsonData.proof_feedback || jsonData.rework_notes || "";
      }

      await prisma.production_projects.update({
        where: { id },
        data: {
          proof_feedback: feedback.trim() || proj.proof_feedback,
          updated_at: now,
        },
      });

      await audit({
        userId: user.id,
        action: "update_production_proof_data",
        entity: "production_project",
        entityId: id,
        detail: { project_id: id, proof_feedback: feedback },
      });

      return ok({ success: true, is_edit: true, stage: "final_proof" });
    }

    return fail(400, "Unsupported stage for editing");
  }

  // --- STAGE 1: DTP (Typesetting & Layout) ---
  if (proj.status === "dtp") {
    let final_layout_path = proj.final_layout_path;
    if (formData) {
      const file = formData.get("layout_file") as File | null;
      if (file && file.size > 0) {
        final_layout_path = await storeProductionFile(
          file,
          ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
          ["pdf", "doc", "docx"],
          user.id
        );
      }
    }

    await prisma.production_projects.update({
      where: { id },
      data: {
        status: "editing",
        dtp_completed_at: now,
        final_layout_path,
        updated_at: now,
      },
    });

    await audit({
      userId: user.id,
      action: "complete_production_dtp",
      entity: "production_project",
      entityId: id,
      detail: { project_id: id, final_layout_path },
    });

    // Send milestone notification to author
    if (authorEmail) {
      const mail = productionStageCompletedEmail({
        authorName,
        title: proj.titles.name,
        completedStageName: "Typesetting & Layout (DTP)",
        nextStageName: "Editorial Proofreading & Copyediting",
        stageNote: "Typeset interior manuscript layout draft has been uploaded and forwarded to editorial review.",
        trackingUrl: authorTrackingUrl,
      });
      await queueEmail({
        to: authorEmail,
        toName: authorName,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        template: "production_dtp_complete",
        refType: "production_project",
        refId: id,
      });
    }

    // In-app notifications: Notify assigned editors & author
    const editorAssignees = getAssigneeList(proj.editing_assigned_to, proj.editing_assignees);
    if (editorAssignees.length > 0) {
      await notifyUsers(editorAssignees, {
        title: "Typesetting Complete — Editorial Review Active",
        message: `Typesetting draft ready for "${proj.titles.name}". Editorial review is now active.`,
        type: "TASK",
        link: `/production/${id}`,
      }, user.id);
    } else {
      await notifyRoles(["editor", "production"], {
        title: "Typesetting Complete — Editorial Review Active",
        message: `Typesetting draft ready for "${proj.titles.name}". Editorial review is now active.`,
        type: "TASK",
        link: `/production/${id}`,
      }, user.id);
    }

    if (authorEmail) {
      await notifyAuthorByEmail(authorEmail, {
        title: "Typesetting (DTP) Completed",
        message: `Interior page layout for "${proj.titles.name}" is completed and moved to editorial proofreading.`,
        type: "PRODUCTION",
        link: `/author`,
      });
    }

    return ok({ success: true });
  }

  // --- STAGE 2: EDITING (Proofreading & Editing) ---
  if (proj.status === "editing") {
    let final_layout_path = proj.final_layout_path;
    if (formData) {
      const file = formData.get("layout_file") as File | null;
      if (file && file.size > 0) {
        final_layout_path = await storeProductionFile(
          file,
          ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
          ["pdf", "doc", "docx"],
          user.id
        );
      }
    }

    await prisma.production_projects.update({
      where: { id },
      data: {
        status: "cover_design",
        editing_completed_at: now,
        final_layout_path,
        proof_feedback: null, // Clear any previous rework feedback
        updated_at: now,
      },
    });

    await audit({
      userId: user.id,
      action: "complete_production_editing",
      entity: "production_project",
      entityId: id,
      detail: { project_id: id, final_layout_path },
    });

    if (authorEmail) {
      const mail = productionStageCompletedEmail({
        authorName,
        title: proj.titles.name,
        completedStageName: "Editorial Proofreading & Copyediting",
        nextStageName: "Cover Jacket Design",
        stageNote: "Proofreading and copyediting corrections have been completed and verified.",
        trackingUrl: authorTrackingUrl,
      });
      await queueEmail({
        to: authorEmail,
        toName: authorName,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        template: "production_editing_complete",
        refType: "production_project",
        refId: id,
      });
    }

    // In-app notifications: Notify cover designers & author
    const coverAssignees = getAssigneeList(proj.cover_assigned_to, proj.cover_assignees);
    if (coverAssignees.length > 0) {
      await notifyUsers(coverAssignees, {
        title: "Editorial Complete — Cover Design Active",
        message: `Editorial proofreading complete for "${proj.titles.name}". Cover jacket design is now active.`,
        type: "TASK",
        link: `/production/${id}`,
      }, user.id);
    } else {
      await notifyRoles(["designer", "production"], {
        title: "Editorial Complete — Cover Design Active",
        message: `Editorial proofreading complete for "${proj.titles.name}". Cover jacket design is now active.`,
        type: "TASK",
        link: `/production/${id}`,
      }, user.id);
    }

    if (authorEmail) {
      await notifyAuthorByEmail(authorEmail, {
        title: "Editorial Proofreading Completed",
        message: `Text corrections and editorial copyediting for "${proj.titles.name}" are finalized.`,
        type: "PRODUCTION",
        link: `/author`,
      });
    }

    return ok({ success: true });
  }

  // --- STAGE 3: COVER DESIGN ---
  if (proj.status === "cover_design") {
    let final_cover_path = proj.final_cover_path;
    if (formData) {
      const file = formData.get("cover_file") as File | null;
      if (file && file.size > 0) {
        final_cover_path = await storeProductionFile(
          file,
          ["image/png", "image/jpeg", "image/webp", "application/pdf"],
          ["png", "jpg", "jpeg", "webp", "pdf"],
          user.id
        );
      }
    }

    await prisma.production_projects.update({
      where: { id },
      data: {
        status: "isbn_registration",
        cover_completed_at: now,
        final_cover_path,
        updated_at: now,
      },
    });

    await audit({
      userId: user.id,
      action: "complete_production_cover",
      entity: "production_project",
      entityId: id,
      detail: { project_id: id, final_cover_path },
    });

    if (authorEmail) {
      const mail = productionStageCompletedEmail({
        authorName,
        title: proj.titles.name,
        completedStageName: "Book Cover Jacket Design",
        nextStageName: "ISBN Registration",
        stageNote: "Full wrap-around front, spine, and back cover artwork has been finalized.",
        trackingUrl: authorTrackingUrl,
      });
      await queueEmail({
        to: authorEmail,
        toName: authorName,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        template: "production_cover_complete",
        refType: "production_project",
        refId: id,
      });
    }

    // In-app notifications: Notify ISBN specialists & author
    const isbnAssignees = getAssigneeList(proj.isbn_assigned_to, proj.isbn_assignees);
    if (isbnAssignees.length > 0) {
      await notifyUsers(isbnAssignees, {
        title: "Cover Art Complete — ISBN Registration Active",
        message: `Cover design finalized for "${proj.titles.name}". Ready for ISBN application.`,
        type: "TASK",
        link: `/production/${id}`,
      }, user.id);
    } else {
      await notifyRoles(["isbn", "production"], {
        title: "Cover Art Complete — ISBN Registration Active",
        message: `Cover design finalized for "${proj.titles.name}". Ready for ISBN application.`,
        type: "TASK",
        link: `/production/${id}`,
      }, user.id);
    }

    if (authorEmail) {
      await notifyAuthorByEmail(authorEmail, {
        title: "Cover Artwork Completed",
        message: `Book cover jacket artwork for "${proj.titles.name}" has been completed.`,
        type: "PRODUCTION",
        link: `/author`,
      });
    }

    return ok({ success: true });
  }

  // --- STAGE 4: ISBN REGISTRATION ---
  if (proj.status === "isbn_registration") {
    let step = "";
    let isbn = "";
    let applicationRef = "";

    if (formData) {
      step = (formData.get("step") as string) || "";
      isbn = (formData.get("isbn") as string) || "";
      applicationRef = (formData.get("application_ref") as string) || "";
    } else if (jsonData) {
      step = jsonData.step || "";
      isbn = jsonData.isbn || "";
      applicationRef = jsonData.application_ref || "";
    }

    // Step 1: Mark ISBN Request Sent to Agency
    if (step === "request_sent" || (!isbn && (step === "request_sent" || applicationRef))) {
      await prisma.production_projects.update({
        where: { id },
        data: {
          isbn_requested_at: now,
          isbn_request_ref: applicationRef.trim() || null,
          updated_at: now,
        },
      });

      await audit({
        userId: user.id,
        action: "submit_isbn_request",
        entity: "production_project",
        entityId: id,
        detail: { project_id: id, application_ref: applicationRef },
      });

      if (authorEmail) {
        const mail = productionStageCompletedEmail({
          authorName,
          title: proj.titles.name,
          completedStageName: "ISBN Application Submission",
          nextStageName: "ISBN Allocation Confirmation",
          stageNote: `Official publication metadata submitted to Raja Rammohun Roy National Agency${applicationRef ? ` (Ref: ${applicationRef})` : ""}.`,
          trackingUrl: authorTrackingUrl,
        });
        await queueEmail({
          to: authorEmail,
          toName: authorName,
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
          template: "production_isbn_requested",
          refType: "production_project",
          refId: id,
        });

        await notifyAuthorByEmail(authorEmail, {
          title: "ISBN Application Submitted",
          message: `ISBN application submitted for "${proj.titles.name}"${applicationRef ? ` (Ref: ${applicationRef})` : ""}.`,
          type: "PRODUCTION",
          link: `/author`,
        });
      }

      return ok({ success: true, step: "request_sent" });
    }

    // Step 2: ISBN Allocation Accepted & Number Assigned -> Advances to Author Final Proof
    if (!isbn || isbn.trim().length < 5) {
      return fail(400, "ISBN number must be at least 5 characters");
    }

    const trimmedIsbn = isbn.trim();

    // Check if this ISBN is already assigned to another title
    const existingTitleWithIsbn = await prisma.titles.findFirst({
      where: {
        isbn: trimmedIsbn,
        id: { not: proj.title_id },
      },
      select: { id: true, name: true },
    });

    if (existingTitleWithIsbn) {
      return fail(
        409,
        `This ISBN (${trimmedIsbn}) already exists and is assigned to "${existingTitleWithIsbn.name}". Please check and enter a unique ISBN.`
      );
    }

    const proofToken = proj.proof_token || randomUUID();

    try {
      await prisma.$transaction(async (tx) => {
        // 1. Update production project stage
        await tx.production_projects.update({
          where: { id },
          data: {
            status: "final_proof",
            isbn_completed_at: now,
            isbn_registered: trimmedIsbn,
            proof_token: proofToken,
            proof_email_sent_at: now,
            updated_at: now,
          },
        });

        // 2. Set the ISBN on the linked title record
        await tx.titles.update({
          where: { id: proj.title_id },
          data: { isbn: trimmedIsbn },
        });
      });
    } catch (err: any) {
      if (err?.code === "P2002" || String(err?.message || "").includes("Unique constraint")) {
        return fail(
          409,
          `This ISBN (${trimmedIsbn}) already exists in the catalog. Please enter a unique ISBN.`
        );
      }
      throw err;
    }

    await audit({
      userId: user.id,
      action: "complete_production_isbn",
      entity: "production_project",
      entityId: id,
      detail: { project_id: id, isbn: isbn.trim() },
    });

    // Prepare PDF attachment for Author Final Proof sign-off email
    let attachments: Array<{ filename: string; path?: string; contentType?: string }> | undefined = undefined;
    let hasAttachment = false;

    if (proj.final_layout_path) {
      if (proj.final_layout_path.startsWith("http://") || proj.final_layout_path.startsWith("https://")) {
        attachments = [
          {
            filename: `${proj.titles.name.replace(/[^a-zA-Z0-9_-]/g, "_")}_proof.pdf`,
            path: proj.final_layout_path,
            contentType: "application/pdf",
          },
        ];
        hasAttachment = true;
      } else {
        const fullPath = resolveManuscript(proj.final_layout_path);
        if (existsSync(fullPath)) {
          attachments = [
            {
              filename: `${proj.titles.name.replace(/[^a-zA-Z0-9_-]/g, "_")}_proof.pdf`,
              path: fullPath,
              contentType: "application/pdf",
            },
          ];
          hasAttachment = true;
        }
      }
    }

    // Send final proof email with PDF attachment and 1-click approval link
    if (authorEmail) {
      const approvalUrl = `${baseUrl}/publish/proof-approval/${id}?token=${proofToken}`;
      const mail = proofApprovalEmail({
        authorName,
        title: proj.titles.name,
        isbn: isbn.trim(),
        approvalUrl,
        hasAttachment,
        trackingUrl: authorTrackingUrl,
      });

      await queueEmail({
        to: authorEmail,
        toName: authorName,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        template: "final_proof_signoff",
        refType: "production_project",
        refId: id,
        attachments,
      });

      await notifyAuthorByEmail(authorEmail, {
        title: "Book Proof Ready for Approval",
        message: `ISBN ${isbn.trim()} assigned to "${proj.titles.name}". Digital proof layout is ready for your sign-off!`,
        type: "PROOF",
        link: `/author`,
      });
    }

    // Notify proofreaders & production managers
    const proofAssignees = getAssigneeList(proj.proof_assigned_to, proj.proof_assignees);
    if (proofAssignees.length > 0) {
      await notifyUsers(proofAssignees, {
        title: "ISBN Registered — Final Proof Stage",
        message: `ISBN ${isbn.trim()} registered for "${proj.titles.name}". Final proof stage active.`,
        type: "TASK",
        link: `/production/${id}`,
      }, user.id);
    } else {
      await notifyRoles(["proofreader", "production"], {
        title: "ISBN Registered — Final Proof Stage",
        message: `ISBN ${isbn.trim()} registered for "${proj.titles.name}". Final proof stage active.`,
        type: "TASK",
        link: `/production/${id}`,
      }, user.id);
    }

    return ok({ success: true, step: "number_allocated" });
  }

  // --- STAGE 5: FINAL PROOF (Author & Editorial Sign-Off) ---
  if (proj.status === "final_proof") {
    let action = "approve";
    let reworkNotes = "";

    if (formData) {
      action = (formData.get("action") as string) || "approve";
      reworkNotes = (formData.get("rework_notes") as string) || "";
    } else if (jsonData) {
      action = jsonData.action || "approve";
      reworkNotes = jsonData.rework_notes || "";
    }

    if (action === "rework") {
      await prisma.production_projects.update({
        where: { id },
        data: {
          status: "editing",
          editing_completed_at: null,
          proof_approved_at: null,
          proof_completed_at: null,
          proof_feedback: reworkNotes.trim() || "Rework requested during final proof sign-off",
          updated_at: now,
        },
      });

      await audit({
        userId: user.id,
        action: "request_proof_rework",
        entity: "production_project",
        entityId: id,
        detail: { project_id: id, rework_notes: reworkNotes },
      });

      if (authorEmail) {
        const mail = productionStageCompletedEmail({
          authorName,
          title: proj.titles.name,
          completedStageName: "Proof Inspection (Revision Requested)",
          nextStageName: "Editorial Rework & Typesetting Adjustments",
          stageNote: `Revision request recorded: ${reworkNotes.trim()}`,
          trackingUrl: authorTrackingUrl,
        });
        await queueEmail({
          to: authorEmail,
          toName: authorName,
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
          template: "production_proof_rework",
          refType: "production_project",
          refId: id,
        });

        await notifyAuthorByEmail(authorEmail, {
          title: "Proof Corrections Received",
          message: `Correction notes for "${proj.titles.name}" recorded. Editorial board is applying revisions.`,
          type: "PROOF",
          link: `/author`,
        });
      }

      // Notify editors and proofreaders
      const proofAndEditAssignees = [
        ...getAssigneeList(proj.proof_assigned_to, proj.proof_assignees),
        ...getAssigneeList(proj.editing_assigned_to, proj.editing_assignees),
      ];
      await notifyUsers(proofAndEditAssignees, {
        title: "Proof Revision Requested",
        message: `Corrections requested for "${proj.titles.name}": ${reworkNotes.trim()}`,
        type: "TASK",
        link: `/production/${id}`,
      }, user.id);

      return ok({ success: true, action: "rework" });
    }

    // Approve proof and complete the production project & publish the title
    await prisma.$transaction(async (tx) => {
      await tx.production_projects.update({
        where: { id },
        data: {
          status: "completed",
          proof_approved_at: proj.proof_approved_at || now,
          proof_completed_at: now,
          post_production_completed_at: now,
          handover_completed_at: now,
          updated_at: now,
        },
      });

      await tx.titles.update({
        where: { id: proj.title_id },
        data: {
          status: "active",
        },
      });
    });

    await audit({
      userId: user.id,
      action: "complete_production_and_publish",
      entity: "production_project",
      entityId: id,
      detail: { project_id: id, title_id: proj.title_id },
    });

    if (authorEmail) {
      const mail = publicationCelebrationEmail({
        authorName,
        title: proj.titles.name,
        isbn: proj.titles.isbn || proj.isbn_registered || undefined,
        authorCopiesQty: proj.author_copies_qty || 0,
        channels: ["Retail Bookstore", "Wholesale Dealers", "Book Fairs & Expos", "Online Store & Web"],
        trackingUrl: authorTrackingUrl,
      });
      await queueEmail({
        to: authorEmail,
        toName: authorName,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        template: "publication_completed",
        refType: "production_project",
        refId: id,
      });

      await notifyAuthorByEmail(authorEmail, {
        title: "Congratulations! Your Book is Officially Published",
        message: `"${proj.titles.name}" production is complete and is now active in the Kairali Books Catalog!`,
        type: "PRODUCTION",
        link: `/author`,
      });
    }

    // In-app notifications to staff
    await notifyRoles(["production", "store", "accounts", "owner"], {
      title: "Book Published & Production Complete",
      message: `"${proj.titles.name}" production complete. Book is now live in the catalog!`,
      type: "STOCK",
      link: `/production/${id}`,
    }, user.id);

    return ok({ success: true, action: "complete", next: "completed" });
  }

  // --- STAGE 6: PRINTING (Offset Printing Run) -> Advances to POST_PRODUCTION ---
  if (proj.status === "printing") {
    await prisma.production_projects.update({
      where: { id },
      data: {
        status: "post_production",
        print_completed_at: now,
        updated_at: now,
      },
    });

    await audit({
      userId: user.id,
      action: "complete_production_printing",
      entity: "production_project",
      entityId: id,
      detail: { project_id: id },
    });

    if (authorEmail) {
      const mail = productionStageCompletedEmail({
        authorName,
        title: proj.titles.name,
        completedStageName: "Offset Printing Press Run",
        nextStageName: "Post-Production Intake & Courier Dispatch",
        stageNote: "The printing run is complete! Physical copies are arriving at our central warehouse for inspection and courier dispatch.",
        trackingUrl: authorTrackingUrl,
      });
      await queueEmail({
        to: authorEmail,
        toName: authorName,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        template: "production_printing_complete",
        refType: "production_project",
        refId: id,
      });

      await notifyAuthorByEmail(authorEmail, {
        title: "Printing Completed — In Stock",
        message: `Printing run completed for "${proj.titles.name}". Copies arriving at warehouse for courier dispatch.`,
        type: "PRINT",
        link: `/author`,
      });
    }

    await notifyRoles(["store", "accounts", "production", "owner"], {
      title: "Printing Run Complete",
      message: `Printing completed for "${proj.titles.name}". Moving to warehouse intake & post-production.`,
      type: "PRINT",
      link: `/production/${id}`,
    }, user.id);

    return ok({ success: true, next: "post_production" });
  }

  return fail(400, "Cannot advance stage from current status");
});

