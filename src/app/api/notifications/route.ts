import { ok, fail, handler } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import { getNotifications, markAllAsRead } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const user = await getSessionUser();
  if (!user) {
    return fail(401, "Authentication required");
  }

  const notifications = await getNotifications(user.id, 50);
  return ok(notifications);
});

export const PATCH = handler(async () => {
  const user = await getSessionUser();
  if (!user) {
    return fail(401, "Authentication required");
  }

  await markAllAsRead(user.id);
  return ok({ success: true });
});
