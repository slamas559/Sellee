import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, ShieldCheck, Star, Truck } from "lucide-react";
import { getStorefrontPublicDataCached } from "@/lib/public-cache";
import { getVendorTrustStats, type SellerTier } from "@/lib/vendor-trust";
import { storeUrl } from "@/lib/store-url";
import { SellerProfileTabs } from "@/components/vendors/seller-profile-tabs";

type SellerProfilePageProps = {
  params: Promise<{ slug: string }>;
};

const TIER_LABEL: Record<SellerTier, string> = {
  new: "New Seller",
  trusted: "Trusted Seller",
  top_rated: "Top Rated Seller",
};

const TIER_STYLE: Record<SellerTier, string> = {
  new: "bg-slate-100 text-slate-600",
  trusted: "bg-emerald-100 text-emerald-700",
  top_rated: "bg-amber-100 text-amber-700",
};

export async function generateMetadata({ params }: SellerProfilePageProps): Promise<Metadata> {
  const { slug } = await params;
  const { store } = await getStorefrontPublicDataCached(slug);
  if (!store) return { title: "Seller not found" };
  return {
    title: `About ${store.name} — Sellee`,
    description: `Ratings, reviews, and seller history for ${store.name} on Sellee.`,
  };
}

export default async function SellerProfilePage({ params }: SellerProfilePageProps) {
  const { slug } = await params;
  const { store } = await getStorefrontPublicDataCached(slug);

  if (!store || !store.is_active) {
    notFound();
  }

  const trust = await getVendorTrustStats(store.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href={storeUrl(slug)} className="text-sm font-semibold text-emerald-700">
        ← Back to {store.name}
      </Link>

      <div className="mt-4 flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-slate-100">
          {store.logo_url ? (
            <Image src={store.logo_url} alt={store.name} fill sizes="64px" className="object-cover" />
          ) : null}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="truncate text-lg font-black text-slate-900">{store.name}</h1>
            {store.is_verified ? (
              <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Verified vendor" />
            ) : null}
          </div>
          {trust && (
            <span
              className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${TIER_STYLE[trust.tier]}`}
            >
              {TIER_LABEL[trust.tier]}
            </span>
          )}
        </div>
      </div>

      {trust && (
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 text-center">
            <Star className="mx-auto h-4 w-4 text-amber-500" />
            <p className="mt-1 text-lg font-black text-slate-900">
              {trust.ratingAvg > 0 ? trust.ratingAvg.toFixed(1) : "—"}
            </p>
            <p className="text-[11px] text-slate-400">{trust.ratingCount} ratings</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4 text-center">
            <Truck className="mx-auto h-4 w-4 text-emerald-600" />
            <p className="mt-1 text-lg font-black text-slate-900">{trust.deliveredOrderCount}</p>
            <p className="text-[11px] text-slate-400">orders delivered</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4 text-center">
            <ShieldCheck className="mx-auto h-4 w-4 text-indigo-600" />
            <p className="mt-1 text-[13px] font-black leading-tight text-slate-900">
              {trust.membershipLabel}
            </p>
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-sm font-bold text-slate-900">Reviews</h2>
        <div className="mt-3">
          <SellerProfileTabs
            storeId={store.id}
            storeSlug={slug}
            initialRatingAvg={trust?.ratingAvg ?? 0}
            initialRatingCount={trust?.ratingCount ?? 0}
          />
        </div>
      </div>
    </div>
  );
}