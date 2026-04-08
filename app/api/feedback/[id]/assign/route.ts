import { BusinessMembershipRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getRequestIdentity } from "@/lib/identity/request-identity";
import { prisma } from "@/lib/prisma";
import { trackValidationEvent, validationEvent } from "@/lib/validation-events";

type AssignRequestBody = {
  assignedMembershipId?: unknown;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const identity = await getRequestIdentity();

  if (!identity) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  let body: AssignRequestBody;

  try {
    body = (await request.json()) as AssignRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const assignedMembershipIdRaw =
    typeof body.assignedMembershipId === "string" ? body.assignedMembershipId.trim() : "";
  const assignedMembershipId = assignedMembershipIdRaw || null;

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    select: {
      id: true,
      locationId: true,
      assignedMembershipId: true,
      location: {
        select: {
          businessId: true,
        },
      },
    },
  });

  if (!feedback) {
    return NextResponse.json({ error: "Feedback not found." }, { status: 404 });
  }

  const actorMembership = await prisma.businessMembership.findFirst({
    where: {
      businessId: feedback.location.businessId,
      userId: identity.userId,
      role: BusinessMembershipRole.OWNER,
    },
    select: {
      id: true,
    },
  });

  if (!actorMembership) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (assignedMembershipId) {
    const assignee = await prisma.businessMembership.findFirst({
      where: {
        id: assignedMembershipId,
        businessId: feedback.location.businessId,
      },
      select: { id: true },
    });

    if (!assignee) {
      return NextResponse.json({ error: "Assignee not found for this business." }, { status: 400 });
    }
  }

  const updated = await prisma.feedback.update({
    where: { id: feedback.id },
    data: {
      assignedMembershipId,
    },
    select: {
      id: true,
      assignedMembershipId: true,
      assignedMembership: {
        select: {
          id: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      },
    },
  });

  if (feedback.assignedMembershipId !== assignedMembershipId) {
    await trackValidationEvent({
      event: validationEvent.reviewsCaseAssigned,
      businessId: feedback.location.businessId,
      locationId: feedback.locationId,
      metadata: {
        feedbackId: feedback.id,
        previousAssignedMembershipId: feedback.assignedMembershipId,
        nextAssignedMembershipId: assignedMembershipId,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    assignment: {
      assignedMembershipId: updated.assignedMembershipId,
      assignedEmail: updated.assignedMembership?.user.email ?? null,
    },
  });
}
