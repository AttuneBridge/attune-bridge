import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PrintPageButton } from "@/components/ui/print-page-button";
import { QrCodePreview } from "@/components/ui/qr-code-preview";
import { getAppUrl } from "@/lib/app-url";
import { redirectToDashboardAccess } from "@/lib/auth/redirects";
import { getOwnerWorkspaceContextOrRedirect } from "@/lib/owner-workspace-context";
import { prisma } from "@/lib/prisma";
import { trackValidationEvent, validationEvent } from "@/lib/validation-events";

export const dynamic = "force-dynamic";

export default async function DashboardReviewsQrPage() {
  const workspace = await getOwnerWorkspaceContextOrRedirect();

  const location = await prisma.location.findUnique({
    where: { slug: workspace.locationSlug },
    select: {
      id: true,
      slug: true,
      name: true,
      business: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!location || location.business.id !== workspace.businessId) {
    redirectToDashboardAccess("/dashboard/reviews/qr");
  }

  const publicFeedbackUrl = `${getAppUrl()}/feedback/${location.slug}`;

  await trackValidationEvent({
    event: validationEvent.qrViewed,
    businessId: location.business.id,
    locationId: location.id,
    metadata: {
      source: "dashboard_reviews_qr",
    },
  });

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
      <Card className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Reviews</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Location QR code</h1>
          <p className="text-sm text-slate-700">Share this QR code so customers can quickly leave a private review.</p>
          <Link href="/dashboard/reviews/feedback" className="inline-flex text-sm font-medium text-slate-900 underline">
            Back to feedback inbox
          </Link>
          <div className="pt-1 print:hidden">
            <PrintPageButton />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-start">
          <div className="space-y-2 text-sm text-slate-700">
            <p>
              <span className="font-medium text-slate-900">Business:</span> {location.business.name}
            </p>
            <p>
              <span className="font-medium text-slate-900">Location:</span> {location.name}
            </p>
            <p>
              <span className="font-medium text-slate-900">Location slug:</span> {location.slug}
            </p>
            <p>
              <span className="font-medium text-slate-900">Public review URL:</span>
            </p>
            <p className="break-all rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-800">{publicFeedbackUrl}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
            <QrCodePreview value={publicFeedbackUrl} />
            <p className="mt-3 text-xs font-medium text-slate-700">Scan to leave a review</p>
          </div>
        </div>
      </Card>
    </main>
  );
}
