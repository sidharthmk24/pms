import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "kairali_session";

/**
 * Routes served to the public, signed in or not:
 * - "/publish", "/author/register", "/author/setup"
 * - "/login" and all subroutes (including "/login/reset-password", "/login/forgot-password")
 */
const PUBLIC_PREFIXES = [
  "/publish",
  "/author/register",
  "/author/setup",
  "/login",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Cheap edge gate: it checks whether a session cookie is present for protected routes.
 * Real validation (expiry, revocation, user active status) happens in requireUser() on the server.
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // 1. Allow public routes without authentication
  if (isPublic(pathname)) {
    const hasCookie = Boolean(req.cookies.get(COOKIE_NAME)?.value);
    // If logged in and visiting the bare "/login" page (not reset-password or forgot-password), redirect to /dashboard
    if (hasCookie && pathname === "/login") {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const hasCookie = Boolean(req.cookies.get(COOKIE_NAME)?.value);

  // 2. Protected routes accessed without a session cookie -> redirect to /login
  if (!hasCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
