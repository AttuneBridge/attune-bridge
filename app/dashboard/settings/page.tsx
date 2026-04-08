import {
  AppModule,
  ModuleSubscriptionStatus,
  SubscriptionStatus,
} from "@prisma/client";
import { ModuleSubscriptionForm } from "@/components/forms/module-subscription-form";
import { RenewSubscriptionForm } from "@/components/forms/renew-subscription-form";
import { Card } from "@/components/ui/card";
import { getOwnerWorkspaceContextOrRedirect } from "@/lib/owner-workspace-context";
import { prisma } from "@/lib/prisma";

const OWNER_MANAGED_MODULES: Array<Exclude<AppModule, "FEEDBACK">> = [
  AppModule.REVIEWS,
  AppModule.SCHEDULER,
  AppModule.LOYALTY,
  AppModule.MISSED_CALL_TEXTBACK,
];

function getStatusLabel(status: SubscriptionStatus) {
  switch (status) {
    case SubscriptionStatus.ACTIVE_PAID:
      return "Active Paid";
    case SubscriptionStatus.TRIAL_ACTIVE:
      return "Trial Active";
    case SubscriptionStatus.INACTIVE_EXPIRED:
      return "Inactive (Expired)";
    case SubscriptionStatus.INACTIVE_CANCELED:
      return "Canceled";
    default:
      return "Unknown";
  }
}

export default async function DashboardSettingsPage() {
  const workspace = await getOwnerWorkspaceContextOrRedirect();

  const [business, moduleSubscriptions] = await Promise.all([
    prisma.business.findUnique({
      where: {
        id: workspace.businessId,
      },
      select: {
        id: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        paidThrough: true,
        autoRenewEnabled: true,
      },
    }),
    prisma.businessModuleSubscription.findMany({
      where: {
        businessId: workspace.businessId,
      },
      select: {
        module: true,
        status: true,
        startedAt: true,
        endsAt: true,
      },
    }),
  ]);

  if (!business) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
        <Card>
          <p className="text-sm text-slate-700">Business settings unavailable.</p>
        </Card>
      </main>
    );
  }

  const moduleSubscriptionMap = new Map(moduleSubscriptions.map((entry) => [entry.module, entry]));
  const moduleSubscriptionsForForm = OWNER_MANAGED_MODULES.map((module) => {
    const current = moduleSubscriptionMap.get(module);

    return {
      module,
      status: current?.status ?? ModuleSubscriptionStatus.INACTIVE,
      startedAt: current?.startedAt ?? null,
      endsAt: current?.endsAt ?? null,
    };
  });

  const isMonthlySubscriptionActive =
    business.subscriptionStatus === SubscriptionStatus.ACTIVE_PAID && business.autoRenewEnabled;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
      <div className="space-y-5">
        <Card className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Settings</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Subscription and module controls</h1>
          <p className="text-sm text-slate-700">Manage billing state and module access from one focused settings route.</p>
        </Card>

        <section className="grid gap-6 md:grid-cols-[1.05fr_0.95fr] md:items-stretch">
          <Card className="flex h-full flex-col space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Renewal details</h2>
            <p className="text-sm text-slate-700">
              Current subscription status: <span className="font-medium text-slate-900">{getStatusLabel(business.subscriptionStatus)}</span>
            </p>
            <p className="text-sm text-slate-700">Trial ends: {business.trialEndsAt ? business.trialEndsAt.toLocaleDateString() : "Not set"}</p>
            <p className="text-sm text-slate-700">Paid through: {business.paidThrough ? business.paidThrough.toLocaleDateString() : "Not set"}</p>
            <RenewSubscriptionForm
              businessId={workspace.businessId}
              isMonthlySubscriptionActive={isMonthlySubscriptionActive}
            />
          </Card>

          <Card className="flex h-full flex-col space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Module subscriptions</h2>
            <p className="text-sm text-slate-700">
              Activate or deactivate modules to match your workflow and team maturity.
            </p>
            <ModuleSubscriptionForm
              businessId={workspace.businessId}
              moduleSubscriptions={moduleSubscriptionsForForm}
            />
          </Card>
        </section>
      </div>
    </main>
  );
}
