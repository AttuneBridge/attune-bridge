import { NextResponse } from "next/server";
import { getBusinessApiAccessResult } from "@/lib/auth/business-api-access";
import { prisma } from "@/lib/prisma";

type SettingsRequestBody = {
  instantEmailNeutral?: unknown;
  instantEmailNegative?: unknown;
  smsNegativeEnabled?: unknown;
  alertPhone?: unknown;
  quietHoursStart?: unknown;
  quietHoursEnd?: unknown;
  manageToken?: unknown;
};

function normalizePhone(phone: string) {
  return phone.replace(/[^+\d]/g, "");
}

function toOptionalTime(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await context.params;
  const { searchParams } = new URL(_request.url);
  const manageToken = searchParams.get("token")?.trim() ?? "";

  const access = await getBusinessApiAccessResult(businessId, manageToken);

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      instantEmailNeutral: true,
      instantEmailNegative: true,
      smsNegativeEnabled: true,
      alertPhone: true,
      quietHoursStart: true,
      quietHoursEnd: true,
    },
  });

  if (!business) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  return NextResponse.json({
    businessId: business.id,
    instantEmailNeutral: business.instantEmailNeutral,
    instantEmailNegative: business.instantEmailNegative,
    smsNegativeEnabled: business.smsNegativeEnabled,
    alertPhone: business.alertPhone,
    quietHoursStart: business.quietHoursStart,
    quietHoursEnd: business.quietHoursEnd,
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await context.params;
  let body: SettingsRequestBody;

  try {
    body = (await request.json()) as SettingsRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const instantEmailNeutral =
    typeof body.instantEmailNeutral === "boolean" ? body.instantEmailNeutral : undefined;
  const instantEmailNegative =
    typeof body.instantEmailNegative === "boolean" ? body.instantEmailNegative : undefined;
  const smsNegativeEnabled =
    typeof body.smsNegativeEnabled === "boolean" ? body.smsNegativeEnabled : undefined;
  const quietHoursStart = toOptionalTime(body.quietHoursStart);
  const quietHoursEnd = toOptionalTime(body.quietHoursEnd);
  const manageToken = typeof body.manageToken === "string" ? body.manageToken.trim() : "";

  const access = await getBusinessApiAccessResult(businessId, manageToken);

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const alertPhoneInput = typeof body.alertPhone === "string" ? body.alertPhone.trim() : undefined;
  const normalizedAlertPhone =
    alertPhoneInput === undefined
      ? undefined
      : alertPhoneInput.length > 0
        ? normalizePhone(alertPhoneInput)
        : null;

  const existing = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      smsNegativeEnabled: true,
      alertPhone: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const nextSmsEnabled = smsNegativeEnabled ?? existing.smsNegativeEnabled;
  const nextAlertPhone = normalizedAlertPhone === undefined ? existing.alertPhone : normalizedAlertPhone;

  if (nextSmsEnabled && !nextAlertPhone) {
    return NextResponse.json(
      { error: "alertPhone is required when smsNegativeEnabled is true." },
      { status: 400 },
    );
  }

  const updated = await prisma.business.update({
    where: { id: businessId },
    data: {
      ...(instantEmailNeutral === undefined ? {} : { instantEmailNeutral }),
      ...(instantEmailNegative === undefined ? {} : { instantEmailNegative }),
      ...(smsNegativeEnabled === undefined ? {} : { smsNegativeEnabled }),
      ...(normalizedAlertPhone === undefined ? {} : { alertPhone: normalizedAlertPhone }),
      quietHoursStart,
      quietHoursEnd,
    },
    select: {
      id: true,
      instantEmailNeutral: true,
      instantEmailNegative: true,
      smsNegativeEnabled: true,
      alertPhone: true,
      quietHoursStart: true,
      quietHoursEnd: true,
    },
  });

  return NextResponse.json({
    ok: true,
    settings: {
      businessId: updated.id,
      instantEmailNeutral: updated.instantEmailNeutral,
      instantEmailNegative: updated.instantEmailNegative,
      smsNegativeEnabled: updated.smsNegativeEnabled,
      alertPhone: updated.alertPhone,
      quietHoursStart: updated.quietHoursStart,
      quietHoursEnd: updated.quietHoursEnd,
    },
  });
}
