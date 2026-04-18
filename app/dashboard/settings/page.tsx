import {
  AppModule,
  ModuleSubscriptionStatus,
  StripeSubscriptionStatus,
} from "@prisma/client";
import { ModuleSubscriptionForm } from "@/components/forms/module-subscription-form";
import { RenewSubscriptionForm } from "@/components/forms/renew-subscription-form";
import { Card } from "@/components/ui/card";
import { getOwnerWorkspaceContextOrRedirect } from "@/lib/owner-workspace-context";
import { prisma } from "@/lib/prisma";

async function withFallback<T>(label: string, action: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await action();
  } catch (error) {
    console.error(`[dashboard-settings] ${label} failed`, error);
    return fallback;
  }
}

const OWNER_MANAGED_MODULES: Array<Exclude<AppModule, "FEEDBACK">> = [
  AppModule.REVIEWS,
  AppModule.SCHEDULER,
  AppModule.LOYALTY,
  AppModule.MISSED_CALL_TEXTBACK,
];

function getStatusLabel(status: StripeSubscriptionStatus | null) {
  if (!status) {
    return "No billing profile";
  }

  switch (status) {
    case StripeSubscriptionStatus.ACTIVE:
      return "Active";
    case StripeSubscriptionStatus.TRIALING:
      return "Trialing";
    case StripeSubscriptionStatus.PAST_DUE:
      return "Past due";
    case StripeSubscriptionStatus.CANCELED:
      return "Canceled";
    case StripeSubscriptionStatus.UNPAID:
      return "Unpaid";
    case StripeSubscriptionStatus.PAUSED:
      return "Paused";
    case StripeSubscriptionStatus.INCOMPLETE:
      return "Incomplete";
    case StripeSubscriptionStatus.INCOMPLETE_EXPIRED:
      return "Incomplete expired";
    default:
      return "Unknown";
  }
}

export default async function DashboardSettingsPage() {
  const workspace = await getOwnerWorkspaceContextOrRedirect();

  type SettingsTuple = [
    {
      id: string;
      stripeStatus: StripeSubscriptionStatus | null;
      stripeTrialEnd: Date | null;
      stripeCurrentPeriodEnd: Date | null;
      stripeCancelAtPeriodEnd: boolean;
    } | null,
    Array<{
      module: AppModule;
      status: ModuleSubscriptionStatus;
      startedAt: Date | null;
      endsAt: Date | null;
    }>,
  ];

  const [business, moduleSubscriptions] = await withFallback<SettingsTuple>(
    "settings-queries",
    () =>
      Promise.all([
        prisma.business.findUnique({
          where: {
            id: workspace.businessId,
          },
          select: {
            id: true,
            stripeStatus: true,
            stripeTrialEnd: true,
            stripeCurrentPeriodEnd: true,
            stripeCancelAtPeriodEnd: true,
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
      ]),
    [null, []],
  );

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
    business.stripeStatus === StripeSubscriptionStatus.ACTIVE ||
    business.stripeStatus === StripeSubscriptionStatus.TRIALING;

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
              Current subscription status: <span className="font-medium text-slate-900">{getStatusLabel(business.stripeStatus)}</span>
            </p>
            <p className="text-sm text-slate-700">Trial ends: {business.stripeTrialEnd ? business.stripeTrialEnd.toLocaleDateString() : "Not set"}</p>
            <p className="text-sm text-slate-700">Current period ends: {business.stripeCurrentPeriodEnd ? business.stripeCurrentPeriodEnd.toLocaleDateString() : "Not set"}</p>
            <p className="text-sm text-slate-700">Cancel at period end: {business.stripeCancelAtPeriodEnd ? "Yes" : "No"}</p>
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
