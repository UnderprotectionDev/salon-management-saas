import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Public routes that don't require authentication
const publicRoutes = ["/", "/sign-in", "/sign-up", "/api/auth"];

// Regex for public booking page: /[slug]/book
const PUBLIC_BOOKING_REGEX = /^\/[^/]+\/book$/;

// Regex for public appointment lookup: /[slug]/appointment/[code]
const PUBLIC_APPOINTMENT_REGEX = /^\/[^/]+\/appointment\/[^/]+$/;

// Check if the path starts with any public route
function isPublicRoute(path: string): boolean {
  if (PUBLIC_BOOKING_REGEX.test(path)) return true;
  if (PUBLIC_APPOINTMENT_REGEX.test(path)) return true;
  return publicRoutes.some(
    (route) =>
      path === route || (route !== "/" && path.startsWith(`${route}/`)),
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (isPublicRoute(pathname)) {
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
    signInUrl.searchParams.set("redirect", redirectPath);
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
