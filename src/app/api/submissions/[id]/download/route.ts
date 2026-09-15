import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { fail, handler } from "@/lib/api";
import { requireApiCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveManuscript, buildSafeContentDisposition } from "@/lib/storage";

export const GET = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireApiCapability("submissions.read");
  const { id } = await params;

  const sub = await prisma.submissions.findUnique({
    where: { id },
  });
  if (!sub || !sub.manuscript_path) return fail(404, "Manuscript file not found");

  const safeFilename = sub.manuscript_filename || "manuscript.pdf";
  const contentDisposition = buildSafeContentDisposition("attachment", safeFilename);

  const secureHeaders: Record<string, string> = {
    "Content-Type": "application/octet-stream",
    "Content-Disposition": contentDisposition,
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "Cache-Control": "private, no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
  };

  if (sub.manuscript_path.startsWith("http://") || sub.manuscript_path.startsWith("https://")) {
    try {
      const res = await fetch(sub.manuscript_path);
      if (!res.ok) return fail(404, "Manuscript file not found in remote storage");
      return new Response(res.body, {
        headers: secureHeaders,
      });
    } catch (err) {
      console.error("[download] remote fetch error", err);
      return fail(500, "Failed to download manuscript file from remote storage");
    }
  }

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
      },
    });

    return new Response(webStream, {
      headers: {
        ...secureHeaders,
        "Content-Length": fileStats.size.toString(),
      },
    });
  } catch (err) {
    console.error("[download] failed to download file", err);
    return fail(500, "Failed to download manuscript file from storage");
  }
});
