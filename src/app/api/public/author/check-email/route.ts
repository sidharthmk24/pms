import { z } from "zod";
import { handler, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const CheckEmailSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
});

export const POST = handler(async (req: Request) => {
  const json = await req.json().catch(() => ({}));
  const { email } = CheckEmailSchema.parse(json);
  const emailKey = email.toLowerCase().trim();

  // 1. Check if user exists in users table (case-insensitive)
  const user = await prisma.users.findFirst({
    where: { email: { equals: emailKey, mode: "insensitive" } },
    select: { id: true, name: true, role: true, active: true },
  });

  if (user) {
    return ok({
      exists: true,
      email: emailKey,
      name: user.name,
      role: user.role,
    });
  }

  // 2. Check if author profile exists in authors table (case-insensitive)
  const author = await prisma.authors.findFirst({
    where: { email: { equals: emailKey, mode: "insensitive" } },
    select: { id: true, name: true },
  });

  if (author) {
    return ok({
      exists: true,
      email: emailKey,
      name: author.name,
      role: "author",
    });
  }

  return ok({ exists: false, email: emailKey });
});

export const GET = handler(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const rawEmail = searchParams.get("email");
  if (!rawEmail) {
    return ok({ exists: false });
  }

  const { email } = CheckEmailSchema.parse({ email: rawEmail });
  const emailKey = email.toLowerCase().trim();

  const user = await prisma.users.findFirst({
    where: { email: { equals: emailKey, mode: "insensitive" } },
    select: { id: true, name: true, role: true, active: true },
  });

  if (user) {
    return ok({
      exists: true,
      email: emailKey,
      name: user.name,
      role: user.role,
    });
  }

  const author = await prisma.authors.findFirst({
    where: { email: { equals: emailKey, mode: "insensitive" } },
    select: { id: true, name: true },
  });

  if (author) {
    return ok({
      exists: true,
      email: emailKey,
      name: author.name,
      role: "author",
    });
  }

  return ok({ exists: false, email: emailKey });
});

