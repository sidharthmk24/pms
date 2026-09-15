import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createPasswordResetToken } from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/mail";
import { fail, handler, ok } from "@/lib/api";
import { audit } from "@/lib/audit";

const ForgotPasswordBody = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
});

function getBaseUrl(req: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  }
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/+$/, "");
  }
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

export const POST = handler(async (req: Request) => {
  const { email } = ForgotPasswordBody.parse(await req.json());
  const normalizedEmail = email.trim().toLowerCase();

  // Find user by normalized email
  const user = await prisma.users.findUnique({
    where: { email: normalizedEmail },
  });

  if (user && user.active) {
    // Generate secure token bound to current password_hash
    const token = createPasswordResetToken(user);
    const baseUrl = getBaseUrl(req);
    const resetUrl = `${baseUrl}/login/reset-password?token=${encodeURIComponent(token)}`;

    // Dispatch email
    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
    });

    // Audit action
    try {
      await audit({
        userId: user.id,
        action: "password_reset_requested",
        entity: "user",
        entityId: user.id,
        detail: `Password reset link emailed to ${user.email}`,
      });
    } catch (auditErr) {
      console.warn("[forgot-password] audit failed:", auditErr);
    }
  }

  // Always return success to prevent email enumeration
  return ok({
    sent: true,
    message: "If an active account is associated with this email, a password reset link has been dispatched.",
  });
});
