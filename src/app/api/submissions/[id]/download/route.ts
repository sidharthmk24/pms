import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { fail, handler } from "@/lib/api";
import { requireApiCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveManuscript } from "@/lib/storage";

export const GET = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireApiCapability("submissions.read");
  const { id } = await params;

  const sub = await prisma.submissions.findUnique({
    where: { id },
  });
  if (!sub || !sub.manuscript_path) return fail(404, "Manuscript file not found");

  try {
    const fullPath = resolveManuscript(sub.manuscript_path);
    const fileStats = await stat(fullPath);

    // Node Stream to Web Stream conversion for Next Response
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

    return new Response(webStream, {
      headers: {
        "Content-Type": sub.manuscript_mime || "application/octet-stream",
        "Content-Length": fileStats.size.toString(),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(sub.manuscript_filename || "manuscript")}"`,
      },
    });
  } catch (err) {
    console.error("[download] failed to download file", err);
    return fail(500, "Failed to download manuscript file from storage");
  }
});
