import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { fail, handler, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { stamp } from "@/lib/time";

const SetupAccountSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().trim().optional(),
  contractId: z.string().optional(),
});

export const POST = handler(async (req: Request) => {
  const json = await req.json().catch(() => null);
  const data = SetupAccountSchema.parse(json);

  const emailKey = data.email.toLowerCase();
  const passwordHash = await bcrypt.hash(data.password, 12);
  const now = stamp();

  // Find or verify author from authors or submissions table
  const authorRecord = await prisma.authors.findFirst({
    where: { email: { equals: emailKey, mode: "insensitive" } },
  });

  const resolvedName =
    data.name?.trim() ||
    authorRecord?.name ||
    (await prisma.submissions.findFirst({
      where: { email: { equals: emailKey, mode: "insensitive" } },
      select: { author_name: true },
    }))?.author_name ||
    "Author";

  let user = await prisma.users.findUnique({
    where: { email: emailKey },
  });

  if (user) {
    // If user exists, update password and ensure active
    user = await prisma.users.update({
      where: { id: user.id },
      data: {
        password_hash: passwordHash,
        active: true,
        role: user.role === "owner" || user.role === "editor" ? user.role : "author",
      },
    });
  } else {
    // Create new author user
    const userId = randomUUID();
    user = await prisma.users.create({
      data: {
        id: userId,
        email: emailKey,
        name: resolvedName,
        password_hash: passwordHash,
        role: "author",
        active: true,
        created_at: now,
      },
    });
  }

  // Ensure author record exists if not already present
  if (!authorRecord) {
    await prisma.authors.create({
      data: {
        id: randomUUID(),
        name: resolvedName,
        email: emailKey,
        created_at: now,
      },
    }).catch(() => null);
  }

  // Automatically log the author in with a session cookie
  await createSession(user.id);

  await audit({
    userId: user.id,
    action: "author_account_setup",
    entity: "user",
    entityId: user.id,
    detail: { email: user.email, name: user.name, role: user.role, contract_id: data.contractId },
  });

  return ok({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
});
