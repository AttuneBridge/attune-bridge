import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getModuleSubscriptionForBusiness } from "@/lib/module-subscriptions";
import { getOwnerWorkspaceContextOrRedirect } from "@/lib/owner-workspace-context";

export default async function DashboardReviewsPage() {
  const workspace = await getOwnerWorkspaceContextOrRedirect();
  const reviewsSubscription = await getModuleSubscriptionForBusiness(workspace.businessId, "REVIEWS");

  if (!reviewsSubscription.isEnabled) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-10 md:py-14">
        <Card className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Reviews Module</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Reviews is not active yet</h1>
          <p className="text-sm text-slate-700">
            Activate Reviews from Dashboard Home in Module subscriptions to re-open this workspace.
          </p>
          <Link href="/dashboard" className="text-sm font-medium text-slate-900 underline">
            Open Dashboard Home
          </Link>
        </Card>
      </main>
    );
  }

  redirect("/dashboard/reviews/feedback");
}
