function PulseBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`} />;
}

function PulseCircle({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-full bg-slate-200/80 ${className}`} />;
}

// ── Homepage ──
// Mirrors app/page.tsx's real section order: hero card (badge + heading +
// buttons on the left, 2x2 stat cards on the right, desktop-only) -> mobile
// 3-col mini stat strip -> promo banner -> "Browse Categories" chip row ->
// nearby-vendors horizontal scroll -> product grid.
export function HomeLoadingSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-5 px-2 py-3 sm:px-3 sm:py-6 lg:gap-9 lg:py-7">
      <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-amber-100 p-4 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-8">
          <div className="space-y-4 sm:space-y-5">
            <PulseBlock className="h-6 w-32 rounded-full bg-white/70" />
            <PulseBlock className="h-10 w-full max-w-xl sm:h-14" />
            <PulseBlock className="h-4 w-full max-w-md" />
            <div className="flex gap-3">
              <PulseBlock className="h-11 w-32 rounded-full" />
              <PulseBlock className="h-11 w-36 rounded-full" />
            </div>
          </div>
          <div className="hidden gap-3 sm:grid sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4">
                <PulseBlock className="h-9 w-9 rounded-xl" />
                <PulseBlock className="mt-3 h-5 w-2/3" />
                <PulseBlock className="mt-1.5 h-3 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-white p-3 sm:hidden">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex flex-col items-center gap-1.5">
            <PulseBlock className="h-4 w-10" />
            <PulseBlock className="h-2.5 w-12" />
          </div>
        ))}
      </div>

      <PulseBlock className="h-20 w-full rounded-2xl sm:h-24" />

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <PulseBlock className="h-6 w-40" />
        <div className="mt-4 flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, index) => (
            <PulseBlock key={index} className="h-10 w-28 shrink-0 rounded-full" />
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <PulseBlock className="h-6 w-48" />
        <div className="mt-4 flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="w-56 shrink-0 rounded-2xl border border-slate-200 p-3">
              <PulseBlock className="h-24 w-full rounded-xl" />
              <PulseBlock className="mt-2 h-4 w-3/4" />
              <PulseBlock className="mt-1 h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-1.5 shadow-sm sm:p-5">
        <div className="mt-2 grid grid-cols-2 gap-1 sm:mt-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="w-full max-w-[290px] space-y-2 rounded-2xl border border-slate-200 bg-white p-2">
              <PulseBlock className="h-32 w-full rounded-xl sm:h-40" />
              <PulseBlock className="h-4 w-3/4" />
              <PulseBlock className="h-3 w-1/2" />
              <PulseBlock className="h-8 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

// ── Marketplace ──
// Mirrors app/marketplace/page.tsx: header -> [300px filter sidebar, desktop
// only] + product grid, side by side.
export function MarketplaceLoadingSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 px-2 py-6 sm:px-3 lg:py-8">
      <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
        <PulseBlock className="h-3 w-24" />
        <PulseBlock className="mt-2 h-8 w-2/3 max-w-md" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="hidden rounded-3xl border border-emerald-200/80 bg-white p-5 lg:block">
          <PulseBlock className="h-4 w-28" />
          <PulseBlock className="mt-2 h-3 w-full" />
          <div className="mt-5 space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index}>
                <PulseBlock className="h-3 w-20" />
                <PulseBlock className="mt-2 h-9 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-emerald-100 bg-white p-3 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <PulseBlock className="h-5 w-24" />
            <PulseBlock className="h-4 w-16" />
          </div>
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
        </div>
      </div>
    </main>
  );
}

// ── Vendor directory ──
// Mirrors app/vendors/page.tsx: header -> filter form (2/4-col) -> vendor
// card grid (sm:2 lg:3 xl:4).
export function VendorsLoadingSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-5 px-2 py-4 sm:px-3 sm:py-6 lg:gap-7 lg:py-8">
      <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
        <PulseBlock className="h-3 w-24" />
        <PulseBlock className="mt-2 h-8 w-2/3 max-w-md" />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <PulseBlock key={index} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-6">
        <div className="grid grid-cols-1 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 bg-white p-3">
              <PulseCircle className="h-12 w-12" />
              <PulseBlock className="mt-3 h-4 w-3/4" />
              <PulseBlock className="mt-2 h-3 w-1/2" />
              <div className="mt-4 flex items-center justify-between gap-2">
                <PulseBlock className="h-6 w-20 rounded-full" />
                <PulseBlock className="h-6 w-24 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

