import { z } from "zod";
import { fail, handler, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireApiCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const UpdateAuthorSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
  name_ml: z.string().trim().optional().nullable(),
  email: z.string().trim().email("Invalid email").optional().nullable().or(z.literal("")),
  phone: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  pan: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export const PATCH = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireApiCapability("authors.read");
  const { id } = await params;

  const json = await req.json().catch(() => null);
  const data = UpdateAuthorSchema.parse(json);

  const existing = await prisma.authors.findUnique({
    where: { id },
  });

  if (!existing) {
    return fail(404, "Author not found");
  }

  const cleanEmail =
    data.email !== undefined
      ? data.email && data.email.trim() !== ""
        ? data.email.toLowerCase().trim()
        : null
      : undefined;

  if (cleanEmail && cleanEmail !== existing.email?.toLowerCase()) {
    const duplicate = await prisma.authors.findFirst({
      where: {
        email: { equals: cleanEmail, mode: "insensitive" },
        id: { not: id },
      },
    });
    if (duplicate) {
      return fail(409, `An author with email ${cleanEmail} already exists (${duplicate.name})`);
    }
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.name_ml !== undefined) updateData.name_ml = data.name_ml?.trim() || null;
  if (cleanEmail !== undefined) updateData.email = cleanEmail;
  if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
  if (data.address !== undefined) updateData.address = data.address?.trim() || null;
  if (data.pan !== undefined) updateData.pan = data.pan?.trim() || null;
  if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;

  const updated = await prisma.authors.update({
    where: { id },
    data: updateData,
  });

  await audit({
    userId: user.id,
    action: "update_author",
    entity: "author",
    entityId: id,
    detail: { name: updated.name, email: updated.email },
  });

  return ok({ author: updated });
});

export const DELETE = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireApiCapability("authors.read");
  const { id } = await params;

  const existing = await prisma.authors.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          titles: true,
          contracts: true,
        },
      },
    },
  });

  if (!existing) {
    return fail(404, "Author not found");
  }

  if (existing._count.titles > 0 || existing._count.contracts > 0) {
    return fail(
      400,
      `Cannot delete author "${existing.name}". They have ${existing._count.titles} published title(s) and ${existing._count.contracts} contract(s) associated with them.`
    );
  }

  await prisma.authors.delete({
    where: { id },
  });

  await audit({
    userId: user.id,
    action: "delete_author",
    entity: "author",
    entityId: id,
    detail: { name: existing.name, email: existing.email },
  });

  return ok({ success: true });
});
