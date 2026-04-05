import Link from "next/link";
import { BusinessMembershipRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { OwnerDashboardSignInButton } from "@/components/auth/owner-dashboard-sign-in-button";
import { OwnerAccessForm } from "@/components/forms/owner-access-form";
import { Card } from "@/components/ui/card";
import { allowsClerkAuth, allowsLegacyOwnerSession } from "@/lib/auth/mode";
import { getRequestIdentity } from "@/lib/identity/request-identity";
import { getOwnerSession } from "@/lib/owner-session";
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
  const ownerSession = await getOwnerSession();
  const query = await searchParams;
  const returnTo = sanitizeReturnTo(typeof query.returnTo === "string" ? query.returnTo : undefined);

  if (ownerSession) {
    redirect(returnTo);
  }

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

  if (identity && ownerMembership) {
    redirect(returnTo);
  }

  const canUseClerkSignIn = allowsClerkAuth() && hasClerkConfig();
  const canUseLegacyAccess = allowsLegacyOwnerSession();
  const isSignedInWithoutOwnerAccess = Boolean(identity && !ownerMembership);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 md:py-14">
      <section className="grid gap-6 md:grid-cols-[1.05fr_0.95fr] md:items-start">
        <Card className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Dashboard Access</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Open your owner dashboard</h1>
          {canUseClerkSignIn ? (
            <>
              <p className="text-sm text-slate-700">Sign in with your owner email to access your business dashboard.</p>
              <OwnerDashboardSignInButton returnTo={returnTo} />
            </>
          ) : null}
          {isSignedInWithoutOwnerAccess ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              Signed in but no owner workspace is linked yet. Run the owner backfill or contact support.
            </div>
          ) : null}
          {!canUseClerkSignIn && canUseLegacyAccess ? (
            <p className="text-sm text-slate-700">
              Enter the owner email and location slug to open your secure dashboard.
            </p>
          ) : null}
          {!canUseClerkSignIn && canUseLegacyAccess ? <OwnerAccessForm /> : null}
        </Card>

        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">
            {canUseLegacyAccess ? "Need help finding your slug?" : "Need an account?"}
          </h2>
          {canUseLegacyAccess ? (
            <>
              <p className="text-sm text-slate-700">
                Your location slug is the part after <code>/feedback/</code> in your customer feedback link.
              </p>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                Example: <code>/feedback/demo-coffee-downtown</code> means slug is <code>demo-coffee-downtown</code>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-700">
              Start a new trial business account, then sign in with that owner email to access your dashboard.
            </p>
          )}
          <Link href="/signup" className="text-sm font-medium text-slate-900 underline">
            New business? Start free trial
          </Link>
        </Card>
      </section>
    </main>
  );
}
