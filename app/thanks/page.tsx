import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function ThanksPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 md:py-14">
      <Card className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Thanks for sharing</h1>
        <p className="text-slate-700">
          Your feedback was submitted successfully and shared privately with the business owner.
        </p>
        <p className="text-slate-700">
          They can now use your notes to follow up and improve future experiences.
        </p>
        <Link href="/" className="text-sm font-medium text-slate-900 underline">
          Return home
        </Link>
      </Card>
    </main>
  );
}
