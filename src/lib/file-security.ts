import "server-only";
import { randomUUID } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import { audit } from "@/lib/audit";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * Dangerous executable & script extensions that must never appear in any uploaded filename,
 * even as secondary extensions (e.g. "report.pdf.exe" or "novel.docx.php").
 */
const DANGEROUS_EXTENSIONS = new Set([
  "exe", "dll", "bat", "cmd", "sh", "bash", "ps1", "vbs", "vbe", "js", "jse", "wsf", "wsh",
  "php", "phtml", "php3", "php4", "php5", "php7", "phps", "phar", "cgi", "pl", "py", "pyc",
  "asp", "aspx", "axd", "asx", "ashx", "asmx", "jsp", "jspx", "jsw", "jsv", "jspa",
  "jar", "war", "ear", "msi", "msp", "scr", "hta", "cpl", "pif", "application", "gadget",
  "reg", "rgs", "svg", "svgz", "xml", "xhtml", "html", "htm", "shtml", "swf", "apk", "com",
]);

/**
 * Allowed manuscript mime types and extensions
 */
export const ALLOWED_MANUSCRIPT_TYPES = {
  pdf: {
    mime: "application/pdf",
    magicCheck: (buf: Buffer) => buf.subarray(0, 5).toString("latin1") === "%PDF-",
  },
  docx: {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    magicCheck: (buf: Buffer) =>
      buf.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])), // PK..
  },
  doc: {
    mime: "application/msword",
    magicCheck: (buf: Buffer) =>
      buf.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])), // OLE2
  },
  odt: {
    mime: "application/vnd.oasis.opendocument.text",
    magicCheck: (buf: Buffer) =>
      buf.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])), // PK..
  },
} as const;

/**
 * Allowed production visual artwork & layout mime types
 */
export const ALLOWED_PRODUCTION_TYPES = {
  ...ALLOWED_MANUSCRIPT_TYPES,
  png: {
    mime: "image/png",
    magicCheck: (buf: Buffer) =>
      buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  jpg: {
    mime: "image/jpeg",
    magicCheck: (buf: Buffer) =>
      buf.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
  },
  jpeg: {
    mime: "image/jpeg",
    magicCheck: (buf: Buffer) =>
      buf.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
  },
  webp: {
    mime: "image/webp",
    magicCheck: (buf: Buffer) =>
      buf.subarray(0, 4).toString("latin1") === "RIFF" &&
      buf.subarray(8, 12).toString("latin1") === "WEBP",
  },
} as const;

export class SecurityValidationError extends Error {
  public code: string;
  constructor(message: string, code = "INVALID_FILE") {
    super(message);
    this.name = "SecurityValidationError";
    this.code = code;
  }
}

/**
 * Standard EICAR Antivirus Test Signature
 */
const EICAR_SIGNATURE = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

/**
 * Antivirus scanner: Scans buffer against ClamAV daemon or EICAR signature.
 */
export async function scanForMalware(
  buffer: Buffer,
  filename: string
): Promise<{ safe: boolean; virusName?: string }> {
  // 1. Check for EICAR test string
  const textContent = buffer.toString("latin1");
  if (textContent.includes(EICAR_SIGNATURE)) {
    return { safe: false, virusName: "EICAR-Test-Signature (Win.Test.EICAR_HDB-1)" };
  }

  // 2. Check for known binary executable magic signatures (MZ, ELF, Mach-O)
  if (buffer.subarray(0, 2).toString("latin1") === "MZ") {
    return { safe: false, virusName: "Win32.Executable.DisguisedPE" };
  }
  if (buffer.subarray(0, 4).equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46]))) {
    return { safe: false, virusName: "Linux.ELF.DisguisedBinary" };
  }

  // 3. Connect to ClamAV daemon via TCP if CLAMAV_HOST is configured
  const clamHost = process.env.CLAMAV_HOST;
  const clamPort = parseInt(process.env.CLAMAV_PORT || "3310", 10);

  if (clamHost) {
    try {
      const { createConnection } = await import("node:net");
      const result = await new Promise<{ safe: boolean; virusName?: string }>((resolve, reject) => {
        const socket = createConnection({ host: clamHost, port: clamPort }, () => {
          // Send INSTREAM command to clamd
          socket.write("zINSTREAM\0");

          // Write chunk size and chunk
          const lengthBuf = Buffer.alloc(4);
          lengthBuf.writeUInt32BE(buffer.length, 0);
          socket.write(lengthBuf);
          socket.write(buffer);

          // Zero-length chunk marks EOF
          const zeroBuf = Buffer.alloc(4);
          zeroBuf.writeUInt32BE(0, 0);
          socket.write(zeroBuf);
        });

        let response = "";
        socket.on("data", (data) => {
          response += data.toString("utf-8");
        });

        socket.on("end", () => {
          if (response.includes("OK") && !response.includes("FOUND")) {
            resolve({ safe: true });
          } else if (response.includes("FOUND")) {
            const match = response.match(/stream:\s+(.+?)\s+FOUND/);
            resolve({ safe: false, virusName: match ? match[1] : "Malware.Detected" });
          } else {
            resolve({ safe: false, virusName: `Unknown scanner response: ${response}` });
          }
        });

        socket.on("error", (err) => {
          reject(err);
        });

        // 5 second timeout for scanning
        socket.setTimeout(5000, () => {
          socket.destroy();
          reject(new Error("ClamAV scan timed out"));
        });
      });

      return result;
    } catch (err) {
      console.warn(`[antivirus] ClamAV daemon error on ${clamHost}:${clamPort}:`, err);
      // Fail closed policy if CLAMAV_FAIL_CLOSED is true
      if (process.env.CLAMAV_FAIL_CLOSED === "true") {
        return { safe: false, virusName: "ScannerUnavailable.Quarantined" };
      }
    }
  }

  return { safe: true };
}

