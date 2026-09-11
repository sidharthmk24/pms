import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { fail, handler, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { stamp } from "@/lib/time";

const RegisterAuthorSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Confirm your password"),
  avatar: z.string().optional(),
  phone: z.string().optional(),
  place: z.string().optional(),
  bio: z.string().optional(),
  interests: z.union([z.array(z.string()), z.string()]).optional(),
  pastPublications: z.string().optional(),
  ref: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const POST = handler(async (req: Request) => {
  const json = await req.json().catch(() => null);
  const data = RegisterAuthorSchema.parse(json);

  const emailKey = data.email.toLowerCase().trim();
  const passwordHash = await bcrypt.hash(data.password, 12);
  const now = stamp();

  // Reject if user already exists
  const existingUser = await prisma.users.findFirst({
    where: { email: { equals: emailKey, mode: "insensitive" } },
  });

  if (existingUser) {
    return fail(409, "This user already exists with this email. Please log in instead.");
  }

  const userId = randomUUID();
  const user = await prisma.users.create({
    data: {
      id: userId,
      email: emailKey,
      name: data.name.trim(),
      password_hash: passwordHash,
      role: "author",
      active: true,
      created_at: now,
    },
  });

  // Find or create / update author profile
  const existingAuthor = await prisma.authors.findFirst({
    where: { email: { equals: emailKey, mode: "insensitive" } },
  });

  const notesObj = {
    avatar: data.avatar || null,
    bio: data.bio?.trim() || null,
    interests: data.interests || null,
    past_publications: data.pastPublications?.trim() || null,
    registered_at: now,
    submission_ref: data.ref || null,
  };

  if (existingAuthor) {
    let mergedNotes = JSON.stringify(notesObj);
    if (existingAuthor.notes) {
      try {
        const parsed = JSON.parse(existingAuthor.notes);
        mergedNotes = JSON.stringify({ ...parsed, ...notesObj });
      } catch {
        // Keep notesObj if notes was plain text
      }
    }

    await prisma.authors.update({
      where: { id: existingAuthor.id },
      data: {
        name: data.name.trim() || existingAuthor.name,
        phone: data.phone?.trim() || existingAuthor.phone,
        address: data.place?.trim() || existingAuthor.address,
        notes: mergedNotes,
      },
    }).catch(() => null);
  } else {
    await prisma.authors.create({
      data: {
        id: randomUUID(),
        name: data.name.trim(),
        email: emailKey,
        phone: data.phone?.trim() || null,
        address: data.place?.trim() || null,
        notes: JSON.stringify(notesObj),
        created_at: now,
      },
    }).catch(() => null);
  }

  // If a submission reference was provided, verify and bind
  if (data.ref) {
    await prisma.submissions.updateMany({
      where: { ref_no: data.ref },
      data: { email: emailKey },
    }).catch(() => null);
  }

  // Automatically sign in the new author with a fresh session cookie
  await createSession(user.id);

  await audit({
    userId: user.id,
    action: "author_signup_and_onboarding",
    entity: "user",
    entityId: user.id,
    detail: { email: user.email, name: user.name, role: user.role, ref: data.ref },
  });

  return ok({
    success: true,
    redirect: "/author",
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
});
