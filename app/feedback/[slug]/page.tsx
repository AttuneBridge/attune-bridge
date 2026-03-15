import Link from "next/link";
import { FeedbackExperience } from "@/components/forms/feedback-experience";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

type FeedbackPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function FeedbackPage({ params }: FeedbackPageProps) {
  const { slug } = await params;

  const location = await prisma.location.findUnique({
    where: { slug },
    include: { business: true },
  });

  if (!location) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 md:py-14">
        <Card className="space-y-3">
          <h1 className="text-xl font-semibold text-slate-900">We could not find that feedback link</h1>
          <p className="text-sm text-slate-600">
            The page may have moved or the link may be incomplete.
          </p>
          <Link href="/" className="text-sm font-medium text-slate-900 underline">
            Go back to homepage
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 md:py-14">
      <Card className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Customer Feedback
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            How was your experience with {location.business.name} - {location.name}?
          </h1>
          <p className="text-sm text-slate-600">
            This takes less than a minute and helps the team improve.
          </p>
        </div>
        <FeedbackExperience
          slug={location.slug}
          businessName={location.business.name}
          locationName={location.name}
          reviewLink={location.reviewLink}
        />
      </Card>
    </main>
  );
}
