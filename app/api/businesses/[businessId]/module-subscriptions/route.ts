import { AppModule, ModuleSubscriptionStatus } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isManageTokenValidForBusiness } from "@/lib/manage-token";
import { OWNER_SESSION_COOKIE_NAME, isOwnerSessionValidForBusiness } from "@/lib/owner-session";
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
    | { ownerEmail?: unknown; module?: unknown; action?: unknown; manageToken?: unknown }
    | null;

  const ownerEmail =
    body && typeof body.ownerEmail === "string" ? body.ownerEmail.trim().toLowerCase() : "";
  const moduleValue = body && typeof body.module === "string" ? body.module.trim().toUpperCase() : "";
  const action = body && typeof body.action === "string" ? body.action.trim().toLowerCase() : "";
  const manageToken = body && typeof body.manageToken === "string" ? body.manageToken.trim() : "";

  if (!ownerEmail) {
    return NextResponse.json({ error: "Owner email is required." }, { status: 400 });
  }

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
      email: true,
    },
  });

  if (!business) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const cookieStore = await cookies();
  const ownerSessionToken = cookieStore.get(OWNER_SESSION_COOKIE_NAME)?.value ?? "";
  const hasValidOwnerSession = isOwnerSessionValidForBusiness(ownerSessionToken, { businessId: business.id });
  const hasValidManageToken = manageToken.length > 0 && isManageTokenValidForBusiness(manageToken, business.id);

  if (!hasValidOwnerSession && !hasValidManageToken) {
    return NextResponse.json({ error: "Manage token is invalid or expired." }, { status: 401 });
  }

  if (business.email.toLowerCase() !== ownerEmail) {
    return NextResponse.json({ error: "Owner email does not match this business." }, { status: 403 });
  }

  const now = new Date();
  const moduleKey = moduleValue as AppModule;

  const updated = await prisma.businessModuleSubscription.upsert({
    where: {
      businessId_module: {
        businessId: business.id,
        module: moduleKey,
      },
    },
    update:
      action === "activate"
        ? {
            status: ModuleSubscriptionStatus.ACTIVE,
            startedAt: now,
            endsAt: null,
          }
        : {
            status: ModuleSubscriptionStatus.INACTIVE,
            endsAt: now,
          },
    create: {
      businessId: business.id,
      module: moduleKey,
      status: action === "activate" ? ModuleSubscriptionStatus.ACTIVE : ModuleSubscriptionStatus.INACTIVE,
      startedAt: action === "activate" ? now : null,
      endsAt: action === "activate" ? null : now,
    },
    select: {
      businessId: true,
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
      module: updated.module,
      action,
      status: updated.status,
    },
  });

  return NextResponse.json({
    ok: true,
    module: updated.module,
    status: updated.status,
    startedAt: updated.startedAt,
    endsAt: updated.endsAt,
  });
}
