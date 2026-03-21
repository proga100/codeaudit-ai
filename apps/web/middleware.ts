import { auth } from "@/auth";
import { NextResponse } from "next/server";

/**
 * Auth.js v5 middleware.
 * Protects routes under /dashboard and /onboarding and handles redirects.
 *
 * The `auth()` wrapper injects `request.auth` (the session object) so we
 * can check authentication status without hitting the database on every request.
 */
export default auth(function middleware(request) {
  const { nextUrl } = request;
  const isLoggedIn = !!request.auth;

  const isDashboardRoute =
    nextUrl.pathname.startsWith("/dashboard") ||
    nextUrl.pathname.startsWith("/onboarding");

  const isSignInPage = nextUrl.pathname.startsWith("/sign-in");
  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");

  // Redirect authenticated users away from sign-in page
  if (isLoggedIn && isSignInPage) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Let Auth.js handle its own API routes
  if (isApiAuthRoute) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users away from protected routes
  if (!isLoggedIn && isDashboardRoute) {
    const callbackUrl = encodeURIComponent(nextUrl.pathname);
    return NextResponse.redirect(
      new URL(`/sign-in?callbackUrl=${callbackUrl}`, nextUrl),
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Public files (images, fonts, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
