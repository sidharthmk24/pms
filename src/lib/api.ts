import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "@/lib/auth";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(status: number, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error, ...extra }, { status });
}

/**
 * Wraps a route handler so thrown HttpError / ZodError become clean JSON
 * responses and anything unexpected becomes a 500 without leaking internals.
 */
export function handler<Args extends unknown[]>(
  fn: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await fn(...args);
    } catch (err) {
      if (
        err instanceof HttpError ||
        (typeof err === "object" &&
          err !== null &&
          "status" in err &&
          typeof (err as { status: unknown }).status === "number")
      ) {
        const httpErr = err as { status: number; message: string };
        return fail(httpErr.status, httpErr.message || "Request failed");
      }
      if (err instanceof ZodError) {
        return fail(422, "Validation failed", {
          issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        });
      }
      console.error("[api] unhandled error", err);
      try {
        const { appendFileSync } = await import("node:fs");
        appendFileSync("api-errors.log", `[${new Date().toISOString()}] ${String((err as any)?.stack || err)}\n\n`);
      } catch {}
      return fail(500, err instanceof Error ? err.message : "Something went wrong");
    }
  };
}
