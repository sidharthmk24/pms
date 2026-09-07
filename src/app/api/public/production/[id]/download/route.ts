import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { fail, handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { resolveManuscript } from "@/lib/storage";
import { getSessionUser } from "@/lib/session";

export const GET = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const ref = searchParams.get("ref") || "";
  const email = searchParams.get("email") || "";
  const type = searchParams.get("type") || ""; // "layout" or "cover"

  const proj = await prisma.production_projects.findUnique({
    where: { id },
  });
  if (!proj) return fail(404, "Production project not found");

  // Check if caller is authenticated via session
  const sessionUser = await getSessionUser();
  let isAuthorized = false;

  if (sessionUser) {
    if (sessionUser.role === "owner" || sessionUser.role === "production" || sessionUser.role === "editor") {
      isAuthorized = true;
    } else {
      // Check if sessionUser is author of this title
      const linkedContract = await prisma.contracts.findFirst({
        where: {
          title_id: proj.title_id,
          OR: [
            { authors: { email: { equals: sessionUser.email, mode: "insensitive" } } },
            { term_notes: { contains: sessionUser.email } },
          ],
        },
      });
      if (linkedContract) isAuthorized = true;
    }
  }

  // Check token authorization (e.g. from 1-click proof approval email)
  const token = searchParams.get("token") || "";
  if (token && proj.proof_token && token === proj.proof_token) {
    isAuthorized = true;
  }

  // Fallback to public ref + email verification if not session-authenticated
  if (!isAuthorized) {
    if (!ref || !email) {
      return fail(401, "Sign in or provide valid proof token or submission ref & email to download proof files");
    }

    const contract = await prisma.contracts.findFirst({
      where: {
        title_id: proj.title_id,
        term_notes: { contains: ref },
      },
    });
    if (!contract) return fail(403, "Invalid contract link");

    const sub = await prisma.submissions.findFirst({
      where: {
        ref_no: ref,
        email: { equals: email, mode: "insensitive" },
      },
    });
    if (!sub) return fail(403, "Unauthorized access to production files");
  }

  const mode = searchParams.get("mode") || "inline"; // "inline" by default for modal viewing, "download" for forced download

  const filePath = type === "cover" ? proj.final_cover_path : proj.final_layout_path;
  if (!filePath) return fail(404, "File not uploaded yet");

  const isStaff = sessionUser && (sessionUser.role === "owner" || sessionUser.role === "production");

  try {
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
      const res = await fetch(filePath);
      if (!res.ok) return fail(404, "Proof file not found at remote storage");
      const filename = filePath.split("/").pop() || (type === "cover" ? "cover" : "layout");
      const contentDisposition = isStaff && mode === "download"
        ? `attachment; filename="${encodeURIComponent(filename)}"`
        : `inline; filename="${encodeURIComponent(filename)}"`;
      return new Response(res.body, {
        headers: {
          "Content-Type": res.headers.get("Content-Type") || (type === "cover" ? "image/jpeg" : "application/pdf"),
          "Content-Disposition": contentDisposition,
          "Cache-Control": "no-store, no-cache, must-revalidate, private",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const fullPath = resolveManuscript(filePath);
    const fileStats = await stat(fullPath);
    const filename = filePath.split("/").pop() || filePath.split("\\").pop() || (type === "cover" ? "cover" : "layout");

    const nodeStream = createReadStream(fullPath);
    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on("data", (chunk) => controller.enqueue(chunk));
        nodeStream.on("end", () => controller.close());
        nodeStream.on("error", (err) => controller.error(err));
      },
      cancel() {
        nodeStream.destroy();
      }
    });

    const ext = filename.split(".").pop()?.toLowerCase();
    let mime = type === "cover" ? "image/jpeg" : "application/pdf";
    if (ext === "pdf") mime = "application/pdf";
    else if (ext === "png") mime = "image/png";
    else if (ext === "jpg" || ext === "jpeg") mime = "image/jpeg";
    else if (ext === "webp") mime = "image/webp";

    // Authors and public viewers are strictly restricted to inline viewing; downloads disallowed
    const disposition = isStaff && mode === "download"
      ? `attachment; filename="${encodeURIComponent(filename)}"`
      : `inline; filename="${encodeURIComponent(filename)}"`;

    return new Response(webStream, {
      headers: {
        "Content-Type": mime,
        "Content-Length": fileStats.size.toString(),
        "Content-Disposition": disposition,
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("[production-download] failed to download file", err);
    return fail(500, "Failed to download production file");
  }
});
