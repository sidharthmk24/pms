import { ok, fail, handler } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import { markAsRead } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export const PATCH = handler(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await getSessionUser();
    if (!user) {
      return fail(401, "Authentication required");
    }

    const { id } = await params;
    await markAsRead(id, user.id);
    return ok({ success: true });
  }
);
