import { AppModule } from "@prisma/client";
import { NextResponse } from "next/server";
import { getBusinessApiAccessResult } from "@/lib/auth/business-api-access";
import {
  activateModuleOnSubscription,
  scheduleModuleDeactivation,
} from "@/lib/billing/subscriptions";
import { prisma } from "@/lib/prisma";
import { trackValidationEvent, validationEvent } from "@/lib/validation-events";

const OWNER_MANAGED_MODULES: AppModule[] = [
  AppModule.REVIEWS,
  AppModule.SCHEDULER,
  AppModule.LOYALTY,
  AppModule.MISSED_CALL_TEXTBACK,
];

export async function POST(
  request: Request,
  context: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | { module?: unknown; action?: unknown; manageToken?: unknown }
    | null;

  const moduleValue = body && typeof body.module === "string" ? body.module.trim().toUpperCase() : "";
  const action = body && typeof body.action === "string" ? body.action.trim().toLowerCase() : "";
  const manageToken = body && typeof body.manageToken === "string" ? body.manageToken.trim() : "";

  if (action !== "activate" && action !== "deactivate") {
    return NextResponse.json({ error: "action must be activate or deactivate." }, { status: 400 });
  }

  if (!OWNER_MANAGED_MODULES.includes(moduleValue as AppModule)) {
    return NextResponse.json({ error: "Invalid module." }, { status: 400 });
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      id: true,
    },
  });

  if (!business) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const access = await getBusinessApiAccessResult(business.id, manageToken);

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const moduleKey = moduleValue as AppModule;

  if (action === "activate") {
    try {
      await activateModuleOnSubscription({
        businessId: business.id,
        module: moduleKey,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not activate module.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  let effectiveAt: Date | null = null;

  if (action === "deactivate") {
    try {
      const result = await scheduleModuleDeactivation({
        businessId: business.id,
        module: moduleKey,
      });
      effectiveAt = result.effectiveAt;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not schedule module deactivation.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const projection = await prisma.businessModuleSubscription.findUnique({
    where: {
      businessId_module: {
        businessId: business.id,
        module: moduleKey,
      },
    },
    select: {
      module: true,
      status: true,
      startedAt: true,
      endsAt: true,
    },
  });

  await trackValidationEvent({
    event: validationEvent.moduleSubscriptionUpdated,
    businessId: business.id,
    metadata: {
      module: moduleKey,
      action,
      status: projection?.status ?? null,
      effectiveAt,
    },
  });

  return NextResponse.json({
    ok: true,
    module: projection?.module ?? moduleKey,
    status: projection?.status ?? null,
    startedAt: projection?.startedAt ?? null,
    endsAt: projection?.endsAt ?? null,
    effectiveAt,
  });
}
