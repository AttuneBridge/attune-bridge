import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { DEMO_SESSION_COOKIE_NAME } from "@/lib/demo/session";

export async function POST(request: Request) {
  const { sessionId } = await auth();

  if (sessionId) {
    try {
      const client = await clerkClient();
      await client.sessions.revokeSession(sessionId);
    } catch {
      // Intentionally continue with cookie cleanup + redirect.
    }
  }

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set({
    name: DEMO_SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });

  return response;
}
