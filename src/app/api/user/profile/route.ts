import { z } from "zod";
import { randomUUID } from "node:crypto";
import { handler, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { stamp } from "@/lib/time";

const UpdateProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
  avatar: z.string().nullable().optional(),
  phone: z.string().trim().optional(),
  place: z.string().trim().optional(),
});

export const PATCH = handler(async (req: Request) => {
  const user = await requireUser();
  const json = await req.json().catch(() => null);
  const data = UpdateProfileSchema.parse(json);

  const updatedName = data.name?.trim() || user.name;

  // 1. Update users table
  await prisma.users.update({
    where: { id: user.id },
    data: {
      name: updatedName,
    },
  });

  // 2. Update authors record if present or create if author role
  const authorRecord = await prisma.authors.findFirst({
    where: { email: { equals: user.email, mode: "insensitive" } },
  });

  let newAvatar = data.avatar;

  if (authorRecord) {
    let notesObj: Record<string, unknown> = {};
    if (authorRecord.notes) {
      try {
        notesObj = JSON.parse(authorRecord.notes);
      } catch {
        notesObj = { raw: authorRecord.notes };
      }
    }

    if (data.avatar !== undefined) {
      notesObj.avatar = data.avatar;
    } else if (notesObj.avatar) {
      newAvatar = notesObj.avatar as string;
    }

    await prisma.authors.update({
      where: { id: authorRecord.id },
      data: {
        name: updatedName,
        phone: data.phone !== undefined ? data.phone : authorRecord.phone,
        address: data.place !== undefined ? data.place : authorRecord.address,
        notes: JSON.stringify(notesObj),
      },
    });
  } else if (user.role === "author") {
    const notesObj = { avatar: data.avatar || null };
    await prisma.authors.create({
      data: {
        id: randomUUID(),
        name: updatedName,
        email: user.email.toLowerCase(),
        phone: data.phone || null,
        notes: JSON.stringify(notesObj),
        created_at: stamp(),
      },
    }).catch(() => null);
  }

  // Also update submissions author_name if author
  if (user.role === "author") {
    await prisma.submissions.updateMany({
      where: { email: { equals: user.email, mode: "insensitive" } },
      data: { author_name: updatedName },
    }).catch(() => null);
  }

  await audit({
    userId: user.id,
    action: "update_profile",
    entity: "user",
    entityId: user.id,
    detail: { name: updatedName, has_avatar: Boolean(newAvatar), phone: data.phone },
  });

  return ok({
    success: true,
    name: updatedName,
    avatar: newAvatar,
    phone: data.phone,
  });
});
