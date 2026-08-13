import { auth } from "@/auth";
import { NextResponse } from "next/server";

// This creates the Next.js middleware and wraps it with Auth.js.
//becuase Auth.js checks the request and makes authentication information available as: req.auth
//So you can use:  req.auth?.user , req.auth?.user?.roles, req.auth?.error
export const middleware = auth((req) => {
  console.log("middleware started");
  // req is the incoming request. nextUrl contains information about the URL being requested.
  const { nextUrl } = req;
  //Gets only the path part of the URL.
  const pathname = nextUrl.pathname;

  //Checks whether Auth.js has a session.(logged or not)  and !! converts the value into a strict boolean (true/false).
  const isLoggedIn = !!req.auth;

  // extract roles . The ?. means: If this property doesn't exist, don't throw an error. 
  const userRoles = req.auth?.user?.roles || [];

  //check user roles contains admin or not
  const isAdmin = userRoles.includes("admin");

  const isPublicRoute = pathname === "/";
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isPcapRoute = pathname.startsWith("/pcaps");
  const isReportsRoute = pathname.startsWith("/reports");
  const isUploadRoute = pathname.startsWith("/upload");
  const isAboutRoute = pathname.startsWith("/about");
  const isFeedbackRoute = pathname.startsWith("/feedback"); 
  const isFeedbackViewRoute = pathname.startsWith("/feedback/view"); 

  //Identify whether the requested page requires authentication.
  const isProtectedRoute =
    isDashboardRoute || isPcapRoute || isReportsRoute ||
    isUploadRoute || isAboutRoute || isFeedbackRoute;


  // console.log( "MIDDLEWARE:",pathname,
  //               "loggedIn:",  isLoggedIn,
  //               "error:",  req.auth?.error
  // );

  //If Auth.js reports RefreshTokenError, redirect the user to /auth/force-logout.
  // The pathname check prevents redirecting to the same logout page repeatedly.
  if(
      req.auth?.error === "RefreshTokenError" &&
      pathname !== "/auth/force-logout"
    ) 
  {
    return NextResponse.redirect(
        new URL("/auth/force-logout", req.url)
    );
  }


  //unauthenticated user is accessing the public / login page, so NextResponse.next() allows them to continue.(no block)
  if (isPublicRoute && !isLoggedIn) return NextResponse.next();

  // Already logged in and visiting login page
  if (isPublicRoute && isLoggedIn) {
    return NextResponse.redirect(
      new URL(isAdmin ? "/dashboard" : "/reports?set=1", nextUrl)
    );
  }

  // Not logged in → try to access protected page -> send them to login page
  if (!isLoggedIn && isProtectedRoute) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }
  // Logged in + non-admin + Dashboard/PCAP → redirect to Reports
  if (isLoggedIn && !isAdmin && (isDashboardRoute || isPcapRoute)) {
    return NextResponse.redirect(new URL("/reports?set=1", nextUrl));
  }

  // NEW: only admins can access /feedback/view (normal users keep /feedback/submit)
  if (isLoggedIn && !isAdmin && isFeedbackViewRoute) {
    return NextResponse.redirect(new URL("/reports?set=1", nextUrl));
  }

  //None of the previous redirect/block conditions matched, so allow the request to continue normally.
  //NextResponse.next() does not mean "go to next page. Continue this current request to its destination."
  console.log("middleware ended");
  return NextResponse.next();

});

// Define which routes the middleware should run on.
//matcher = "Where should middleware run?"
export const config = {
  matcher: [
    "/",                   // login/home page
    "/dashboard/:path*",   // dashboard + anything under it
    "/pcaps/:path*",
    "/reports/:path*",
    "/upload/:path*",
    "/about/:path*",
    "/feedback/:path*", 
  ],
};


// path* => It means zero or more path segments. ex : /feedback, /feedback/submit, /feedback/view