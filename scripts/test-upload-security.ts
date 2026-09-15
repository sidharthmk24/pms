/**
 * Comprehensive File Upload & Download Security Test Suite
 * Tests all 11 security controls against real binary buffers and inspection routines.
 */

// Mock server-only for standalone script execution
const serverOnlyPath = require.resolve("server-only");
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
  children: [],
  paths: [],
  isPreloading: false,
  require: require,
  main: process.mainModule,
} as any;

async function runTests() {
  const {
    inspectAndValidateFile,
    buildSafeContentDisposition,
    sanitizeAvatarDataUrl,
    SecurityValidationError,
    MAX_UPLOAD_BYTES,
  } = await import("../src/lib/file-security");
  const { resolveManuscript } = await import("../src/lib/storage");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  \x1b[32m✔ PASS\x1b[0m: ${testName}`);
      passed++;
    } else {
      console.error(`  \x1b[31m✘ FAIL\x1b[0m: ${testName}${detail ? ` - ${detail}` : ""}`);
      failed++;
    }
  }

  console.log("\n=======================================================");
  console.log("🛡️  KAIRALI-PMS FILE UPLOAD & SERVING HARDENING TEST SUITE");
  console.log("=======================================================\n");

  // TEST 1: Executable renamed to .pdf (PE / DOS binary magic bytes MZ...)
  console.log("TEST 1: Executable binary disguised as .pdf");
  try {
    const fakeExeAsPdf = Buffer.from("MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00This is an executable payload");
    const fakeFile = new File([fakeExeAsPdf], "invoice.pdf", { type: "application/pdf" });
    await inspectAndValidateFile(fakeFile, "manuscript");
    assert(false, "Executable renamed to .pdf should be rejected");
  } catch (err: any) {
    assert(
      err instanceof SecurityValidationError && (err.code === "MAGIC_BYTE_MISMATCH" || err.code === "INVALID_MAGIC_BYTES"),
      "Rejected executable disguised as .pdf with MAGIC_BYTE_MISMATCH code",
      err.message
    );
  }

  // TEST 2: Valid PDF header with .exe extension
  console.log("\nTEST 2: Valid PDF header with .exe extension");
  try {
    const validPdfBuffer = Buffer.from("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF");
    const fakeFile = new File([validPdfBuffer], "document.exe", { type: "application/pdf" });
    await inspectAndValidateFile(fakeFile, "manuscript");
    assert(false, "Valid PDF with .exe extension should be rejected");
  } catch (err: any) {
    assert(
      err instanceof SecurityValidationError && err.code === "DANGEROUS_EXTENSION",
      "Rejected .exe extension with DANGEROUS_EXTENSION code",
      err.message
    );
  }

  // TEST 3: Double extension disguised files (e.g. report.pdf.exe, invoice.exe.pdf, script.php.pdf)
  console.log("\nTEST 3: Dangerous double extensions");
  try {
    const validPdfBuffer = Buffer.from("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF");
    const fakeFile = new File([validPdfBuffer], "report.pdf.exe", { type: "application/pdf" });
    await inspectAndValidateFile(fakeFile, "manuscript");
    assert(false, "Double extension report.pdf.exe should be rejected");
  } catch (err: any) {
    assert(
      err instanceof SecurityValidationError && (err.code === "DANGEROUS_EXTENSION" || err.code === "DOUBLE_EXTENSION"),
      "Rejected report.pdf.exe with DOUBLE_EXTENSION / DANGEROUS_EXTENSION",
      err.message
    );
  }

  try {
    const validPdfBuffer = Buffer.from("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF");
    const fakeFile = new File([validPdfBuffer], "invoice.php.pdf", { type: "application/pdf" });
    await inspectAndValidateFile(fakeFile, "manuscript");
    assert(false, "Double extension invoice.php.pdf should be rejected");
  } catch (err: any) {
    assert(
      err instanceof SecurityValidationError && err.code === "DOUBLE_EXTENSION",
      "Rejected invoice.php.pdf with DOUBLE_EXTENSION code",
      err.message
    );
  }

  // TEST 4: Path traversal in filenames and resolveManuscript
  console.log("\nTEST 4: Path traversal attacks");
  try {
    const validPdfBuffer = Buffer.from("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF");
    const fakeFile = new File([validPdfBuffer], "../../../etc/passwd.pdf", { type: "application/pdf" });
    await inspectAndValidateFile(fakeFile, "manuscript");
    assert(false, "Path traversal filename should be rejected");
  } catch (err: any) {
    assert(
      err instanceof SecurityValidationError && err.code === "PATH_TRAVERSAL",
      "Rejected ../../../etc/passwd.pdf with PATH_TRAVERSAL code",
      err.message
    );
  }

  try {
    resolveManuscript("../../etc/shadow");
    assert(false, "resolveManuscript traversal should throw");
  } catch (err: any) {
    assert(
      err instanceof SecurityValidationError && err.code === "PATH_TRAVERSAL",
      "resolveManuscript blocked traversal '../' with PATH_TRAVERSAL code",
      err.message
    );
  }

  // TEST 5: SVG file upload prohibition (both as file and avatar)
  console.log("\nTEST 5: SVG file prohibition & script injection blocking");
  try {
    const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    const fakeFile = new File([svgBuffer], "avatar.svg", { type: "image/svg+xml" });
    await inspectAndValidateFile(fakeFile, "production");
    assert(false, "SVG file upload should be prohibited");
  } catch (err: any) {
    assert(
      err instanceof SecurityValidationError && (err.code === "SVG_PROHIBITED" || err.code === "DISALLOWED_FILE_TYPE"),
      "SVG upload strictly blocked with SVG_PROHIBITED code",
      err.message
    );
  }

  try {
    const maliciousSvgAvatar = "data:image/svg+xml;base64," + Buffer.from('<svg><script>alert("XSS")</script></svg>').toString("base64");
    sanitizeAvatarDataUrl(maliciousSvgAvatar);
    assert(false, "SVG data URL avatar should be rejected");
  } catch (err: any) {
    assert(
      err instanceof SecurityValidationError && err.code === "SVG_PROHIBITED",
      "SVG avatar data URL strictly rejected with SVG_PROHIBITED",
      err.message
    );
  }

  // TEST 6: File size limit enforcement (> 25MB)
  console.log("\nTEST 6: File size limit enforcement (25 MB max)");
  try {
    const oversizedBuffer = Buffer.alloc(MAX_UPLOAD_BYTES + 1024);
    const oversizedFile = new File([oversizedBuffer], "huge_file.pdf", { type: "application/pdf" });
    await inspectAndValidateFile(oversizedFile, "manuscript");
    assert(false, "File exceeding 25MB should be rejected");
  } catch (err: any) {
    assert(
      err instanceof SecurityValidationError && err.code === "FILE_TOO_LARGE",
      "Oversized upload rejected with FILE_TOO_LARGE code",
      err.message
    );
  }

  // TEST 7: Safe Content-Disposition and security header generation
  console.log("\nTEST 7: Content-Disposition and Download Security Headers");
  const headerDangerous = buildSafeContentDisposition('malicious"filename;\r\nInjection: True.pdf');
  assert(
    !headerDangerous.includes("\r") &&
    !headerDangerous.includes("\n") &&
    headerDangerous.startsWith("attachment; filename="),
    "buildSafeContentDisposition strips control chars, newlines, and unescaped quotes"
  );

  const headerMalayalam = buildSafeContentDisposition("രണ്ടാമൂഴം_draft.pdf");
  assert(
    headerMalayalam.includes("filename=") && headerMalayalam.includes("filename*="),
    "buildSafeContentDisposition correctly formats RFC 5987 UTF-8 encoded filename*"
  );

  // TEST 8: Genuine PDF validation
  console.log("\nTEST 8: Genuine PDF validation");
  try {
    const validPdfBuffer = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n%%EOF");
    const validFile = new File([validPdfBuffer], "genuine_manuscript.pdf", { type: "application/pdf" });
    const result = await inspectAndValidateFile(validFile, "manuscript");
    assert(
      result.detectedExt === "pdf" && result.detectedMime === "application/pdf",
      "Genuine PDF successfully validated with proper MIME and extension",
      `Detected ext: ${result.detectedExt}, mime: ${result.detectedMime}`
    );
  } catch (err: any) {
    assert(false, "Genuine PDF should be accepted", err.message);
  }

  // TEST 9: Null-byte injection in filename
  console.log("\nTEST 9: Null-byte injection");
  try {
    const validPdfBuffer = Buffer.from("%PDF-1.7\n1 0 obj\n<< >>\nendobj\n%%EOF");
    const fakeFile = new File([validPdfBuffer], "document.pdf\x00.exe", { type: "application/pdf" });
    await inspectAndValidateFile(fakeFile, "manuscript");
    assert(false, "Null byte filename should be rejected");
  } catch (err: any) {
    assert(
      err instanceof SecurityValidationError && err.code === "NULL_BYTE_DETECTED",
      "Null-byte filename rejected with NULL_BYTE_DETECTED code",
      err.message
    );
  }

  // TEST 10: EICAR Antivirus standard test signature detection
  console.log("\nTEST 10: Antivirus EICAR test signature detection");
  try {
    const eicarPayload = Buffer.concat([
      Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n"),
      Buffer.from("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"),
      Buffer.from("\n%%EOF"),
    ]);
    const eicarFile = new File([eicarPayload], "eicar_test.pdf", { type: "application/pdf" });
    await inspectAndValidateFile(eicarFile, "manuscript");
    assert(false, "EICAR antivirus test signature must be rejected");
  } catch (err: any) {
    assert(
      err instanceof SecurityValidationError && err.code === "MALWARE_DETECTED",
      "EICAR test signature successfully caught and rejected with MALWARE_DETECTED",
      err.message
    );
  }

  // TEST 11: Valid Image avatar & production visual validation
  console.log("\nTEST 11: Image avatar & production visual validation");
  try {
    // 1x1 PNG binary
    const pngHex = "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082";
    const pngBuffer = Buffer.from(pngHex, "hex");
    const pngFile = new File([pngBuffer], "cover.png", { type: "image/png" });
    const result = await inspectAndValidateFile(pngFile, "production");
    assert(
      result.detectedExt === "png" && result.detectedMime === "image/png",
      "Genuine PNG cover artwork accepted for production"
    );

    const validAvatarDataUrl = "data:image/png;base64," + pngBuffer.toString("base64");
    const sanitizedAvatar = sanitizeAvatarDataUrl(validAvatarDataUrl);
    assert(
      Boolean(sanitizedAvatar && sanitizedAvatar.startsWith("data:image/png;base64,")),
      "PNG avatar data URL correctly sanitized and validated"
    );
  } catch (err: any) {
    assert(false, "Genuine PNG should be accepted", err.message);
  }

  console.log("\n=======================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Unhandled test suite error:", err);
  process.exit(1);
});
