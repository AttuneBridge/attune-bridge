import { NextResponse } from "next/server";
import { FeatureRequestModule } from "@prisma/client";
import { getBusinessApiAccessResult } from "@/lib/auth/business-api-access";
import { prisma } from "@/lib/prisma";
import { trackValidationEvent, validationEvent } from "@/lib/validation-events";

type FeatureRequestBody = {
  ownerEmail?: unknown;
  module?: unknown;
  details?: unknown;
  manageToken?: unknown;
};

const FEATURE_REQUEST_MODULES = new Set<string>(Object.values(FeatureRequestModule));

function isLikelyEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await context.params;

  let body: FeatureRequestBody;

  try {
    body = (await request.json()) as FeatureRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const ownerEmail = typeof body.ownerEmail === "string" ? body.ownerEmail.trim().toLowerCase() : "";
  const moduleValue = typeof body.module === "string" ? body.module.trim().toUpperCase() : "";
  const details = typeof body.details === "string" ? body.details.trim() : "";
  const manageToken = typeof body.manageToken === "string" ? body.manageToken.trim() : "";
  const requestModule = FEATURE_REQUEST_MODULES.has(moduleValue)
    ? (moduleValue as FeatureRequestModule)
    : FeatureRequestModule.PLATFORM;

  if (!details) {
    return NextResponse.json(
      { error: "details is required." },
      { status: 400 },
    );
  }

  if (ownerEmail && !isLikelyEmail(ownerEmail)) {
    return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
  }

  if (details.length < 10) {
    return NextResponse.json(
      { error: "Please share at least a short description (10+ characters)." },
      { status: 400 },
    );
  }

  if (details.length > 1000) {
    return NextResponse.json({ error: "Please keep the request under 1000 characters." }, { status: 400 });
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, email: true },
  });

  if (!business) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const access = await getBusinessApiAccessResult(business.id, manageToken);

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const requestOwnerEmail = ownerEmail || business.email.toLowerCase();

  const featureRequest = await prisma.$transaction(async (tx) => {
    const created = await tx.ownerFeatureRequest.create({
      data: {
        businessId: business.id,
        ownerEmail: requestOwnerEmail,
        module: requestModule,
        details,
      },
      select: {
        id: true,
        module: true,
        status: true,
        createdAt: true,
      },
    });

    await tx.ownerFeatureRequestVote.create({
      data: {
        businessId: business.id,
        featureRequestId: created.id,
        ownerEmail: requestOwnerEmail,
      },
    });

    return created;
  });

  await trackValidationEvent({
    event: validationEvent.ownerFeatureRequestSubmitted,
    businessId: business.id,
      metadata: {
        featureRequestId: featureRequest.id,
        module: featureRequest.module,
        detailsLength: details.length,
      },
  });

  return NextResponse.json(
    {
      ok: true,
      featureRequest: {
        ...featureRequest,
        upvoteCount: 1,
      },
    },
    { status: 201 },
  );
}
