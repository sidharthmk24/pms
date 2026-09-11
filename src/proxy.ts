import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "kairali_session";

/**
 * Routes served to the public, signed in or not — the "Publish With Us" flow
 * (Flow 7). Everything else in the app is staff-only.
 */
const PUBLIC_PREFIXES = ["/publish", "/author/register", "/author/setup"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Cheap edge gate: it only checks whether a session cookie is present, so it
 * can run without database access. Real validation (expiry, revocation, the
 * user still being active) happens in requireUser() on the server.
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const hasCookie = Boolean(req.cookies.get(COOKIE_NAME)?.value);
  const isLogin = pathname === "/login";

  if (!hasCookie && !isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (hasCookie && isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