// ── Vendor storefront ──
// Mirrors the common shape shared by all storefront templates in
// app/v/[slug]/page.tsx: logo/name/rating header row -> banner carousel
// -> product grid. Individual templates vary further, but this common
// skeleton is a far closer match than a bare banner+grid with no vendor
// identity row at all.
export function StoreLoadingSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-2 py-6 sm:px-4 sm:py-8">
      <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
        <PulseCircle className="h-16 w-16 shrink-0 sm:h-20 sm:w-20" />
        <div className="min-w-0 flex-1 space-y-2">
          <PulseBlock className="h-6 w-2/3 max-w-xs" />
          <PulseBlock className="h-3 w-1/3 max-w-[10rem]" />
          <div className="flex gap-2">
            <PulseBlock className="h-8 w-24 rounded-full" />
            <PulseBlock className="h-8 w-24 rounded-full" />
          </div>
        </div>
      </div>

      <PulseBlock className="h-44 w-full rounded-2xl sm:h-56" />

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

// ── Product details ──
// Mirrors app/v/[slug]/[productSlug]/page.tsx: media gallery + sticky
// info column (sold-by row, title, rating, price+stock, description,
// product-info table, vendor card, CTA buttons) -> reviews -> more-from-
// vendor carousel -> related-products carousel.
export function ProductDetailsLoadingSkeleton() {
  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 xl:gap-20">
          <div className="space-y-3">
            <PulseBlock className="aspect-square w-full rounded-2xl" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <PulseBlock key={index} className="h-16 w-16 shrink-0 rounded-xl" />
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <PulseBlock className="h-3 w-28" />
              <div className="flex gap-2">
                <PulseBlock className="h-8 w-8 rounded-full" />
                <PulseBlock className="h-8 w-8 rounded-full" />
              </div>
            </div>
            <PulseBlock className="h-9 w-full max-w-sm sm:h-11" />
            <PulseBlock className="mt-3 h-4 w-32" />
            <div className="mt-5 flex gap-3">
              <PulseBlock className="h-9 w-32" />
              <PulseBlock className="h-8 w-28 rounded-full" />
            </div>
            <PulseBlock className="my-5 h-px w-full bg-slate-100" />
            <PulseBlock className="h-4 w-full" />
            <PulseBlock className="mt-2 h-4 w-5/6" />
            <PulseBlock className="mt-2 h-4 w-2/3" />
            <div className="mt-5 rounded-xl border border-stone-200 bg-stone-50/60 p-4">
              <PulseBlock className="h-3 w-32" />
              <div className="mt-3 grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <PulseBlock key={index} className="h-3.5 w-full" />
                ))}
              </div>
            </div>
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-stone-100 bg-white p-4 shadow-sm">
              <PulseCircle className="h-10 w-10 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <PulseBlock className="h-4 w-1/2" />
                <PulseBlock className="h-3 w-1/3" />
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <PulseBlock className="h-11 flex-1 rounded-md" />
              <PulseBlock className="h-11 flex-1 rounded-md sm:flex-initial sm:w-40" />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-4 sm:px-6">
        <PulseBlock className="h-40 w-full rounded-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <PulseBlock className="h-6 w-48" />
        <div className="mt-4 flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="w-52 shrink-0 rounded-2xl border border-slate-200 p-2">
              <PulseBlock className="h-32 w-full rounded-xl" />
              <PulseBlock className="mt-2 h-3.5 w-3/4" />
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
        <PulseBlock className="h-6 w-56" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 p-2">
              <PulseBlock className="h-32 w-full rounded-xl" />
              <PulseBlock className="mt-2 h-3.5 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Dashboard: overview ──
// Mirrors app/dashboard/page.tsx: greeting header -> 4 stat cards -> revenue
// chart + order-status chart.
export function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-white via-emerald-50 to-amber-50 p-5 shadow-sm sm:p-6">
        <PulseBlock className="h-3 w-20 bg-white/70" />
        <PulseBlock className="mt-2 h-7 w-2/3 max-w-sm bg-white/70" />
        <PulseBlock className="mt-2 h-3 w-1/2 max-w-xs bg-white/70" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <PulseBlock key={index} className="h-24 w-full" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <PulseBlock className="h-72 w-full" />
        <PulseBlock className="h-72 w-full" />
      </div>
    </div>
  );
}

