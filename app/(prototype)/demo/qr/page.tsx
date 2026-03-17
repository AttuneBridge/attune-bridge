import Link from "next/link";
import { Card } from "@/components/ui/card";
import { QrCodePreview } from "@/components/ui/qr-code-preview";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function getAppUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return appUrl && appUrl.length > 0 ? appUrl.replace(/\/$/, "") : "http://localhost:3000";
}

export default async function DemoQrPage() {
  let location:
    | {
        slug: string;
        name: string;
        business: { name: string };
      }
    | null = null;

  try {
    location = await prisma.location.findUnique({
      where: { slug: "demo-coffee-downtown" },
      include: { business: true },
    });
  } catch {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 md:py-14">
        <Card className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Location QR Code</h1>
          <p className="text-sm text-slate-600">
            Demo location data is unavailable until the database is configured.
          </p>
          <Link href="/" className="text-sm font-medium text-slate-900 underline">
            Go back to homepage
          </Link>
        </Card>
      </main>
    );
  }

  if (!location) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 md:py-14">
        <Card className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Location QR Code</h1>
          <p className="text-sm text-slate-600">No demo location found yet.</p>
          <Link href="/" className="text-sm font-medium text-slate-900 underline">
            Go back to homepage
          </Link>
        </Card>
      </main>
    );
  }

  const publicFeedbackUrl = `${getAppUrl()}/feedback/${location.slug}`;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 md:py-14">
      <Card className="space-y-5">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Location QR Code</h1>
          <p className="text-sm text-slate-700">
            Customers can scan this code to leave feedback after their visit.
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
              <span className="font-medium text-slate-900">Slug:</span> {location.slug}
            </p>
            <p>
              <span className="font-medium text-slate-900">Public feedback URL:</span>
            </p>
            <p className="break-all rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-800">
              {publicFeedbackUrl}
            </p>
            <p className="text-xs text-slate-500">
              Use this on a receipt, sign, or table tent.
            </p>
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
