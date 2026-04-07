import { NextResponse } from "next/server";
import { getBusinessApiAccessResult } from "@/lib/auth/business-api-access";
import { getRequestIdentity } from "@/lib/identity/request-identity";
import { prisma } from "@/lib/prisma";

type UpvoteBody = {
  ownerEmail?: unknown;
  manageToken?: unknown;
};

function isLikelyEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ businessId: string; requestId: string }> },
) {
  const { businessId, requestId } = await context.params;

  let body: UpvoteBody = {};

  try {
    body = (await request.json()) as UpvoteBody;
  } catch {
    body = {};
  }

  const manageToken = typeof body.manageToken === "string" ? body.manageToken.trim() : "";
  const ownerEmailInput = typeof body.ownerEmail === "string" ? body.ownerEmail.trim().toLowerCase() : "";

  if (ownerEmailInput && !isLikelyEmail(ownerEmailInput)) {
    return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
  }

  const featureRequest = await prisma.ownerFeatureRequest.findFirst({
    where: {
      id: requestId,
      businessId,
    },
    select: {
      id: true,
      businessId: true,
      business: {
        select: {
          email: true,
        },
      },
    },
  });

  if (!featureRequest) {
    return NextResponse.json({ error: "Feature request not found." }, { status: 404 });
  }

  const access = await getBusinessApiAccessResult(featureRequest.businessId, manageToken);

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const identity = await getRequestIdentity();
  const voterEmail =
    ownerEmailInput ||
    identity?.email?.toLowerCase() ||
    featureRequest.business.email.toLowerCase();

  await prisma.ownerFeatureRequestVote.upsert({
    where: {
      featureRequestId_ownerEmail: {
        featureRequestId: featureRequest.id,
        ownerEmail: voterEmail,
      },
    },
    update: {},
    create: {
      businessId: featureRequest.businessId,
      featureRequestId: featureRequest.id,
      ownerEmail: voterEmail,
    },
  });

  const updated = await prisma.ownerFeatureRequest.findUnique({
    where: { id: featureRequest.id },
    select: {
      _count: {
        select: {
          votes: true,
        },
      },
      votes: {
        where: {
          ownerEmail: voterEmail,
        },
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  return NextResponse.json({
    ok: true,
    upvoteCount: updated?._count.votes ?? 0,
    hasUpvoted: (updated?.votes.length ?? 0) > 0,
  });
}
