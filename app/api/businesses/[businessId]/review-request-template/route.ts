import { NextResponse } from "next/server";
import { getBusinessApiAccessResult } from "@/lib/auth/business-api-access";
import { prisma } from "@/lib/prisma";

type TemplateRequestBody = {
  template?: unknown;
  manageToken?: unknown;
};

function toOptionalTemplate(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await context.params;
  const { searchParams } = new URL(request.url);
  const manageToken = searchParams.get("token")?.trim() ?? "";

  const access = await getBusinessApiAccessResult(businessId, manageToken);

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      reviewRequestTemplate: true,
    },
  });

  if (!business) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  return NextResponse.json({
    businessId: business.id,
    reviewRequestTemplate: business.reviewRequestTemplate,
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await context.params;
  let body: TemplateRequestBody;

  try {
    body = (await request.json()) as TemplateRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const template = toOptionalTemplate(body.template);

  if (template !== undefined && template !== null && template.length > 320) {
    return NextResponse.json(
      { error: "Template must be 320 characters or fewer." },
      { status: 400 },
    );
  }

  const manageToken = typeof body.manageToken === "string" ? body.manageToken.trim() : "";
  const access = await getBusinessApiAccessResult(businessId, manageToken);

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  if (template === undefined) {
    return NextResponse.json({ error: "template is required." }, { status: 400 });
  }

  const updated = await prisma.business.update({
    where: { id: businessId },
    data: {
      reviewRequestTemplate: template,
    },
    select: {
      id: true,
      reviewRequestTemplate: true,
    },
  });

  return NextResponse.json({
    ok: true,
    settings: {
      businessId: updated.id,
      reviewRequestTemplate: updated.reviewRequestTemplate,
    },
  });
}
