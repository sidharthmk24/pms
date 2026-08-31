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

  // Validate that the user is authorized to advance the current stage (either assignee or manager)
  let isAuthorized = user.role === "owner";
  if (proj.status === "dtp" && proj.dtp_assigned_to === user.id) isAuthorized = true;
  else if (proj.status === "editing" && proj.editing_assigned_to === user.id) isAuthorized = true;
  else if (proj.status === "cover_design" && proj.cover_assigned_to === user.id) isAuthorized = true;
  else if (proj.status === "isbn_registration" && proj.isbn_assigned_to === user.id) isAuthorized = true;

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
    let isbn = "";
    if (formData) {
      isbn = (formData.get("isbn") as string) || "";
    } else if (jsonData) {
      isbn = jsonData.isbn || "";
    }

    if (!isbn || isbn.length < 5) {
      return fail(400, "ISBN must be at least 5 characters");
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update the production project stage
      await tx.production_projects.update({
        where: { id },
        data: {
          status: "final_proof",
          isbn_completed_at: now,
          isbn_registered: isbn,
          updated_at: now,
        },
      });

      // 2. Set the ISBN on the linked title record
      await tx.titles.update({
        where: { id: proj.title_id },
        data: { isbn },
      });
    });

    await audit({
      userId: user.id,
      action: "complete_production_isbn",
      entity: "production_project",
      entityId: id,
      detail: { project_id: id, isbn },
    });

    return ok({ success: true });
  }

  return fail(400, "Cannot advance stage from current status");
});
