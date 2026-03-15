import { Sentiment } from "@prisma/client";
import { NextResponse } from "next/server";
import { sendFeedbackNotification } from "@/lib/email";
import { prisma } from "@/lib/prisma";

type FeedbackRequestBody = {
  slug?: unknown;
  locationId?: unknown;
  sentiment?: unknown;
  message?: unknown;
  customerName?: unknown;
  customerEmail?: unknown;
};

const sentimentMap: Record<"positive" | "neutral" | "negative", Sentiment> = {
  positive: Sentiment.POSITIVE,
  neutral: Sentiment.NEUTRAL,
  negative: Sentiment.NEGATIVE,
};

export async function POST(request: Request) {
  let body: FeedbackRequestBody;

  try {
    body = (await request.json()) as FeedbackRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const locationId = typeof body.locationId === "string" ? body.locationId.trim() : "";
  const sentimentRaw = typeof body.sentiment === "string" ? body.sentiment : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
  const customerEmail = typeof body.customerEmail === "string" ? body.customerEmail.trim() : "";

  if (!slug && !locationId) {
    return NextResponse.json({ error: "slug or locationId is required." }, { status: 400 });
  }

  if (!(sentimentRaw in sentimentMap)) {
    return NextResponse.json({ error: "Invalid sentiment value." }, { status: 400 });
  }

  const sentiment = sentimentMap[sentimentRaw as "positive" | "neutral" | "negative"];

  if ((sentiment === Sentiment.NEGATIVE || sentiment === Sentiment.NEUTRAL) && !message) {
    return NextResponse.json({ error: "Message is required for private feedback." }, { status: 400 });
  }

  const location = await prisma.location.findFirst({
    where: slug ? { slug } : { id: locationId },
    include: { business: true },
  });

  if (!location) {
    return NextResponse.json({ error: "Location not found." }, { status: 404 });
  }

  await prisma.feedback.create({
    data: {
      locationId: location.id,
      sentiment,
      message: message || null,
      customerName: customerName || null,
      customerEmail: customerEmail || null,
    },
  });

  if (sentiment === Sentiment.NEUTRAL || sentiment === Sentiment.NEGATIVE) {
    await sendFeedbackNotification({
      businessEmail: location.business.email,
      locationName: location.name,
      sentiment: sentimentRaw as "positive" | "neutral" | "negative",
      message: message || null,
      customerName: customerName || null,
      customerEmail: customerEmail || null,
    });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
