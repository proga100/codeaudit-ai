import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Auth.js v5 middleware (proxy mode for Next.js 16).
 * Protects routes under /(dashboard) and handles redirects.
 *
 * In Next.js 16, Auth.js uses the middleware as a proxy to handle
 * session refresh without exposing session data to edge runtime.
 */
export default auth(function middleware(req: NextRequest & { auth: unknown }) {
  const { nextUrl } = req;
  const isLoggedIn = !!(req as { auth: unknown }).auth;

  const isDashboardRoute = nextUrl.pathname.startsWith("/dashboard") ||
    nextUrl.pathname.startsWith("/onboarding");

  const isAuthRoute = nextUrl.pathname.startsWith("/sign-in") ||
    nextUrl.pathname.startsWith("/api/auth");

  // Redirect authenticated users away from sign-in page
  if (isLoggedIn && isAuthRoute && !nextUrl.pathname.startsWith("/api/auth")) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Redirect unauthenticated users away from protected routes
  if (!isLoggedIn && isDashboardRoute) {
    const callbackUrl = encodeURIComponent(nextUrl.pathname);
    return NextResponse.redirect(new URL(`/sign-in?callbackUrl=${callbackUrl}`, nextUrl));
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
