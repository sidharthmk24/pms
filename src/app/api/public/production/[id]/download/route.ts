import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { fail, handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { resolveManuscript } from "@/lib/storage";

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

  // Verify access by matching the contract and submission
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

  const filePath = type === "cover" ? proj.final_cover_path : proj.final_layout_path;
  if (!filePath) return fail(404, "File not uploaded yet");

  try {
    const fullPath = resolveManuscript(filePath);
    const fileStats = await stat(fullPath);
    const filename = filePath.split("/").pop() || (type === "cover" ? "cover" : "layout");

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

    const mime = type === "cover" ? "image/png" : "application/pdf";

    return new Response(webStream, {
      headers: {
        "Content-Type": mime,
        "Content-Length": fileStats.size.toString(),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (err) {
    console.error("[production-download] failed to download file", err);
    return fail(500, "Failed to download production file");
  }
});
