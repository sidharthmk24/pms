import { z } from "zod";
import bcrypt from "bcryptjs";
import { fail, handler, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireApiCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseUserRoles } from "@/lib/roles";
import { stamp } from "@/lib/time";

const UpdateUserSchema = z.object({
  name: z.string().trim().min(2).optional(),
  role: z.string().optional(),
  roles: z.array(z.string()).optional(),
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

  // Prevent self-deactivation
  if (existing.id === admin.id && data.active === false) {
    return fail(400, "You cannot deactivate your own account");
  }

  // Determine final roles if specified
  let newRoleStr: string | undefined = undefined;
  if (data.roles !== undefined || data.role !== undefined) {
    let rawRoleInput = "";
    if (data.roles && data.roles.length > 0) {
      rawRoleInput = data.roles.join(",");
    } else if (data.role) {
      rawRoleInput = data.role;
    }

    const validRoles = parseUserRoles(rawRoleInput).filter((r) => r !== "author");
    if (validRoles.length === 0) {
      return fail(400, "User must have at least one assigned team role.");
    }
    newRoleStr = validRoles.join(",");
  }

  // Prevent self-demoting from owner if they are the only active owner
  if (existing.id === admin.id && newRoleStr !== undefined && !newRoleStr.includes("owner")) {
    const allUsers = await prisma.users.findMany({
      where: { active: true, role: { not: "author" } },
      select: { id: true, role: true },
    });
    const otherOwners = allUsers.filter(
      (u) => u.id !== existing.id && parseUserRoles(u.role).includes("owner")
    );
    if (otherOwners.length === 0) {
      return fail(400, "Cannot demote the only active publisher owner");
    }
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (newRoleStr !== undefined) updateData.role = newRoleStr;
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

