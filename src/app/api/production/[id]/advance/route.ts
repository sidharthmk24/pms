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
} from "@/lib/mail";

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
      }

      return ok({ success: true, step: "request_sent" });
    }

    // Step 2: ISBN Allocation Accepted & Number Assigned -> Advances to Author Final Proof
    if (!isbn || isbn.trim().length < 5) {
      return fail(400, "ISBN number must be at least 5 characters");
    }

    const proofToken = proj.proof_token || randomUUID();

    await prisma.$transaction(async (tx) => {
      // 1. Update production project stage
      await tx.production_projects.update({
        where: { id },
        data: {
          status: "final_proof",
          isbn_completed_at: now,
          isbn_registered: isbn.trim(),
          proof_token: proofToken,
          proof_email_sent_at: now,
          updated_at: now,
        },
      });

      // 2. Set the ISBN on the linked title record
      await tx.titles.update({
        where: { id: proj.title_id },
        data: { isbn: isbn.trim() },
      });
    });

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
      }

      return ok({ success: true, action: "rework" });
    }

    // Approve proof and advance to printing press run
    await prisma.production_projects.update({
      where: { id },
      data: {
        status: "printing",
        proof_approved_at: now,
        proof_completed_at: now,
        updated_at: now,
      },
    });

    await audit({
      userId: user.id,
      action: "approve_production_proof",
      entity: "production_project",
      entityId: id,
      detail: { project_id: id },
    });

    if (authorEmail) {
      const mail = productionStageCompletedEmail({
        authorName,
        title: proj.titles.name,
        completedStageName: "Author & Editorial Final Proof Sign-Off",
        nextStageName: "Offset Printing Press Run",
        stageNote: "Final proof sign-off confirmed. Manuscript and jacket files dispatched to offset printing press.",
        trackingUrl: authorTrackingUrl,
      });
      await queueEmail({
        to: authorEmail,
        toName: authorName,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        template: "production_proof_approved",
        refType: "production_project",
        refId: id,
      });
    }

    return ok({ success: true, action: "approve" });
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
    }

    return ok({ success: true, next: "post_production" });
  }

  return fail(400, "Cannot advance stage from current status");
});
