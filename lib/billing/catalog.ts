import { AppModule } from "@prisma/client";

export const BILLABLE_MODULES = [
  AppModule.REVIEWS,
  AppModule.SCHEDULER,
  AppModule.LOYALTY,
  AppModule.MISSED_CALL_TEXTBACK,
] as const satisfies readonly AppModule[];

type BillableModule = (typeof BILLABLE_MODULES)[number];

const MODULE_PRICE_ENV: Record<BillableModule, string> = {
  [AppModule.REVIEWS]: "STRIPE_PRICE_MODULE_REVIEWS",
  [AppModule.SCHEDULER]: "STRIPE_PRICE_MODULE_SCHEDULER",
  [AppModule.LOYALTY]: "STRIPE_PRICE_MODULE_LOYALTY",
  [AppModule.MISSED_CALL_TEXTBACK]: "STRIPE_PRICE_MODULE_MISSED_CALL_TEXTBACK",
};

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required billing env var: ${name}`);
  }

  return value;
}

export function getStripePriceIdForModule(appModule: BillableModule) {
  return getRequiredEnv(MODULE_PRICE_ENV[appModule]);
}

export function isBillableModule(moduleValue: AppModule): moduleValue is BillableModule {
  return BILLABLE_MODULES.includes(moduleValue as BillableModule);
}

export function getModulePriceMap() {
  return new Map<BillableModule, string>(
    BILLABLE_MODULES.map((appModule) => [appModule, getStripePriceIdForModule(appModule)]),
  );
}

export function getModuleForStripePriceId(priceId: string) {
  const target = priceId.trim();

  for (const appModule of BILLABLE_MODULES) {
    if (getStripePriceIdForModule(appModule) === target) {
      return appModule;
    }
  }

  return null;
}
