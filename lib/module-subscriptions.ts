import { AppModule, ModuleSubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type GetEnabledModulesOptions = {
  includeFeedbackByDefault?: boolean;
  now?: Date;
};

export const APP_MODULE_ORDER: AppModule[] = [
  AppModule.FEEDBACK,
  AppModule.REVIEWS,
  AppModule.SCHEDULER,
  AppModule.LOYALTY,
  AppModule.MISSED_CALL_TEXTBACK,
];

const ENABLED_STATUSES: ModuleSubscriptionStatus[] = [
  ModuleSubscriptionStatus.ACTIVE,
  ModuleSubscriptionStatus.TRIAL,
];

export async function getEnabledModulesForBusiness(
  businessId: string,
  options: GetEnabledModulesOptions = {},
): Promise<AppModule[]> {
  const now = options.now ?? new Date();

  const subscriptions = await prisma.businessModuleSubscription.findMany({
    where: {
      businessId,
      status: { in: ENABLED_STATUSES },
      AND: [
        { OR: [{ startedAt: null }, { startedAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    select: {
      module: true,
    },
  });

  const modules = new Set(subscriptions.map((subscription) => subscription.module));

  if (options.includeFeedbackByDefault ?? true) {
    modules.add(AppModule.FEEDBACK);
  }

  return APP_MODULE_ORDER.filter((module) => modules.has(module));
}

export async function isModuleEnabledForBusiness(
  businessId: string,
  module: AppModule,
  options: GetEnabledModulesOptions = {},
) {
  const enabledModules = await getEnabledModulesForBusiness(businessId, options);
  return enabledModules.includes(module);
}

export async function getModuleSubscriptionForBusiness(
  businessId: string,
  module: AppModule,
  options: Pick<GetEnabledModulesOptions, "now"> = {},
) {
  const now = options.now ?? new Date();
  const subscription = await prisma.businessModuleSubscription.findUnique({
    where: {
      businessId_module: {
        businessId,
        module,
      },
    },
    select: {
      module: true,
      status: true,
      startedAt: true,
      endsAt: true,
    },
  });

  const isTimeEligible =
    (!subscription?.startedAt || subscription.startedAt <= now) &&
    (!subscription?.endsAt || subscription.endsAt >= now);
  const isStatusEnabled =
    subscription?.status === ModuleSubscriptionStatus.ACTIVE ||
    subscription?.status === ModuleSubscriptionStatus.TRIAL;

  return {
    module,
    status: subscription?.status ?? ModuleSubscriptionStatus.INACTIVE,
    startedAt: subscription?.startedAt ?? null,
    endsAt: subscription?.endsAt ?? null,
    isEnabled: isStatusEnabled && isTimeEligible,
  };
}
