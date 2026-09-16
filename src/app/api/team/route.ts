import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { fail, handler, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireApiCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseUserRoles } from "@/lib/roles";
import { stamp } from "@/lib/time";
import { notifyRoles } from "@/lib/notifications";

const CreateUserSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Must be a valid email"),
  role: z.string().optional(),
  roles: z.array(z.string()).optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const GET = handler(async () => {
  await requireApiCapability("users.manage");

  const users = await prisma.users.findMany({
    where: {
      role: { not: "author" },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      created_at: true,
      _count: {
        select: {
          submissions: true,
        },
      },
    },
    orderBy: { created_at: "asc" },
  });

  return ok({ users });
});

export const POST = handler(async (req: Request) => {
  const admin = await requireApiCapability("users.manage");

  const json = await req.json().catch(() => null);
  const data = CreateUserSchema.parse(json);

  // Normalize multi-roles
  let roleInput = "";
  if (data.roles && data.roles.length > 0) {
    roleInput = data.roles.join(",");
  } else if (data.role) {
    roleInput = data.role;
  }

  const validRoles = parseUserRoles(roleInput).filter((r) => r !== "author");
  if (validRoles.length === 0) {
    return fail(400, "Please assign at least one valid team role.");
  }

  const finalRole = validRoles.join(",");
  const emailKey = data.email.toLowerCase();

  const existing = await prisma.users.findUnique({
    where: { email: emailKey },
  });

  if (existing) {
    return fail(409, `A user with email ${data.email} already exists`);
  }

  const password_hash = await bcrypt.hash(data.password, 12);
  const now = stamp();
  const userId = randomUUID();

  const user = await prisma.users.create({
    data: {
      id: userId,
      email: emailKey,
      name: data.name,
      role: finalRole,
      password_hash,
      active: true,
      created_at: now,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      created_at: true,
    },
  });

  await audit({
    userId: admin.id,
    action: "create_user",
    entity: "user",
    entityId: userId,
    detail: { email: user.email, name: user.name, role: user.role },
  });

  await notifyRoles(["owner"], {
    title: "New Team Member Added",
    message: `${user.name} (${user.email}) added with role "${user.role}" by ${admin.name}.`,
    type: "TEAM",
    link: `/team`,
  }, admin.id);

  return ok({ user });
});


