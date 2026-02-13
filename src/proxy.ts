import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Public routes that don't require authentication
// Matches: /, /sign-in, /api/auth/*, /api/polar/*, /[slug]/book, /[slug]/appointment/[code]
const PUBLIC_ROUTE_REGEX =
  /^\/($|sign-in(\/|$)|api\/auth(\/|$)|api\/polar(\/|$)|[^/]+\/book$|[^/]+\/appointment\/[^/]+$)/;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTE_REGEX.test(pathname)) {
    return NextResponse.next();
  }

  // Check for Better Auth session token
  // Better Auth stores the session in a cookie
  const sessionCookie = request.cookies.get("better-auth.session_token");

  // If no session, redirect to sign-in
  if (!sessionCookie?.value) {
    const signInUrl = new URL("/sign-in", request.url);
    // Preserve full path including query string
    const redirectPath = pathname + request.nextUrl.search;
    signInUrl.searchParams.set("callbackUrl", redirectPath);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
