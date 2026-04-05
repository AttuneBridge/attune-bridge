import { BusinessMembershipRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getRequestIdentity } from "@/lib/identity/request-identity";
import { prisma } from "@/lib/prisma";

export default async function DemoAccessPage() {
  const identity = await getRequestIdentity();
  const ownerMembership = identity
    ? await prisma.businessMembership.findFirst({
        where: {
          userId: identity.userId,
          role: BusinessMembershipRole.OWNER,
        },
        select: {
          id: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      })
    : null;

  if (identity && ownerMembership) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 md:py-14">
      <section className="grid gap-6 md:grid-cols-[1.05fr_0.95fr] md:items-start">
        <Card className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Guided Demo Access</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Open the seeded owner workspace</h1>
          <p className="text-sm text-slate-700">
            This one-click path signs you into the demo owner session so you can explore reviews, scheduler,
            loyalty, and missed call text-back workflows.
          </p>
          <form action="/api/demo/session" method="post" className="pt-1">
            <input type="hidden" name="returnTo" value="/dashboard" />
            <button
              type="submit"
              className="inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Continue as Demo Owner
            </button>
          </form>
        </Card>

        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">What this includes</h2>
          <ul className="space-y-2 text-sm text-slate-700">
            <li>- Seeded business story with private feedback cases</li>
            <li>- Scheduler campaign and recipient activity</li>
            <li>- Loyalty playbooks, queued sends, and sample conversion</li>
            <li>- Missed call text-back records and settings</li>
          </ul>
          <p className="text-xs text-slate-500">This is demo data only and resets daily.</p>
        </Card>
      </section>
    </main>
  );
}
