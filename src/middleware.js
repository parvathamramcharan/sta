import { auth } from "@/auth";
import { NextResponse } from "next/server";

export const middleware = auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const userRoles = req.auth?.user?.roles || [];
  const isAdmin = userRoles.includes("admin");

  const isPublicRoute = nextUrl.pathname === "/";
  const isDashboardRoute = nextUrl.pathname.startsWith("/dashboard");
  const isPcapRoute = nextUrl.pathname.startsWith("/pcaps");
  const isReportsRoute = nextUrl.pathname.startsWith("/reports");

  if (req.auth?.error === 'RefreshTokenError') {
    return NextResponse.redirect(new URL('/', nextUrl));
  }

  if (!isLoggedIn && (isDashboardRoute || isPcapRoute || isReportsRoute)) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  if (isLoggedIn && isPublicRoute) {
    return NextResponse.redirect(new URL(isAdmin ? "/dashboard" : "/reports?set=1", nextUrl));
  }

  if (isLoggedIn && !isAdmin && (isDashboardRoute || isPcapRoute)) {
    return NextResponse.redirect(new URL("/reports?set=1", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};