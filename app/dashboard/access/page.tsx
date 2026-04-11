import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { BusinessMembershipRole } from "@prisma/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { OwnerDashboardSignInButton } from "@/components/auth/owner-dashboard-sign-in-button";
import { Card } from "@/components/ui/card";
import { isDemoModeAllowedForHost } from "@/lib/demo/config";
import { getRequestIdentity } from "@/lib/identity/request-identity";
import { prisma } from "@/lib/prisma";

type DashboardAccessPageProps = {
  searchParams: Promise<{ returnTo?: string }>;
};

function sanitizeReturnTo(pathname: string | undefined) {
  if (!pathname) {
    return "/dashboard";
  }

  if (!pathname.startsWith("/") || pathname.startsWith("//") || pathname.includes("://")) {
    return "/dashboard";
  }

  return pathname;
}

function hasClerkConfig() {
  return (
    typeof process.env.CLERK_SECRET_KEY === "string" &&
    process.env.CLERK_SECRET_KEY.length > 0 &&
    typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "string" &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.length > 0
  );
}

export default async function DashboardAccessPage({ searchParams }: DashboardAccessPageProps) {
  const query = await searchParams;
  const returnTo = sanitizeReturnTo(typeof query.returnTo === "string" ? query.returnTo : undefined);
  const requestHeaders = await headers();
  const isDemoMode = isDemoModeAllowedForHost(requestHeaders.get("host"));

  const identity = await getRequestIdentity();
  const ownerMembership = identity
    ? await prisma.businessMembership.findFirst({
        where: {
          userId: identity.userId,
          role: BusinessMembershipRole.OWNER,
        },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      })
    : null;

  const systemAdminWorkspace =
    identity && (identity.systemRole === "SUPER_ADMIN" || identity.systemRole === "ADMIN")
      ? await prisma.business.findFirst({
          select: { id: true },
          orderBy: { createdAt: "asc" },
        })
      : null;

  if (identity && (ownerMembership || systemAdminWorkspace)) {
    redirect(returnTo);
  }

  const canUseClerkSignIn = hasClerkConfig();
  const authState = canUseClerkSignIn ? await auth() : null;
  const hasClerkSession = Boolean(authState?.userId);
  const isSignedInWithoutOwnerAccess = Boolean(identity && !ownerMembership);
  const isSignedInButNotLinked = Boolean(hasClerkSession && !identity);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
      <section className="grid gap-6 md:grid-cols-[1.05fr_0.95fr] md:items-start">
        <Card className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Dashboard Access</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Open your owner dashboard</h1>
          {canUseClerkSignIn ? (
            <>
              <p className="text-sm text-slate-700">Sign in with your owner email to access your business dashboard.</p>
              <OwnerDashboardSignInButton returnTo={returnTo} />
            </>
          ) : (
            <p className="text-sm text-slate-700">Owner sign-in is unavailable until Clerk environment keys are configured.</p>
          )}
          {isSignedInWithoutOwnerAccess ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              Signed in but no owner workspace is linked yet. Run the owner backfill or contact support.
            </div>
          ) : null}
          {isSignedInButNotLinked ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              Signed in with Clerk, but this user is not linked in the app database yet. Link the Clerk user ID to a user record,
              then reload this page.
            </div>
          ) : null}
          {isDemoMode ? (
            <form action="/api/demo/session" method="post" className="pt-1">
              <input type="hidden" name="returnTo" value={returnTo} />
              <button
                type="submit"
                className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-100"
              >
                Continue as Demo Owner
              </button>
            </form>
          ) : null}
        </Card>

        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Need an account?</h2>
          <p className="text-sm text-slate-700">
            Start a new trial business account, then sign in with that owner email to access your dashboard.
          </p>
          <Link href="/signup" className="text-sm font-medium text-slate-900 underline">
            New business? Start free trial
          </Link>
        </Card>
      </section>
    </main>
  );
}
