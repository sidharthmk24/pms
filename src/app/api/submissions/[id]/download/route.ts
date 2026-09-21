import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { get } from "@vercel/blob";
import { fail, handler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { can } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { resolveManuscript, buildSafeContentDisposition } from "@/lib/storage";

export const GET = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = await params;

  const sub = await prisma.submissions.findUnique({
    where: { id },
  });
  if (!sub) return fail(404, "Submission not found");

  // Allow download if user has submissions.read capability OR is the author of this submission
  const hasStaffPerm = can(user.role, "submissions.read");
  const isAuthorOwner = user.email.toLowerCase() === sub.email.toLowerCase();

  if (!hasStaffPerm && !isAuthorOwner) {
    return fail(403, "Insufficient permissions to download this file");
  }

  const url = new URL(req.url);
  const fileType = url.searchParams.get("file") || url.searchParams.get("type");
  const isCover = fileType === "cover";
  const fileId = url.searchParams.get("fileId");
  const versionParam = url.searchParams.get("version");

  let targetPath = isCover ? sub.cover_path : sub.manuscript_path;
  let safeFilename = (isCover ? sub.cover_filename : sub.manuscript_filename) || (isCover ? "cover-design.png" : "manuscript.pdf");

  if (fileId) {
    const specificFile = await prisma.submission_files.findFirst({
      where: { id: fileId, submission_id: id },
    });
    if (specificFile) {
      targetPath = specificFile.file_path;
      safeFilename = specificFile.filename;
    }
  } else if (versionParam) {
    const verNum = parseInt(versionParam, 10);
    if (!isNaN(verNum)) {
      const verFile = await prisma.submission_files.findFirst({
        where: {
          submission_id: id,
          version: verNum,
          file_type: isCover ? "cover" : "manuscript",
        },
      });
      if (verFile) {
        targetPath = verFile.file_path;
        safeFilename = verFile.filename;
      }
    }
  }

  if (!targetPath) {
    return fail(404, isCover ? "Cover design file not found" : "Manuscript file not found");
  }

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

  if (targetPath.startsWith("http://") || targetPath.startsWith("https://")) {
    try {
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        try {
          const blobRes = await get(targetPath, { access: "private" });
          if (blobRes && blobRes.statusCode === 200) {
            return new Response(blobRes.stream, {
              headers: {
                ...secureHeaders,
                ...(blobRes.blob?.contentType ? { "Content-Type": blobRes.blob.contentType } : {}),
                ...(blobRes.blob?.size ? { "Content-Length": blobRes.blob.size.toString() } : {}),
              },
            });
          }
        } catch (privateErr) {
          console.warn("[download] private blob get failed, falling back to public fetch:", privateErr);
        }
      }

      const res = await fetch(targetPath);
      if (!res.ok) return fail(404, "File not found in remote storage");
      return new Response(res.body, {
        headers: secureHeaders,
      });
    } catch (err) {
      console.error("[download] remote fetch error", err);
      return fail(500, "Failed to download file from remote storage");
    }
  }

  try {
    const fullPath = resolveManuscript(targetPath);
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
    return fail(500, "Failed to download file from storage");
  }
});
