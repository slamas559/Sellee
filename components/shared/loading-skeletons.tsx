function PulseBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`} />;
}

export function HomeLoadingSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-3 py-5 sm:px-4 sm:py-6">
      <PulseBlock className="h-10 w-full rounded-2xl" />
      <PulseBlock className="h-48 w-full sm:h-64" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 6 }).map((_, index) => (
          <PulseBlock key={index} className="h-12 w-40 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-slate-200 bg-white p-2">
            <PulseBlock className="h-32 w-full rounded-xl sm:h-40" />
            <PulseBlock className="mt-2 h-4 w-3/4" />
            <PulseBlock className="mt-1 h-3 w-1/2" />
            <PulseBlock className="mt-2 h-8 w-full rounded-full" />
          </div>
        ))}
      </div>
    </main>
  );
}

export function MarketplaceLoadingSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-3 py-5 sm:px-4 sm:py-6">
      <PulseBlock className="h-14 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-slate-200 bg-white p-2">
            <PulseBlock className="h-32 w-full rounded-xl sm:h-40" />
            <PulseBlock className="mt-2 h-4 w-3/4" />
            <PulseBlock className="mt-1 h-3 w-1/2" />
            <PulseBlock className="mt-2 h-8 w-full rounded-full" />
          </div>
        ))}
      </div>
    </main>
  );
}

export function VendorsLoadingSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-3 py-5 sm:px-4 sm:py-6">
      <PulseBlock className="h-14 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-slate-200 bg-white p-3">
            <PulseBlock className="h-12 w-12 rounded-full" />
            <PulseBlock className="mt-3 h-4 w-3/4" />
            <PulseBlock className="mt-2 h-3 w-1/2" />
            <div className="mt-4 flex items-center justify-between gap-2">
              <PulseBlock className="h-6 w-20 rounded-full" />
              <PulseBlock className="h-6 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export function StoreLoadingSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-2 py-6 sm:px-4 sm:py-8">
      <PulseBlock className="h-48 w-full sm:h-64" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-slate-200 bg-white p-2">
            <PulseBlock className="h-32 w-full rounded-xl sm:h-40" />
            <PulseBlock className="mt-2 h-4 w-3/4" />
            <PulseBlock className="mt-1 h-3 w-1/2" />
            <PulseBlock className="mt-2 h-8 w-full rounded-full" />
          </div>
        ))}
      </div>
    </main>
  );
}

export function ProductDetailsLoadingSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-2 py-6 sm:px-4 sm:py-8">
      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <PulseBlock className="h-72 w-full sm:h-96" />
          <div className="mt-4 flex gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <PulseBlock key={index} className="h-16 w-16 rounded-xl" />
            ))}
          </div>
          <PulseBlock className="mt-4 h-8 w-2/3" />
          <PulseBlock className="mt-2 h-4 w-1/2" />
          <PulseBlock className="mt-3 h-24 w-full" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <PulseBlock className="h-6 w-1/2" />
          <PulseBlock className="mt-3 h-10 w-full" />
          <PulseBlock className="mt-2 h-10 w-full" />
          <PulseBlock className="mt-2 h-12 w-full rounded-xl" />
        </div>
      </div>
      <PulseBlock className="h-56 w-full" />
    </main>
  );
}

export function DashboardLoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <PulseBlock key={index} className="h-24 w-full" />
      ))}
      <PulseBlock className="h-64 w-full md:col-span-2 xl:col-span-3" />
      <PulseBlock className="h-64 w-full md:col-span-2 xl:col-span-1" />
    </div>
  );
}

