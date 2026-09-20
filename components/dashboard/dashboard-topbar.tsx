import Link from "next/link";
import { ExternalLink, MapPin, Store } from "lucide-react";
import type { StoreRecord } from "@/types";

type DashboardTopbarProps = {
  name?: string | null;
  store: StoreRecord | null;
};

export function DashboardTopbar({ name, store }: DashboardTopbarProps) {
  const location = [store?.city, store?.state].filter(Boolean).join(", ");

  return (
    <header className="sticky top-0 z-40 hidden h-[72px] items-center border-b border-slate-200/80 bg-white/95 px-8 backdrop-blur lg:flex xl:px-10">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <Store className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{store?.name ?? "Your store"}</p>
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {location || "Add your store location"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {store?.slug ? (
            <Link
              href={`/v/${store.slug}`}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3.5 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50"
            >
              View store <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : (
            <Link href="/dashboard/store" className="rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
              Set up store
            </Link>
          )}
          <div className="hidden border-l border-slate-200 pl-3 xl:block">
            <p className="text-xs text-slate-500">Signed in as</p>
            <p className="max-w-36 truncate text-sm font-semibold text-slate-800">{name ?? "Vendor"}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