/**
 * Validates a filename against path traversal, null bytes, double extensions, and dangerous types.
 */
export function validateFilename(filename: string): { ext: string; basename: string } {
  if (!filename || typeof filename !== "string") {
    throw new SecurityValidationError("Filename is missing or invalid.", "INVALID_FILENAME");
  }

  // 1. Reject Null Byte Injection
  if (filename.includes("\0") || filename.includes("%00")) {
    throw new SecurityValidationError("Filename contains forbidden null characters.", "NULL_BYTE_DETECTED");
  }

  // 2. Reject Path Traversal characters
  if (filename.includes("/") || filename.includes("\\") || filename.includes("..")) {
    throw new SecurityValidationError("Path traversal characters are prohibited in filenames.", "PATH_TRAVERSAL");
  }

  // 3. Extract parts and check double extensions
  const parts = filename.split(".").filter(Boolean);
  if (parts.length < 2) {
    throw new SecurityValidationError("File must have a valid file extension.", "MISSING_EXTENSION");
  }

  const ext = (parts.pop() ?? "").toLowerCase();

  // Reject SVG outright
  if (ext === "svg" || ext === "svgz") {
    throw new SecurityValidationError(
      "SVG files are strictly prohibited due to security restrictions. Please use PDF, PNG, JPG, or DOCX.",
      "SVG_PROHIBITED"
    );
  }

  // Check all intermediate extension segments for executable/script tokens (e.g. "novel.pdf.exe" or "doc.php.docx")
  for (const part of parts.slice(1)) {
    const segment = part.toLowerCase();
    if (DANGEROUS_EXTENSIONS.has(segment)) {
      throw new SecurityValidationError(
        `Disguised double extension detected (.${segment}.${ext}). Upload rejected.`,
        "DOUBLE_EXTENSION"
      );
    }
  }

  // Check final extension
  if (DANGEROUS_EXTENSIONS.has(ext)) {
    throw new SecurityValidationError(
      `Executable or script file type (.${ext}) is strictly prohibited.`,
      "DANGEROUS_EXTENSION"
    );
  }

  const basename = parts.join(".");
  return { ext, basename };
}

export type ValidatedUpload = {
  buffer: Buffer;
  originalFilename: string;
  sanitizedFilename: string;
  detectedExt: string;
  detectedMime: string;
  sizeBytes: number;
};

/**
 * Deep inspection & validation of an uploaded File/Blob.
 * 1. Checks file size bounds.
 * 2. Hardens and validates filename.
 * 3. Inspects real binary magic bytes.
 * 4. Cross-verifies magic bytes against extension and declared MIME.
 * 5. Runs Antivirus & signature scanner.
 * 6. Logs audit trail.
 */
