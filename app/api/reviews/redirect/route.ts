import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { trackValidationEvent, validationEvent } from "@/lib/validation-events";

const allowedChannels = new Set(["google", "yelp"]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug")?.trim() ?? "";
  const channel = searchParams.get("channel")?.trim().toLowerCase() ?? "";

  if (!slug || !allowedChannels.has(channel)) {
    return NextResponse.json({ error: "Invalid redirect request." }, { status: 400 });
  }

  const location = await prisma.location.findUnique({
    where: { slug },
    select: {
      id: true,
      businessId: true,
      googleReviewLink: true,
      yelpReviewLink: true,
    },
  });

  if (!location) {
    return NextResponse.json({ error: "Location not found." }, { status: 404 });
  }

  const redirectUrl = channel === "google" ? location.googleReviewLink : location.yelpReviewLink;

  if (!redirectUrl) {
    return NextResponse.json({ error: "Review link is not configured." }, { status: 404 });
  }

  await trackValidationEvent({
    event: validationEvent.reviewRedirectOpened,
    businessId: location.businessId,
    locationId: location.id,
    metadata: {
      channel,
      source: "feedback_experience",
    },
  });

  return NextResponse.redirect(redirectUrl, { status: 307 });
}
