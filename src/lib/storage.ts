import "server-only";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

const ALLOWED: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "application/msword": ["doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/vnd.oasis.opendocument.text": ["odt"],
};

export const ACCEPT_ATTR = ".pdf,.doc,.docx,.odt";
export const ALLOWED_LABEL = "PDF, DOC, DOCX or ODT";

function storageRoot(): string {
  if (process.env.SUBMISSION_STORAGE_DIR) {
    return process.env.SUBMISSION_STORAGE_DIR;
  }
  const candidates = [
    path.join(process.cwd(), "storage", "submissions"),
    path.resolve("/var/task", "storage", "submissions"),
    path.resolve(process.cwd(), "..", "storage", "submissions"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
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
 * Validates and writes a manuscript to disk under storage/submissions/YYYY/MM/.
 * The stored name is a UUID — an author-supplied filename never touches the
 * filesystem path, only the database record.
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
  const absolutePath = path.join(storageRoot(), ...relativePath.split("/"));

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
export async function discardManuscript(absolutePath: string): Promise<void> {
  await unlink(absolutePath).catch(() => {});
}

/** Resolve a stored relative path for later staff download (Flow 8a). */
export function resolveManuscript(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const root = storageRoot();
  const segments = normalized.split("/").filter(Boolean);
  const full = path.resolve(root, ...segments);
  const resolvedRoot = path.resolve(root);
  if (!full.startsWith(resolvedRoot)) {
    throw new Error("Path traversal blocked");
  }
  return full;
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
  const absolutePath = path.join(storageRoot(), ...relativePath.split("/"));

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

  return relativePath;
}

