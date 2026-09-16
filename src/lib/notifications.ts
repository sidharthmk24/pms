import "server-only";
import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { stamp } from "@/lib/time";
import { parseUserRoles, type Role } from "@/lib/roles";

export type NotificationType =
  | "SUBMISSION"
  | "TASK"
  | "CONTRACT"
  | "PRODUCTION"
  | "PROOF"
  | "PRINT"
  | "STOCK"
  | "TEAM"
  | "INFO";

export interface CreateNotificationInput {
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
}

// Global EventEmitter for Server-Sent Events (SSE)
declare global {
  var __notificationsEmitter: EventEmitter | undefined;
}

export const notificationsEmitter =
  globalThis.__notificationsEmitter || new EventEmitter();

if (process.env.NODE_ENV !== "production") {
  globalThis.__notificationsEmitter = notificationsEmitter;
}

notificationsEmitter.setMaxListeners(300);

/**
 * Creates an in-app notification for a single user and emits SSE events.
 */
export async function createNotification(
  userId: string,
  input: CreateNotificationInput
) {
  try {
    const id = randomUUID();
    const now = stamp();
    const notif = await prisma.notifications.create({
      data: {
        id,
        user_id: userId,
        title: input.title,
        message: input.message,
        type: input.type || "INFO",
        link: input.link || null,
        is_read: false,
        created_at: now,
      },
    });

    // Real-time SSE dispatch to the specific user and broadcast refresh
    notificationsEmitter.emit(`notification:${userId}`, notif);
    notificationsEmitter.emit(`refresh:${userId}`, { type: "refresh" });
    notificationsEmitter.emit("refresh", { type: "refresh" });

    return notif;
  } catch (error) {
    console.error(`[Notifications] Failed to create notification for user ${userId}:`, error);
    return null;
  }
}

/**
 * Triggers a global refresh event across all connected clients to re-fetch live data without page reload.
 */
export function triggerLiveRefresh() {
  notificationsEmitter.emit("refresh", { type: "refresh" });
}

/**
 * Dispatches notifications to all active staff users matching given roles or owner.
 */
export async function notifyRoles(
  roles: Role[],
  input: CreateNotificationInput,
  excludeUserId?: string
) {
  try {
    const activeStaff = await prisma.users.findMany({
      where: {
        active: true,
        role: { not: "author" },
      },
      select: {
        id: true,
        role: true,
      },
    });

    const targetUsers = activeStaff.filter((u) => {
      if (excludeUserId && u.id === excludeUserId) return false;
      const userRoles = parseUserRoles(u.role);
      if (userRoles.includes("owner")) return true;
      return roles.some((r) => userRoles.includes(r));
    });

    await Promise.allSettled(
      targetUsers.map((u) => createNotification(u.id, input))
    );
  } catch (error) {
    console.error("[Notifications] Failed to notify roles:", error);
  }
}

/**
 * Dispatches notifications to a list of specific user IDs.
 */
export async function notifyUsers(
  userIds: (string | null | undefined)[],
  input: CreateNotificationInput,
  excludeUserId?: string
) {
  try {
    const cleanIds = Array.from(
      new Set(userIds.filter((id): id is string => Boolean(id && id.trim())))
    );

    const validIds = cleanIds.filter((id) => id !== excludeUserId);
    if (validIds.length === 0) return;

    const users = await prisma.users.findMany({
      where: {
        id: { in: validIds },
        active: true,
      },
      select: { id: true },
    });

    await Promise.allSettled(
      users.map((u) => createNotification(u.id, input))
    );
  } catch (error) {
    console.error("[Notifications] Failed to notify users:", error);
  }
}

/**
 * Dispatches a notification to an author by email if a registered user account exists.
 */
export async function notifyAuthorByEmail(
  email: string | null | undefined,
  input: CreateNotificationInput
) {
  if (!email || !email.trim()) return null;
  try {
    const authorUser = await prisma.users.findFirst({
      where: {
        email: { equals: email.trim(), mode: "insensitive" },
        active: true,
      },
      select: { id: true },
    });

    if (authorUser) {
      return await createNotification(authorUser.id, input);
    }
    return null;
  } catch (error) {
    console.error(`[Notifications] Failed to notify author email ${email}:`, error);
    return null;
  }
}

/**
 * Resolves the author associated with a title ID and notifies them.
 */
export async function notifyAuthorOfTitle(
  titleId: string,
  input: CreateNotificationInput
) {
  try {
    const title = await prisma.titles.findUnique({
      where: { id: titleId },
      include: {
        authors: true,
        contracts: {
          include: {
            authors: true,
          },
        },
      },
    });

    const email =
      title?.authors?.email ||
      title?.contracts?.authors?.email;

    if (email) {
      await notifyAuthorByEmail(email, input);
    }
  } catch (error) {
    console.error(`[Notifications] Failed to notify author of title ${titleId}:`, error);
  }
}

/**
 * Resolves the author associated with a submission ID and notifies them.
 */
export async function notifyAuthorOfSubmission(
  submissionId: string,
  input: CreateNotificationInput
) {
  try {
    const sub = await prisma.submissions.findUnique({
      where: { id: submissionId },
      select: { email: true },
    });
    if (sub?.email) {
      await notifyAuthorByEmail(sub.email, input);
    }
  } catch (error) {
    console.error(`[Notifications] Failed to notify author of submission ${submissionId}:`, error);
  }
}

/**
 * Fetches recent notifications for a user.
 */
export async function getNotifications(userId: string, limit = 50) {
  return prisma.notifications.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
    take: limit,
  });
}

/**
 * Marks a single notification as read.
 */
export async function markAsRead(id: string, userId: string) {
  const result = await prisma.notifications.updateMany({
    where: { id, user_id: userId },
    data: { is_read: true },
  });

  notificationsEmitter.emit(`refresh:${userId}`, { type: "refresh" });
  return result;
}

/**
 * Marks all notifications as read for a user.
 */
export async function markAllAsRead(userId: string) {
  const result = await prisma.notifications.updateMany({
    where: { user_id: userId, is_read: false },
    data: { is_read: true },
  });

  notificationsEmitter.emit(`refresh:${userId}`, { type: "refresh" });
  return result;
}
