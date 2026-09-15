import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { addHours, addMinutes, stamp } from "@/lib/time";
import { parseUserRoles } from "@/lib/roles";

export const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "kairali_session";
const TTL_HOURS = Number(process.env.SESSION_TTL_HOURS || 12);

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

/**
 * The cookie carries an opaque random token; the database only ever stores its
 * SHA-256. A leaked database row therefore cannot be replayed as a session.
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = addHours(TTL_HOURS);

  await prisma.sessions.create({
    data: {
      id: randomUUID(),
      user_id: userId,
      token_hash: hashToken(token),
      expires_at: stamp(expiresAt),
      created_at: stamp(),
      last_seen_at: stamp(),
    },
  });

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const row = await prisma.sessions.findUnique({
    where: { token_hash: hashToken(token) },
    select: {
      id: true,
      expires_at: true,
      last_seen_at: true,
      users: { select: { id: true, email: true, name: true, role: true, active: true } },
    },
  });

  if (!row) return null;
  if (row.expires_at <= stamp()) return null;
  if (!row.users.active) return null;
  if (parseUserRoles(row.users.role).length === 0) return null;

  // Throttled so a normal page render does not cost a write.
  if (row.last_seen_at < stamp(addMinutes(-5))) {
    prisma.sessions
      .update({ where: { id: row.id }, data: { last_seen_at: stamp() } })
      .catch((err) => console.error("[session] last_seen_at update failed", err));
  }

  return {
    id: row.users.id,
    email: row.users.email,
    name: row.users.name,
    role: row.users.role,
  };
}

/** Removes the current session row and clears the cookie. */
export async function destroySession(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  let userId: string | null = null;

  if (token) {
    const row = await prisma.sessions.findUnique({
      where: { token_hash: hashToken(token) },
      select: { id: true, user_id: true },
    });
    if (row) {
      userId = row.user_id;
      await prisma.sessions.delete({ where: { id: row.id } });
    }
  }

  jar.delete(COOKIE_NAME);
  return userId;
}

/** Housekeeping: drop expired rows. Safe to call opportunistically. */
export async function pruneExpiredSessions(): Promise<number> {
  const { count } = await prisma.sessions.deleteMany({
    where: { expires_at: { lte: stamp() } },
  });
  return count;
}
