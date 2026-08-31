import { z } from "zod";
import bcrypt from "bcryptjs";
import { fail, handler, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireApiCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stamp } from "@/lib/time";

const UpdateUserSchema = z.object({
  name: z.string().trim().min(2).optional(),
  role: z.enum(["owner", "editor", "production", "accounts", "store"]).optional(),
  active: z.boolean().optional(),
  newPassword: z.string().min(8, "Password must be at least 8 characters").optional(),
});

export const PATCH = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requireApiCapability("users.manage");
  const { id } = await params;

  const json = await req.json().catch(() => null);
  const data = UpdateUserSchema.parse(json);

  const existing = await prisma.users.findUnique({
    where: { id },
  });

  if (!existing) {
    return fail(404, "User not found");
  }

  // Prevent self-deactivation or self-demoting from owner if they are the only active owner
  if (existing.id === admin.id && data.active === false) {
    return fail(400, "You cannot deactivate your own account");
  }

  if (existing.id === admin.id && data.role && data.role !== "owner") {
    const ownerCount = await prisma.users.count({
      where: { role: "owner", active: true },
    });
    if (ownerCount <= 1) {
      return fail(400, "Cannot demote the only active owner");
    }
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.active !== undefined) updateData.active = data.active;

  if (data.newPassword) {
    updateData.password_hash = await bcrypt.hash(data.newPassword, 12);
  }

  const updated = await prisma.users.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      created_at: true,
    },
  });

  // If password changed or deactivated, revoke all existing sessions & clear login lockouts
  if (data.newPassword || data.active === false) {
    await prisma.sessions.deleteMany({ where: { user_id: id } });
    await prisma.login_attempts.deleteMany({ where: { email: existing.email } });
  }

  await audit({
    userId: admin.id,
    action: data.newPassword ? "reset_user_password" : "update_user",
    entity: "user",
    entityId: id,
    detail: {
      email: updated.email,
      name: updated.name,
      role: updated.role,
      active: updated.active,
      password_reset: !!data.newPassword,
    },
  });

  return ok({ user: updated });
});