// ── Dashboard: products ──
// Mirrors app/dashboard/products/page.tsx + ProductsManager's card grid
// (sm:2 xl:3 columns).
export function DashboardProductsLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <PulseBlock className="h-3 w-16" />
        <PulseBlock className="mt-2 h-7 w-1/2 max-w-xs" />
        <PulseBlock className="mt-2 h-3 w-2/3 max-w-sm" />
      </div>
      <div className="flex justify-end">
        <PulseBlock className="h-10 w-36 rounded-lg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-slate-200 bg-white p-3">
            <PulseBlock className="h-36 w-full rounded-lg" />
            <PulseBlock className="mt-3 h-4 w-3/4" />
            <PulseBlock className="mt-1.5 h-3 w-1/2" />
            <div className="mt-3 flex gap-2">
              <PulseBlock className="h-8 w-full rounded-lg" />
              <PulseBlock className="h-8 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Dashboard: orders ──
// Mirrors app/dashboard/orders/page.tsx: header -> 4 stat cards -> stacked
// order-row list.
export function DashboardOrdersLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <PulseBlock className="h-3 w-14" />
        <PulseBlock className="mt-2 h-7 w-2/3 max-w-sm" />
        <PulseBlock className="mt-2 h-3 w-full max-w-md" />
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <PulseBlock key={index} className="h-20 w-full" />
        ))}
      </div>
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1.5">
                <PulseBlock className="h-4 w-40" />
                <PulseBlock className="h-3 w-24" />
              </div>
              <PulseBlock className="h-6 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Dashboard: analytics ──
// Mirrors app/dashboard/analytics/page.tsx: header -> 4 stat cards -> 4
// chart panels (2x2).
export function DashboardAnalyticsLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <PulseBlock className="h-3 w-20" />
        <PulseBlock className="mt-2 h-7 w-1/2 max-w-xs" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <PulseBlock key={index} className="h-24 w-full" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <PulseBlock key={index} className="h-64 w-full" />
        ))}
      </div>
    </div>
  );
}

// ── Dashboard: storefront settings ──
// Mirrors app/dashboard/v/page.tsx + StoreSetupForm: header -> a single
// large form panel (image upload row, several field rows, template picker
// grid).
export function DashboardStoreLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <PulseBlock className="h-3 w-32" />
        <PulseBlock className="mt-2 h-7 w-2/3 max-w-sm" />
        <PulseBlock className="mt-2 h-3 w-full max-w-md" />
      </div>
      <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <PulseCircle className="h-20 w-20 shrink-0" />
          <PulseBlock className="h-10 w-40 rounded-lg" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index}>
              <PulseBlock className="h-3 w-20" />
              <PulseBlock className="mt-2 h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
        <div>
          <PulseBlock className="h-3 w-32" />
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <PulseBlock key={index} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard: account settings ──
// Mirrors app/dashboard/account/page.tsx: header -> a single small form
// panel.
export function DashboardAccountLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <PulseBlock className="h-3 w-16" />
        <PulseBlock className="mt-2 h-7 w-1/2 max-w-xs" />
        <PulseBlock className="mt-2 h-3 w-2/3 max-w-sm" />
      </div>
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <PulseBlock className="h-3 w-24" />
          <PulseBlock className="mt-2 h-10 w-full max-w-sm rounded-lg" />
        </div>
        <PulseBlock className="h-10 w-28 rounded-lg" />
      </div>
    </div>
  );
}

// ── Dashboard: integrations ──
// Mirrors app/dashboard/integrations/page.tsx: header -> 4 stacked cards
// (WhatsApp linking, broadcasts, outbound bot trends, customer bot
// activity).
export function DashboardIntegrationsLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-white via-emerald-50 to-sky-50 p-5 shadow-sm sm:p-6">
        <PulseBlock className="h-3 w-24 bg-white/70" />
        <PulseBlock className="mt-2 h-7 w-2/3 max-w-sm bg-white/70" />
        <PulseBlock className="mt-2 h-3 w-full max-w-md bg-white/70" />
      </div>
      {Array.from({ length: 4 }).map((_, index) => (
        <PulseBlock key={index} className="h-40 w-full rounded-xl" />
      ))}
    </div>
  );
}