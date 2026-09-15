import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

const RESET_SECRET =
  process.env.SESSION_SECRET ||
  process.env.DATABASE_URL ||
  "kairali-pms-secure-password-reset-key-2026";

const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

type TokenPayload = {
  userId: string;
  email: string;
  exp: number;
};

function signPayload(payload: TokenPayload, passwordHash: string): string {
  const dataToSign = `${payload.userId}:${payload.email.toLowerCase()}:${payload.exp}:${passwordHash}`;
  return createHmac("sha256", RESET_SECRET).update(dataToSign).digest("hex");
}

/**
 * Creates a cryptographically signed, single-use, 1-hour expiring password reset token.
 * Tying the HMAC signature to the user's current password_hash ensures that as soon
 * as the password is reset, the token is automatically invalidated forever.
 */
export function createPasswordResetToken(user: {
  id: string;
  email: string;
  password_hash: string;
}): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email.toLowerCase(),
    exp: Date.now() + TOKEN_EXPIRY_MS,
  };

  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signPayload(payload, user.password_hash);

  return `${payloadEncoded}.${signature}`;
}

export type VerifyTokenResult =
  | { valid: true; user: { id: string; email: string; name: string; role: string; password_hash: string } }
  | { valid: false; reason: "expired" | "invalid" | "user_not_found" | "inactive" };

/**
 * Verifies the integrity, expiry, and single-use signature of the password reset token.
 */
export async function verifyPasswordResetToken(token: string): Promise<VerifyTokenResult> {
  if (!token || typeof token !== "string") {
    return { valid: false, reason: "invalid" };
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return { valid: false, reason: "invalid" };
  }

  const [payloadEncoded, signature] = parts;

  let payload: TokenPayload;
  try {
    const jsonStr = Buffer.from(payloadEncoded, "base64url").toString("utf-8");
    payload = JSON.parse(jsonStr);
  } catch {
    return { valid: false, reason: "invalid" };
  }

  if (!payload.userId || !payload.email || !payload.exp) {
    return { valid: false, reason: "invalid" };
  }

  // Check expiry
  if (Date.now() > payload.exp) {
    return { valid: false, reason: "expired" };
  }

  // Load user
  const user = await prisma.users.findUnique({
    where: { id: payload.userId },
  });

  if (!user || user.email.toLowerCase() !== payload.email.toLowerCase()) {
    return { valid: false, reason: "user_not_found" };
  }

  if (!user.active) {
    return { valid: false, reason: "inactive" };
  }

  // Verify HMAC signature against current password_hash
  const expectedSignature = signPayload(payload, user.password_hash);
  const sigBuffer = Buffer.from(signature, "hex");
  const expectedSigBuffer = Buffer.from(expectedSignature, "hex");

  if (
    sigBuffer.length !== expectedSigBuffer.length ||
    !timingSafeEqual(sigBuffer, expectedSigBuffer)
  ) {
    return { valid: false, reason: "invalid" };
  }

  return { valid: true, user };
}
