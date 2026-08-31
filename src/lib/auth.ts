import "server-only";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSessionUser, type SessionUser } from "@/lib/session";
import { addMinutes, stamp } from "@/lib/time";
import { can, type Capability } from "@/lib/roles";

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;
const ATTEMPT_WINDOW_MINUTES = 15;

/** For server components and layouts: redirect to /login when signed out. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** For server components: 403-style redirect when the role lacks a capability. */
export async function requireCapability(cap: Capability): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, cap)) redirect("/dashboard?denied=" + encodeURIComponent(cap));
  return user;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** For route handlers: throws instead of redirecting. */
export async function requireApiUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, "Not signed in");
  return user;
}

export async function requireApiCapability(cap: Capability): Promise<SessionUser> {
  const user = await requireApiUser();
  if (!can(user.role, cap)) throw new HttpError(403, "Insufficient permissions");
  return user;
}

export type LoginResult =
  | { ok: true; user: { id: string; email: string; name: string; role: string } }
  | { ok: false; reason: "invalid" | "locked" | "inactive"; retryAfterMinutes?: number };

/**
 * Verifies credentials against the users table and maintains the
 * login_attempts lockout counter. Returns a deliberately vague "invalid" for
 * both unknown emails and wrong passwords so the endpoint cannot be used to
 * enumerate accounts.
 */
export async function verifyCredentials(emailRaw: string, password: string): Promise<LoginResult> {
  const email = emailRaw.trim().toLowerCase();
  const now = new Date();

  const attempt = await prisma.login_attempts.findUnique({ where: { email } });
  if (attempt?.locked_until && attempt.locked_until > stamp(now)) {
    const until = new Date(`${attempt.locked_until.replace(" ", "T")}Z`);
    return {
      ok: false,
      reason: "locked",
      retryAfterMinutes: Math.max(1, Math.ceil((until.getTime() - now.getTime()) / 60_000)),
    };
  }

  const user = await prisma.users.findUnique({ where: { email } });

  // Constant-ish work whether or not the user exists.
  const hash = user?.password_hash ?? "$2b$12$0000000000000000000000000000000000000000000000000000";
  const passwordOk = await bcrypt.compare(password, hash).catch(() => false);

  if (!user || !passwordOk) {
    await recordFailure(email, attempt, now);
    return { ok: false, reason: "invalid" };
  }

  if (!user.active) return { ok: false, reason: "inactive" };

  if (attempt) await prisma.login_attempts.delete({ where: { email } }).catch(() => {});

  return { ok: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
}

async function recordFailure(
  email: string,
  attempt: { failed_count: number; first_failed_at: string } | null,
  now: Date,
): Promise<void> {
  const windowStart = stamp(addMinutes(-ATTEMPT_WINDOW_MINUTES, now));
  const withinWindow = attempt != null && attempt.first_failed_at > windowStart;
  const failedCount = withinWindow ? attempt.failed_count + 1 : 1;
  const lockedUntil = failedCount >= MAX_FAILED ? stamp(addMinutes(LOCK_MINUTES, now)) : null;

  await prisma.login_attempts
    .upsert({
      where: { email },
      create: {
        email,
        failed_count: failedCount,
        first_failed_at: stamp(now),
        last_failed_at: stamp(now),
        locked_until: lockedUntil,
      },
      update: {
        failed_count: failedCount,
        ...(withinWindow ? {} : { first_failed_at: stamp(now) }),
        last_failed_at: stamp(now),
        locked_until: lockedUntil,
      },
    })
    .catch((err) => console.error("[auth] failed to record login attempt", err));
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}
