import { z } from "zod";
import { randomUUID } from "node:crypto";
import { fail, handler, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireApiCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stamp } from "@/lib/time";

const CreateAuthorSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  name_ml: z.string().trim().optional().nullable(),
  email: z.string().trim().email("Invalid email").optional().nullable().or(z.literal("")),
  phone: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  pan: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export const GET = handler(async () => {
  await requireApiCapability("authors.read");

  const authors = await prisma.authors.findMany({
    include: {
      _count: {
        select: {
          titles: true,
          contracts: true,
          payouts: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return ok({ authors });
});

export const POST = handler(async (req: Request) => {
  const user = await requireApiCapability("authors.read");

  const json = await req.json().catch(() => null);
  const data = CreateAuthorSchema.parse(json);

  const cleanEmail = data.email && data.email.trim() !== "" ? data.email.toLowerCase().trim() : null;

  if (cleanEmail) {
    const existing = await prisma.authors.findFirst({
      where: { email: { equals: cleanEmail, mode: "insensitive" } },
    });
    if (existing) {
      return fail(409, `An author with email ${cleanEmail} already exists (${existing.name})`);
    }
  }

  const now = stamp();
  const authorId = randomUUID();

  const author = await prisma.authors.create({
    data: {
      id: authorId,
      name: data.name.trim(),
      name_ml: data.name_ml?.trim() || null,
      email: cleanEmail,
      phone: data.phone?.trim() || null,
      address: data.address?.trim() || null,
      pan: data.pan?.trim() || null,
      notes: data.notes?.trim() || null,
      created_at: now,
    },
  });

  await audit({
    userId: user.id,
    action: "create_author",
    entity: "author",
    entityId: authorId,
    detail: { name: author.name, email: author.email },
  });

  return ok({ author });
});
