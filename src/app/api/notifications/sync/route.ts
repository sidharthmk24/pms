import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/session";
import { notificationsEmitter } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = user.id;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection event
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected", userId })}\n\n`)
      );

      const onRefresh = (data: any) => {
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "refresh", ...data })}\n\n`
            )
          );
        } catch {
          cleanup();
        }
      };

      const onNotification = (data: any) => {
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "notification", data })}\n\n`
            )
          );
        } catch {
          cleanup();
        }
      };

      // Subscribe to personal & broadcast events
      notificationsEmitter.on(`refresh:${userId}`, onRefresh);
      notificationsEmitter.on(`notification:${userId}`, onNotification);
      notificationsEmitter.on("refresh", onRefresh);

      // 30s Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          cleanup();
        }
      }, 30000);

      const cleanup = () => {
        clearInterval(heartbeat);
        notificationsEmitter.off(`refresh:${userId}`, onRefresh);
        notificationsEmitter.off(`notification:${userId}`, onNotification);
        notificationsEmitter.off("refresh", onRefresh);
        try {
          controller.close();
        } catch {}
      };

      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
