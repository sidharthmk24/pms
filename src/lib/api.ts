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
      if (err instanceof HttpError) return fail(err.status, err.message);
      if (err instanceof ZodError) {
        return fail(422, "Validation failed", {
          issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        });
      }
      console.error("[api] unhandled error", err);
      return fail(500, "Something went wrong");
    }
  };
}
