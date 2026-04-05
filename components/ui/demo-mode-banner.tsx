export function DemoModeBanner() {
  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-2 text-xs text-amber-900">
        <p>
          <span className="font-semibold uppercase tracking-[0.12em]">Demo Mode</span> - This workspace uses mock data and resets daily.
        </p>
      </div>
    </div>
  );
}
