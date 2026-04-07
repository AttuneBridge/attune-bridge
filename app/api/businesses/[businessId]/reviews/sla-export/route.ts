import { BusinessMembershipRole } from "@prisma/client";
import { getRequestIdentity } from "@/lib/identity/request-identity";
import { prisma } from "@/lib/prisma";

function toCsvCell(value: string | number | null) {
  if (value === null) {
    return "";
  }

  const text = String(value);
  if (!text.includes(",") && !text.includes("\"") && !text.includes("\n")) {
    return text;
  }

  return `"${text.replaceAll("\"", "\"\"")}"`;
}

function toIso(value: Date | null) {
  return value ? value.toISOString() : null;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ businessId: string }> },
) {
  const identity = await getRequestIdentity();

  if (!identity) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { businessId } = await context.params;
  const membership = await prisma.businessMembership.findFirst({
    where: {
      businessId,
      userId: identity.userId,
      role: BusinessMembershipRole.OWNER,
    },
    select: { id: true },
  });

  if (!membership) {
    return new Response("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const daysRaw = Number(searchParams.get("days") ?? "7");
  const days = Number.isFinite(daysRaw) ? Math.min(Math.max(Math.floor(daysRaw), 1), 30) : 7;
  const nowMs = Date.now();
  const since = new Date(nowMs - days * 24 * 60 * 60 * 1000);

  const feedbackEntries = await prisma.feedback.findMany({
    where: {
      location: {
        businessId,
      },
      OR: [
        { createdAt: { gte: since } },
        { resolvedAt: { gte: since } },
      ],
    },
    select: {
      id: true,
      sentiment: true,
      status: true,
      recoveryOutcome: true,
      createdAt: true,
      resolvedAt: true,
      nextFollowUpAt: true,
      customerName: true,
      customerEmail: true,
      phone: true,
      location: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const header = [
    "case_id",
    "location",
    "sentiment",
    "status",
    "recovery_outcome",
    "created_at",
    "resolved_at",
    "open_age_hours",
    "sla_state",
    "next_follow_up_at",
    "reminder_state",
    "customer_name",
    "customer_email",
    "customer_phone",
  ];

  const rows = feedbackEntries.map((entry) => {
    const ageHours = Math.max(0, Math.floor((nowMs - entry.createdAt.getTime()) / (1000 * 60 * 60)));
    const isOpen = entry.status !== "RESOLVED";
    const slaState = !isOpen
      ? "resolved"
      : ageHours >= 72
        ? "breached"
        : ageHours >= 24
          ? "at_risk"
          : "within_target";
    const reminderState = !isOpen
      ? "n/a"
      : entry.nextFollowUpAt === null
        ? "none"
        : entry.nextFollowUpAt.getTime() <= nowMs
          ? "overdue"
          : entry.nextFollowUpAt.getTime() <= nowMs + 24 * 60 * 60 * 1000
            ? "due_24h"
            : "scheduled";

    return [
      entry.id,
      entry.location.name,
      entry.sentiment,
      entry.status,
      entry.recoveryOutcome,
      toIso(entry.createdAt),
      toIso(entry.resolvedAt),
      isOpen ? ageHours : 0,
      slaState,
      toIso(entry.nextFollowUpAt),
      reminderState,
      entry.customerName,
      entry.customerEmail,
      entry.phone,
    ].map(toCsvCell);
  });

  const csv = [header.map(toCsvCell).join(","), ...rows.map((row) => row.join(","))].join("\n");
  const fileSuffix = new Date().toISOString().slice(0, 10);
  const filename = `attunebridge-sla-${days}d-${fileSuffix}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
