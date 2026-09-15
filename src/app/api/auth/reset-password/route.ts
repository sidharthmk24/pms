import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyPasswordResetToken } from "@/lib/password-reset";
import { fail, handler, ok } from "@/lib/api";
import { audit } from "@/lib/audit";

const ResetPasswordBody = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(128, "Password cannot exceed 128 characters"),
});

// GET: Validate token before rendering form
export const GET = handler(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return fail(400, "Reset token is required");
  }

  const result = await verifyPasswordResetToken(token);
  if (!result.valid) {
    if (result.reason === "expired") {
      return fail(400, "This password reset link has expired. Please request a new one.", {
        reason: "expired",
      });
    }
    return fail(400, "This password reset link is invalid or has already been used.", {
      reason: "invalid",
    });
  }

  return ok({
    valid: true,
    email: result.user.email,
    name: result.user.name,
  });
});

// POST: Perform actual password reset
export const POST = handler(async (req: Request) => {
  const { token, password } = ResetPasswordBody.parse(await req.json());

  const result = await verifyPasswordResetToken(token);
  if (!result.valid) {
    if (result.reason === "expired") {
      return fail(400, "This password reset link has expired. Please request a new one.", {
        reason: "expired",
      });
    }
    return fail(400, "This password reset link is invalid or has already been used.", {
      reason: "invalid",
    });
  }

  const user = result.user;
  const newPasswordHash = await bcrypt.hash(password, 12);

  // Update user password
  await prisma.users.update({
    where: { id: user.id },
    data: {
      password_hash: newPasswordHash,
    },
  });

  // Audit event
  try {
    await audit({
      userId: user.id,
      action: "password_reset_completed",
      entity: "user",
      entityId: user.id,
      detail: `Password successfully updated for ${user.email}`,
    });
  } catch (auditErr) {
    console.warn("[reset-password] audit failed:", auditErr);
  }

  return ok({
    success: true,
    message: "Your password has been successfully reset. You can now sign in.",
  });
});
