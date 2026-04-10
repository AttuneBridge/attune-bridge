import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { allowsClerkAuth } from "@/lib/auth/mode";

const hasClerkConfig =
  typeof process.env.CLERK_SECRET_KEY === "string" &&
  process.env.CLERK_SECRET_KEY.length > 0 &&
  typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "string" &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.length > 0;

function rewriteLegacyDashboardAccess(request: NextRequest) {
  if (request.nextUrl.pathname !== "/dashboard/access") {
    return null;
  }

  const target = request.nextUrl.clone();
  target.pathname = "/access";
  return NextResponse.rewrite(target);
}

const passthrough = (request: NextRequest) => rewriteLegacyDashboardAccess(request) ?? NextResponse.next();

const withClerk = clerkMiddleware((auth, request) => {
  void auth;
  return rewriteLegacyDashboardAccess(request) ?? NextResponse.next();
});

export default allowsClerkAuth() && hasClerkConfig ? withClerk : passthrough;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets/).*)"],
};
