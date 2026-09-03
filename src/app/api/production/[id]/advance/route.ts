import { z } from "zod";
import { fail, handler, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireApiCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stamp } from "@/lib/time";
import { storeProductionFile } from "@/lib/storage";

export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireApiCapability("production_pipeline.write");
  const { id } = await params;

  const proj = await prisma.production_projects.findUnique({
    where: { id },
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
  else if (proj.status === "final_proof" && isUserAssigned(proj.proof_assigned_to, proj.proof_assignees, user.id)) isAuthorized = true;

  if (!isAuthorized) {
    return fail(403, "You are not assigned to the active stage of this production project");
  }

  const contentType = req.headers.get("content-type") || "";
  let formData: FormData | null = null;
  let jsonData: any = null;
  if (contentType.includes("multipart/form-data")) {
    formData = await req.formData();
  } else {
    jsonData = await req.json().catch(() => null);
  }

  if (proj.status === "dtp") {
    let final_layout_path = proj.final_layout_path;
    if (formData) {
      const file = formData.get("layout_file") as File | null;
      if (file && file.size > 0) {
        final_layout_path = await storeProductionFile(
          file,
          ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
          ["pdf", "doc", "docx"]
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

    return ok({ success: true });
  }

  if (proj.status === "editing") {
    await prisma.production_projects.update({
      where: { id },
      data: {
        status: "cover_design",
        editing_completed_at: now,
        updated_at: now,
      },
    });

    await audit({
      userId: user.id,
      action: "complete_production_editing",
      entity: "production_project",
      entityId: id,
      detail: { project_id: id },
    });

    return ok({ success: true });
  }

  if (proj.status === "cover_design") {
    let final_cover_path = proj.final_cover_path;
    if (formData) {
      const file = formData.get("cover_file") as File | null;
      if (file && file.size > 0) {
        final_cover_path = await storeProductionFile(
          file,
          ["image/png", "image/jpeg", "image/webp", "application/pdf"],
          ["png", "jpg", "jpeg", "webp", "pdf"]
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

    return ok({ success: true });
  }

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

      return ok({ success: true, step: "request_sent" });
    }

    // Step 2: ISBN Allocation Accepted & Number Assigned
    if (!isbn || isbn.trim().length < 5) {
      return fail(400, "ISBN number must be at least 5 characters");
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update the production project stage
      await tx.production_projects.update({
        where: { id },
        data: {
          status: "final_proof",
          isbn_completed_at: now,
          isbn_registered: isbn.trim(),
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

    return ok({ success: true, step: "number_allocated" });
  }

  if (proj.status === "final_proof" || proj.status === "printing") {
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

      return ok({ success: true, action: "rework" });
    }

    // Approve proof and advance to printing press run
    if (proj.status === "final_proof") {
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

      return ok({ success: true, action: "approve" });
    }
  }

  return fail(400, "Cannot advance stage from current status");
});