export async function inspectAndValidateFile(
  file: File,
  allowedCategory: "manuscript" | "production",
  userId?: string | null
): Promise<ValidatedUpload> {
  const originalFilename = file.name || "uploaded_file";

  // 1. Size Check
  if (file.size === 0) {
    await auditUploadRejection(userId, originalFilename, 0, "File is empty (0 bytes)");
    throw new SecurityValidationError("The uploaded file is empty.", "EMPTY_FILE");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    await auditUploadRejection(
      userId,
      originalFilename,
      file.size,
      `Exceeded max file size (${file.size} bytes > ${MAX_UPLOAD_BYTES} bytes)`
    );
    throw new SecurityValidationError(
      `File exceeds the maximum permitted limit of ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`,
      "FILE_TOO_LARGE"
    );
  }

  // 2. Filename Check
  const { ext } = validateFilename(originalFilename);

  // 3. Read bytes into buffer
  const arrayBuf = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);

  // 4. Magic Byte Inspection
  const allowedMap =
    allowedCategory === "manuscript" ? ALLOWED_MANUSCRIPT_TYPES : ALLOWED_PRODUCTION_TYPES;

  const typeConfig = allowedMap[ext as keyof typeof allowedMap];
  if (!typeConfig) {
    const allowedList = Object.keys(allowedMap).join(", ").toUpperCase();
    await auditUploadRejection(
      userId,
      originalFilename,
      file.size,
      `Extension .${ext} not in allowlist for ${allowedCategory}`
    );
    throw new SecurityValidationError(
      `File extension .${ext} is not allowed. Permitted formats: ${allowedList}.`,
      "DISALLOWED_TYPE"
    );
  }

  // Verify binary header matches expected type
  const magicMatches = typeConfig.magicCheck(buffer);
  if (!magicMatches) {
    await auditUploadRejection(
      userId,
      originalFilename,
      file.size,
      `Magic byte mismatch: File claims to be .${ext} but binary signature does not match.`
    );
    throw new SecurityValidationError(
      `File signature mismatch: The content of this file is not a genuine .${ext} document.`,
      "MAGIC_BYTE_MISMATCH"
    );
  }

  // Deep container inspection with file-type
  const detected = await fileTypeFromBuffer(buffer);
  if (detected) {
    // If deep inspection detected a dangerous executable or script type
    if (DANGEROUS_EXTENSIONS.has(detected.ext)) {
      await auditUploadRejection(
        userId,
        originalFilename,
        file.size,
        `Deep inspection detected disguised executable: ${detected.mime} (${detected.ext})`
      );
      throw new SecurityValidationError(
        `Security alert: Disguised binary payload detected (${detected.mime}). Upload rejected.`,
        "MALICIOUS_PAYLOAD"
      );
    }
  }

  // 5. Antivirus & Malware Scan
  const scanResult = await scanForMalware(buffer, originalFilename);
  if (!scanResult.safe) {
    await auditUploadRejection(
      userId,
      originalFilename,
      file.size,
      `MALWARE DETECTED: ${scanResult.virusName}`
    );
    throw new SecurityValidationError(
      `Security violation: Malicious payload or trojan signature detected (${scanResult.virusName}). File quarantined and rejected.`,
      "MALWARE_DETECTED"
    );
  }

  // 6. Sanitized safe filename for Content-Disposition header
  const sanitizedSafe = originalFilename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.+/g, ".")
    .slice(0, 100);

  return {
    buffer,
    originalFilename,
    sanitizedFilename: sanitizedSafe,
    detectedExt: ext,
    detectedMime: typeConfig.mime,
    sizeBytes: file.size,
  };
}

/**
 * Record rejection in audit log
 */
async function auditUploadRejection(
  userId: string | null | undefined,
  filename: string,
  size: number,
  reason: string
) {
  try {
    await audit({
      userId: userId || null,
      action: "file_upload_rejected",
      entity: "file_security",
      entityId: randomUUID(),
      detail: {
        filename: filename.slice(0, 200),
        size,
        reason,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[file-security] Failed to audit upload rejection:", err);
  }
}

/**
 * Creates RFC 6266 / RFC 5987 compliant Content-Disposition header.
 * Strips quotes, linebreaks, and control characters to prevent header injection.
 */
export function buildSafeContentDisposition(
  dispositionOrFilename: "attachment" | "inline" | string,
  maybeFilename?: string
): string {
  let disposition: "attachment" | "inline" = "attachment";
  let filename = "";

  if (dispositionOrFilename === "attachment" || dispositionOrFilename === "inline") {
    disposition = dispositionOrFilename;
    filename = maybeFilename || "download";
  } else {
    filename = dispositionOrFilename;
    if (maybeFilename === "attachment" || maybeFilename === "inline") {
      disposition = maybeFilename;
    }
  }

  // Strip non-printable ASCII and quotes/newlines
  const cleanAscii = filename
    .replace(/[\r\n\t"'\\]/g, "")
    .replace(/[^\x20-\x7E]/g, "_")
    .trim() || "download";

  const encodedUtf8 = encodeURIComponent(filename);
  return `${disposition}; filename="${cleanAscii}"; filename*=UTF-8''${encodedUtf8}`;
}

/**
 * Sanitizes and validates a Base64 image data URL (for user avatars).
 * Rejects SVG, executable payloads, scripts, or corrupted data.
 */
export function sanitizeAvatarDataUrl(dataUrl: string | null | undefined): string | null {
  if (!dataUrl || typeof dataUrl !== "string") return null;

  if (dataUrl.startsWith("data:image/svg") || dataUrl.includes("<svg") || dataUrl.includes("<script")) {
    throw new SecurityValidationError("SVG and script-embedded avatars are strictly prohibited.", "SVG_PROHIBITED");
  }

  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    return null;
  }

  const mime = match[1];
  const b64Data = match[2];

  if (b64Data.length > 4 * 1024 * 1024) {
    throw new SecurityValidationError("Avatar image exceeds maximum permitted size of 3 MB.", "AVATAR_TOO_LARGE");
  }

  const buf = Buffer.from(b64Data, "base64");
  if (buf.length < 8) return null;

  if (mime === "png" && !buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    throw new SecurityValidationError("Corrupted or disguised PNG avatar image.", "INVALID_AVATAR");
  }
  if ((mime === "jpeg" || mime === "jpg") && !buf.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    throw new SecurityValidationError("Corrupted or disguised JPEG avatar image.", "INVALID_AVATAR");
  }
  if (mime === "webp" && (buf.subarray(0, 4).toString("latin1") !== "RIFF" || buf.subarray(8, 12).toString("latin1") !== "WEBP")) {
    throw new SecurityValidationError("Corrupted or disguised WEBP avatar image.", "INVALID_AVATAR");
  }

  return dataUrl;
}

