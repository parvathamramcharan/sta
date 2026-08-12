import { auth } from "@/auth";
import { NextResponse } from "next/server";

export const middleware = auth((req) => {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  const isLoggedIn = !!req.auth;
  const userRoles = req.auth?.user?.roles || [];
  const isAdmin = userRoles.includes("admin");

  const isPublicRoute = pathname === "/";
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isPcapRoute = pathname.startsWith("/pcaps");
  const isReportsRoute = pathname.startsWith("/reports");
  const isUploadRoute = pathname.startsWith("/upload");
  const isAboutRoute = pathname.startsWith("/about");
  const isFeedbackRoute = pathname.startsWith("/feedback"); // NEW
  const isFeedbackViewRoute = pathname.startsWith("/feedback/view"); // NEW

  const isProtectedRoute =
    isDashboardRoute || isPcapRoute || isReportsRoute ||
    isUploadRoute || isAboutRoute || isFeedbackRoute;

  // Refresh token is dead — clear session cookie and send to login
  if (req.auth?.error === "RefreshTokenError") {
    const response = NextResponse.redirect(new URL("/", req.url));
    response.cookies.delete("authjs.session-token");
    return response;
  }

  // Login page, no session → stay here
  if (isPublicRoute && !isLoggedIn) return NextResponse.next();

  // Already logged in and visiting login page
  if (isPublicRoute && isLoggedIn) {
    return NextResponse.redirect(
      new URL(isAdmin ? "/dashboard" : "/reports?set=1", nextUrl)
    );
  }

  // Not logged in → protected page
  if (!isLoggedIn && isProtectedRoute) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  // Non-admin users cannot access dashboard/pcaps
  if (isLoggedIn && !isAdmin && (isDashboardRoute || isPcapRoute)) {
    return NextResponse.redirect(new URL("/reports?set=1", nextUrl));
  }

  // NEW: only admins can access /feedback/view (normal users keep /feedback/submit)
  if (isLoggedIn && !isAdmin && isFeedbackViewRoute) {
    return NextResponse.redirect(new URL("/reports?set=1", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/pcaps/:path*",
    "/reports/:path*",
    "/upload/:path*",
    "/about/:path*",
    "/feedback/:path*", // NEW
  ],
};