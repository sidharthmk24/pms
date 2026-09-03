import "server-only";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { put, del } from "@vercel/blob";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

const ALLOWED: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "application/msword": ["doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/vnd.oasis.opendocument.text": ["odt"],
};

export const ACCEPT_ATTR = ".pdf,.doc,.docx,.odt";
export const ALLOWED_LABEL = "PDF, DOC, DOCX or ODT";

/**
 * Returns a directory where files can safely be written.
 * On Vercel / AWS Lambda, the application bundle (/var/task) is strictly read-only.
 * /tmp is the only writable local disk location in serverless environments.
 */
function getWritableStorageRoot(): string {
  if (process.env.SUBMISSION_STORAGE_DIR) {
    return process.env.SUBMISSION_STORAGE_DIR;
  }
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return "/tmp/storage/submissions";
  }
  return path.join(process.cwd(), "storage", "submissions");
}

export type StoredFile = {
  relativePath: string;
  absolutePath: string;
  filename: string;
  size: number;
  mime: string;
};

export class UploadError extends Error {}

/**
 * Validates and writes a manuscript.
 * - If BLOB_READ_WRITE_TOKEN is set (Vercel Blob), uploads directly to cloud storage.
 * - Otherwise, writes to disk (using /tmp on Vercel to avoid read-only filesystem errors).
 */
export async function storeManuscript(file: File): Promise<StoredFile> {
  if (file.size === 0) throw new UploadError("The manuscript file is empty.");
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError(`Manuscript must be under ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`);
  }

  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  const allowedExts = ALLOWED[file.type];
  if (!allowedExts || !allowedExts.includes(ext)) {
    throw new UploadError(`Manuscript must be a ${ALLOWED_LABEL} file.`);
  }

  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const relativePath = `${year}/${month}/${randomUUID()}.${ext}`;

  // If Vercel Blob is configured, upload to cloud storage
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(relativePath, file, { access: "public" });
    return {
      relativePath: blob.url,
      absolutePath: blob.url,
      filename: file.name.slice(0, 200),
      size: file.size,
      mime: file.type,
    };
  }

  const writableRoot = getWritableStorageRoot();
  const absolutePath = path.join(/*turbopackIgnore: true*/ writableRoot, ...relativePath.split("/"));

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

  return {
    relativePath,
    absolutePath,
    filename: file.name.slice(0, 200),
    size: file.size,
    mime: file.type,
  };
}

/** Best-effort cleanup when the surrounding transaction fails. */
export async function discardManuscript(pathOrUrl: string): Promise<void> {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      await del(pathOrUrl).catch(() => {});
    }
    return;
  }
  await unlink(pathOrUrl).catch(() => {});
}

/** Resolve a stored relative path or URL for downloads. */
export function resolveManuscript(relativePath: string): string {
  if (relativePath.startsWith("http://") || relativePath.startsWith("https://")) {
    return relativePath;
  }

  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const segments = normalized.split("/").filter(Boolean);

  // Check candidate read locations
  const candidates = [
    ...(process.env.SUBMISSION_STORAGE_DIR ? [path.resolve(process.env.SUBMISSION_STORAGE_DIR, ...segments)] : []),
    path.resolve(process.cwd(), "storage", "submissions", ...segments),
    path.resolve("/var/task", "storage", "submissions", ...segments),
    path.resolve("/tmp", "storage", "submissions", ...segments),
    path.resolve(process.cwd(), "..", "storage", "submissions", ...segments),
  ];

  for (const c of candidates) {
    if (existsSync(c)) return c;
  }

  return path.resolve(getWritableStorageRoot(), ...segments);
}

export async function storeProductionFile(
  file: File,
  allowedTypes: string[],
  allowedExts: string[]
): Promise<string> {
  if (file.size === 0) throw new UploadError("The file is empty.");
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError(`File must be under ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`);
  }

  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  const typeOk = allowedTypes.includes(file.type);
  const extOk = allowedExts.includes(ext);
  if (!typeOk && !extOk) {
    throw new UploadError(`Invalid file format. Allowed: ${allowedExts.join(", ")}`);
  }

  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const relativePath = `production/${year}/${month}/${randomUUID()}.${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(relativePath, file, { access: "public" });
    return blob.url;
  }

  const writableRoot = getWritableStorageRoot();
  const absolutePath = path.join(/*turbopackIgnore: true*/ writableRoot, ...relativePath.split("/"));

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

  return relativePath;
}

