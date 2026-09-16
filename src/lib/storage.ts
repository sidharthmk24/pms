import "server-only";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, unlink, writeFile, chmod } from "node:fs/promises";
import path from "node:path";
import { put, del } from "@vercel/blob";
import {
  inspectAndValidateFile,
  MAX_UPLOAD_BYTES,
  SecurityValidationError,
  buildSafeContentDisposition,
} from "@/lib/file-security";
import { audit } from "@/lib/audit";

export { MAX_UPLOAD_BYTES, SecurityValidationError, buildSafeContentDisposition };

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
 * Validates, scans, and safely writes a manuscript file to disk or cloud storage.
 * 1. Checks size, double extensions, null bytes, SVG prohibition.
 * 2. Inspects true binary magic bytes (e.g. %PDF-).
 * 3. Scans for trojans, malware & EICAR test signatures.
 * 4. Generates a random UUID filename and writes outside web root with stripped execute permissions (0o644).
 * 5. Logs audit trail.
 */
export async function storeManuscript(
  file: File,
  userId?: string | null
): Promise<StoredFile> {
  let validated;
  try {
    validated = await inspectAndValidateFile(file, "manuscript", userId);
  } catch (err) {
    if (err instanceof SecurityValidationError) {
      throw new UploadError(err.message);
    }
    throw err;
  }

  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const storedId = randomUUID();
  const relativePath = `${year}/${month}/${storedId}.${validated.detectedExt}`;

  // If Vercel Blob is configured
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(relativePath, validated.buffer, {
      access: "public",
      contentType: validated.detectedMime,
      addRandomSuffix: false,
    });

    await auditUploadSuccess(userId, validated.originalFilename, storedId, validated.sizeBytes, validated.detectedExt);

    return {
      relativePath: blob.url,
      absolutePath: blob.url,
      filename: validated.sanitizedFilename,
      size: validated.sizeBytes,
      mime: validated.detectedMime,
    };
  }

  const writableRoot = getWritableStorageRoot();
  const absolutePath = path.join(writableRoot, ...relativePath.split("/"));

  // Ensure directory exists
  await mkdir(path.dirname(absolutePath), { recursive: true });

  // Write file with non-executable permissions (0o644 - read/write for owner, read-only for group/others)
  await writeFile(absolutePath, validated.buffer, { mode: 0o644 });
  await chmod(absolutePath, 0o644).catch(() => {});

  await auditUploadSuccess(userId, validated.originalFilename, storedId, validated.sizeBytes, validated.detectedExt);

  return {
    relativePath,
    absolutePath,
    filename: validated.sanitizedFilename,
    size: validated.sizeBytes,
    mime: validated.detectedMime,
  };
}

/**
 * Validates, scans, and stores an author's cover design upload.
 * Allows PDF, PNG, JPG, JPEG, WEBP.
 */
export async function storeCoverDesign(
  file: File,
  userId?: string | null
): Promise<StoredFile> {
  let validated;
  try {
    validated = await inspectAndValidateFile(file, "production", userId);
  } catch (err) {
    if (err instanceof SecurityValidationError) {
      throw new UploadError(err.message);
    }
    throw err;
  }

  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const storedId = randomUUID();
  const relativePath = `covers/${year}/${month}/${storedId}.${validated.detectedExt}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(relativePath, validated.buffer, {
      access: "public",
      contentType: validated.detectedMime,
      addRandomSuffix: false,
    });

    await auditUploadSuccess(userId, validated.originalFilename, storedId, validated.sizeBytes, validated.detectedExt);

    return {
      relativePath: blob.url,
      absolutePath: blob.url,
      filename: validated.sanitizedFilename,
      size: validated.sizeBytes,
      mime: validated.detectedMime,
    };
  }

  const writableRoot = getWritableStorageRoot();
  const absolutePath = path.join(writableRoot, ...relativePath.split("/"));

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, validated.buffer, { mode: 0o644 });
  await chmod(absolutePath, 0o644).catch(() => {});

  await auditUploadSuccess(userId, validated.originalFilename, storedId, validated.sizeBytes, validated.detectedExt);

  return {
    relativePath,
    absolutePath,
    filename: validated.sanitizedFilename,
    size: validated.sizeBytes,
    mime: validated.detectedMime,
  };
}

/**
 * Validates, scans, and stores production visual artwork and layout files.
 */
export async function storeProductionFile(
  file: File,
  _allowedTypes?: string[],
  _allowedExts?: string[],
  userId?: string | null
): Promise<string> {
  let validated;
  try {
    validated = await inspectAndValidateFile(file, "production", userId);
  } catch (err) {
    if (err instanceof SecurityValidationError) {
      throw new UploadError(err.message);
    }
    throw err;
  }

  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const storedId = randomUUID();
  const relativePath = `production/${year}/${month}/${storedId}.${validated.detectedExt}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(relativePath, validated.buffer, {
      access: "public",
      contentType: validated.detectedMime,
      addRandomSuffix: false,
    });
    await auditUploadSuccess(userId, validated.originalFilename, storedId, validated.sizeBytes, validated.detectedExt);
    return blob.url;
  }

  const writableRoot = getWritableStorageRoot();
  const absolutePath = path.join(writableRoot, ...relativePath.split("/"));

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, validated.buffer, { mode: 0o644 });
  await chmod(absolutePath, 0o644).catch(() => {});

  await auditUploadSuccess(userId, validated.originalFilename, storedId, validated.sizeBytes, validated.detectedExt);

  return relativePath;
}

/** Best-effort cleanup when surrounding database transaction fails. */
export async function discardManuscript(pathOrUrl: string): Promise<void> {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      await del(pathOrUrl).catch(() => {});
    }
    return;
  }
  await unlink(pathOrUrl).catch(() => {});
}

/** Resolve a stored relative path or URL for safe downloads. */
export function resolveManuscript(relativePath: string): string {
  if (relativePath.startsWith("http://") || relativePath.startsWith("https://")) {
    return relativePath;
  }

  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const segments = normalized.split("/").filter(Boolean);

  // Prevent path traversal escape
  if (segments.some((s) => s === ".." || s === ".")) {
    throw new SecurityValidationError("Path traversal attempt detected.", "PATH_TRAVERSAL");
  }

  // Candidate read locations
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

/**
 * Record successful upload in the audit log
 */
async function auditUploadSuccess(
  userId: string | null | undefined,
  filename: string,
  storedId: string,
  size: number,
  ext: string
) {
  try {
    await audit({
      userId: userId || null,
      action: "file_upload_validated",
      entity: "file_security",
      entityId: storedId,
      detail: {
        original_filename: filename.slice(0, 200),
        stored_id: storedId,
        size_bytes: size,
        detected_ext: ext,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[storage] Failed to audit upload success:", err);
  }
}
