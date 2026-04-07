import {
  FollowUpPreference,
  FeedbackStatus,
  NotificationChannel,
  Sentiment,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { queueLoyaltyMessagesFromFeedback } from "@/lib/loyalty/feedback-trigger";
import { sendFeedbackAlerts } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { evaluateBusinessAccess } from "@/lib/subscription-access";
import { trackValidationEvent, validationEvent } from "@/lib/validation-events";

type FeedbackRequestBody = {
  slug?: unknown;
  locationId?: unknown;
  sentiment?: unknown;
  message?: unknown;
  wantsFollowUp?: unknown;
  followUpPreference?: unknown;
  phone?: unknown;
  customerName?: unknown;
  customerEmail?: unknown;
};

const sentimentMap: Record<"positive" | "neutral" | "negative", Sentiment> = {
  positive: Sentiment.POSITIVE,
  neutral: Sentiment.NEUTRAL,
  negative: Sentiment.NEGATIVE,
};

const followUpPreferenceMap: Record<"text" | "call" | "email", FollowUpPreference> = {
  text: FollowUpPreference.TEXT,
  call: FollowUpPreference.CALL,
  email: FollowUpPreference.EMAIL,
};

const feedbackStatusMap: Record<string, FeedbackStatus> = {
  NEW: FeedbackStatus.NEW,
  IN_PROGRESS: FeedbackStatus.IN_PROGRESS,
  RESOLVED: FeedbackStatus.RESOLVED,
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId")?.trim() ?? "";
  const statusRaw = searchParams.get("status")?.trim() ?? "";
  const sentimentRaw = searchParams.get("sentiment")?.trim() ?? "";
  const cursor = searchParams.get("cursor")?.trim() ?? "";
  const limitRaw = Number(searchParams.get("limit") ?? "25");
  const take = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 25;

  if (!businessId) {
    return NextResponse.json({ error: "businessId is required." }, { status: 400 });
  }

  const where: {
    location: { businessId: string };
    status?: FeedbackStatus;
    sentiment?: Sentiment;
  } = {
    location: {
      businessId,
    },
  };

  if (statusRaw) {
    if (!(statusRaw in feedbackStatusMap)) {
      return NextResponse.json({ error: "Invalid feedback status." }, { status: 400 });
    }

    where.status = feedbackStatusMap[statusRaw];
  }

  if (sentimentRaw) {
    if (!(sentimentRaw in Sentiment)) {
      return NextResponse.json({ error: "Invalid sentiment filter." }, { status: 400 });
    }

    where.sentiment = Sentiment[sentimentRaw as keyof typeof Sentiment];
  }

  const feedback = await prisma.feedback.findMany({
    where,
    include: {
      location: {
        select: {
          id: true,
          name: true,
          business: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      notificationEvents: {
        orderBy: { createdAt: "desc" },
        take: 6,
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    take,
  });

  const items = feedback.map((entry) => {
    const latestEmail = entry.notificationEvents.find(
      (event) => event.channel === NotificationChannel.EMAIL,
    );
    const latestSms = entry.notificationEvents.find(
      (event) => event.channel === NotificationChannel.SMS,
    );

    return {
      id: entry.id,
      sentiment: entry.sentiment,
      status: entry.status,
      recoveryOutcome: entry.recoveryOutcome,
      message: entry.message,
      createdAt: entry.createdAt,
      firstRespondedAt: entry.firstRespondedAt,
      resolvedAt: entry.resolvedAt,
      nextFollowUpAt: entry.nextFollowUpAt,
      location: {
        id: entry.location.id,
        name: entry.location.name,
        business: {
          id: entry.location.business.id,
          name: entry.location.business.name,
        },
      },
      customer: {
        name: entry.customerName,
        email: entry.customerEmail,
        phone: entry.phone,
        wantsFollowUp: entry.wantsFollowUp,
        followUpPreference: entry.followUpPreference,
      },
      notifications: {
        latestEmailStatus: latestEmail?.status ?? null,
        latestEmailReason: latestEmail?.reason ?? null,
        latestSmsStatus: latestSms?.status ?? null,
        latestSmsReason: latestSms?.reason ?? null,
      },
    };
  });

  return NextResponse.json({
    items,
    nextCursor: feedback.length === take ? feedback[feedback.length - 1]?.id ?? null : null,
  });
}

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
  const wantsFollowUp = typeof body.wantsFollowUp === "boolean" ? body.wantsFollowUp : false;
  const followUpPreferenceRaw =
    typeof body.followUpPreference === "string" ? body.followUpPreference : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
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

  let followUpPreference: FollowUpPreference | null = null;

  if (wantsFollowUp) {
    if (!(followUpPreferenceRaw in followUpPreferenceMap)) {
      return NextResponse.json(
        { error: "Preferred contact method is required when follow-up is requested." },
        { status: 400 },
      );
    }

    followUpPreference =
      followUpPreferenceMap[followUpPreferenceRaw as "text" | "call" | "email"];

    if (
      (followUpPreference === FollowUpPreference.TEXT ||
        followUpPreference === FollowUpPreference.CALL) &&
      !phone
    ) {
      return NextResponse.json(
        { error: "Phone number is required for text or call follow-up." },
        { status: 400 },
      );
    }

    if (followUpPreference === FollowUpPreference.EMAIL && !customerEmail) {
      return NextResponse.json(
        { error: "Email is required for email follow-up." },
        { status: 400 },
      );
    }
  }

  const location = await prisma.location.findFirst({
    where: slug ? { slug } : { id: locationId },
    include: {
      business: {
        select: {
          id: true,
          name: true,
          email: true,
          subscriptionStatus: true,
          trialEndsAt: true,
          paidThrough: true,
          autoRenewEnabled: true,
          deactivatedAt: true,
          instantEmailNeutral: true,
          instantEmailNegative: true,
          smsNegativeEnabled: true,
          alertPhone: true,
        },
      },
    },
  });

  if (!location) {
    return NextResponse.json({ error: "Location not found." }, { status: 404 });
  }

  const access = evaluateBusinessAccess({
    subscriptionStatus: location.business.subscriptionStatus,
    trialEndsAt: location.business.trialEndsAt,
    paidThrough: location.business.paidThrough,
    autoRenewEnabled: location.business.autoRenewEnabled,
    deactivatedAt: location.business.deactivatedAt,
  });

  if (!access.isActive) {
    return NextResponse.json(
      { error: "This feedback form is currently inactive." },
      { status: 403 },
    );
  }

  const feedback = await prisma.feedback.create({
    data: {
      locationId: location.id,
      sentiment,
      message: message || null,
      wantsFollowUp,
      followUpPreference,
      phone: wantsFollowUp ? phone || null : null,
      customerName: customerName || null,
      customerEmail: customerEmail || null,
    },
  });

  await trackValidationEvent({
    event: validationEvent.feedbackSubmitted,
    businessId: location.business.id,
    locationId: location.id,
    metadata: {
      sentiment,
      wantsFollowUp,
      hasMessage: Boolean(message),
    },
  });

  try {
    await queueLoyaltyMessagesFromFeedback({
      businessId: location.business.id,
      locationId: location.id,
      feedbackId: feedback.id,
      sentiment,
      customerName: customerName || null,
      customerEmail: customerEmail || null,
    });
  } catch {
    // Loyalty queueing should not block feedback capture.
  }

  let alerts: { email: "sent" | "failed" | "skipped"; sms: "sent" | "failed" | "skipped" } = {
    email: "failed",
    sms: "failed",
  };

  try {
    alerts = await sendFeedbackAlerts({
      feedbackId: feedback.id,
      sentiment,
      message: message || null,
      wantsFollowUp,
      followUpPreference,
      phone: wantsFollowUp ? phone || null : null,
      customerName: customerName || null,
      customerEmail: customerEmail || null,
      location,
    });
  } catch {
    alerts = { email: "failed", sms: "failed" };
  }

  return NextResponse.json({ ok: true, feedbackId: feedback.id, alerts }, { status: 201 });
}
