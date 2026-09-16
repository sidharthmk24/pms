"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RealTimeSync() {
  const router = useRouter();

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let retryTimer: NodeJS.Timeout | null = null;

    function connect() {
      try {
        eventSource = new EventSource("/api/notifications/sync");

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "refresh" || data.type === "notification") {
              // Seamlessly update Server Component views (e.g. Author Portal, Submissions, Production) without full page reload
              router.refresh();
              // Trigger global data mutation event so dropdown and client components re-fetch data
              window.dispatchEvent(new CustomEvent("app:notification-received", { detail: data }));
              window.dispatchEvent(new Event("app:data-mutated"));
            }
          } catch {
            // Heartbeats and non-JSON comments ignored
          }
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Retry after 5 seconds if connection drops
          retryTimer = setTimeout(connect, 5000);
        };
      } catch (err) {
        console.warn("[RealTimeSync] SSE connect error:", err);
      }
    }

    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  }, []);

  return null;
}
