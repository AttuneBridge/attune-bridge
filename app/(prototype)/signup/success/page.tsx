import Link from "next/link";
import { Card } from "@/components/ui/card";
import { QrCodePreview } from "@/components/ui/qr-code-preview";
import { getAppUrl } from "@/lib/app-url";
import { createManageToken } from "@/lib/manage-token";
import { getDayDelta } from "@/lib/subscription-countdown";
import { prisma } from "@/lib/prisma";

type SignupSuccessPageProps = {
  searchParams: Promise<{ slug?: string; token?: string }>;
};

function formatDate(date: Date | null) {
  if (!date) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default async function SignupSuccessPage({ searchParams }: SignupSuccessPageProps) {
  const { slug, token } = await searchParams;
  const locationSlug = typeof slug === "string" ? slug.trim() : "";
  const providedManageToken = typeof token === "string" ? token.trim() : "";

  if (!locationSlug) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 md:py-14">
        <Card className="space-y-3">
          <h1 className="text-xl font-semibold text-slate-900">Signup details not found</h1>
          <p className="text-sm text-slate-600">Please create your account again to generate your QR code.</p>
          <Link href="/signup" className="text-sm font-medium text-slate-900 underline">
            Back to signup
          </Link>
        </Card>
      </main>
    );
  }

  const location = await prisma.location.findUnique({
    where: { slug: locationSlug },
    select: {
      slug: true,
      name: true,
        business: {
          select: {
            id: true,
            name: true,
            stripeTrialEnd: true,
          },
        },
      },
  });

  if (!location) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 md:py-14">
        <Card className="space-y-3">
          <h1 className="text-xl font-semibold text-slate-900">We could not find that setup</h1>
          <p className="text-sm text-slate-600">Please create your account again to generate your QR code.</p>
          <Link href="/signup" className="text-sm font-medium text-slate-900 underline">
            Back to signup
          </Link>
        </Card>
      </main>
    );
  }

  const publicFeedbackUrl = `${getAppUrl()}/feedback/${location.slug}`;
  const manageToken = providedManageToken || createManageToken({ businessId: location.business.id });
  const manageHref = manageToken
    ? `/dashboard/reviews?slug=${encodeURIComponent(location.slug)}&token=${encodeURIComponent(manageToken)}`
    : `/dashboard/reviews?slug=${encodeURIComponent(location.slug)}`;
  const dayDelta = getDayDelta(location.business.stripeTrialEnd);
  const daysRemaining = dayDelta === null ? null : Math.max(dayDelta, 0);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 md:py-14">
      <Card className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Setup Complete</p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Your feedback QR code is ready
          </h1>
          <p className="text-sm text-slate-700">
            Trial active for {location.business.name}. Your trial ends on {formatDate(location.business.stripeTrialEnd)}.
          </p>
          <p className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
            Trial active
          </p>
          <p className="text-sm text-slate-700">
            Days remaining: {daysRemaining !== null ? `${daysRemaining} day${daysRemaining === 1 ? "" : "s"}` : "Not available"}
          </p>
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
              <span className="font-medium text-slate-900">Feedback link:</span>
            </p>
            <p className="break-all rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-800">
              {publicFeedbackUrl}
            </p>
            <p className="text-xs text-slate-500">
              Use this URL on receipts, table tents, mirrors, waiting areas, or checkout counters.
            </p>
            <div className="pt-1">
              <Link href={`/feedback/${location.slug}`} className="text-sm font-medium text-slate-900 underline">
                Preview customer form
              </Link>
            </div>
            <div>
              <Link href={manageHref} className="text-sm font-medium text-slate-900 underline">
                Open trial status + renew page
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
            <QrCodePreview value={publicFeedbackUrl} />
            <p className="mt-3 text-xs font-medium text-slate-700">Scan to leave feedback</p>
          </div>
        </div>
      </Card>
    </main>
  );
}
