"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Link2,
  MessageCircle,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Store,
} from "lucide-react";
import { Reveal } from "./reveal";

const CATEGORIES = [
  {
    label: "Gadgets",
    icon: Smartphone,
    gradient: "from-sky-600 to-indigo-800",
    products: [
      { name: "Wireless earbuds", price: "₦12,500", image: "/become-vendor/preview/earbuds.png" },
      { name: "Phone case", price: "₦3,000", image: "/become-vendor/preview/phone-case.jpg" },
    ],
  },
  {
    label: "Fashion",
    icon: Shirt,
    gradient: "from-rose-500 to-fuchsia-800",
    products: [
      { name: "Ankara tote", price: "₦9,500", image: "/become-vendor/preview/ankara-tote.jpg" },
      { name: "Canvas sneakers", price: "₦25,000", image: "/become-vendor/preview/sneakers.jpg" },
    ],
  },
  {
    label: "Groceries",
    icon: ShoppingBasket,
    gradient: "from-emerald-500 to-teal-800",
    products: [
      { name: "Rice, 50kg", price: "₦78,000", image: "/become-vendor/preview/rice.jpg" },
      { name: "Fresh tomatoes", price: "₦4,500", image: "/become-vendor/preview/tomatoes.jpg" },
    ],
  },
  {
    label: "Other",
    icon: Store,
    gradient: "from-amber-500 to-orange-700",
    products: [
      { name: "Shea body butter", price: "₦3,500", image: "/become-vendor/preview/shea-butter.jpg" },
      { name: "Scented candle", price: "₦5,000", image: "/become-vendor/preview/candle.jpg" },
    ],
  },
];

function toSlug(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 24);
}

/** Type a store name, pick a category, and watch a sample storefront build itself. Nothing is saved. */
export function StorePreview() {
  const [name, setName] = useState("");
  const [categoryIndex, setCategoryIndex] = useState(0);

  const category = CATEGORIES[categoryIndex];
  const CategoryIcon = category.icon;
  const displayName = name.trim() || "Your Store";
  const slug = toSlug(displayName) || "yourstore";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <section className="mt-20 grid items-center gap-10 sm:mt-28 md:grid-cols-2 md:gap-14">
      <Reveal>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
          Try it now
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
          See your store before you build it.
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
          Type your store name and pick what you sell. This is a preview only, and nothing is
          saved.
        </p>

        <label htmlFor="bv-store-name" className="mt-6 block text-xs font-bold text-slate-700">
          Store name
        </label>
        <input
          id="bv-store-name"
          type="text"
          value={name}
          maxLength={30}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Ola's Gadgets"
          className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />

        <p className="mt-5 text-xs font-bold text-slate-700">What do you sell?</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATEGORIES.map(({ label, icon: Icon }, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setCategoryIndex(i)}
              aria-pressed={i === categoryIndex}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                i === categoryIndex
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        <Link
          href="/become-vendor/setup"
          className="group mt-7 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400"
        >
          Claim this store
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </Link>
      </Reveal>

      <Reveal delay={120}>
        <div className="mx-auto w-full max-w-sm">
          <div className="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
            <div className={`h-24 bg-gradient-to-br transition-colors ${category.gradient}`} />
            <div className="-mt-8 px-5 pb-5">
              <div className="flex items-end gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-white bg-emerald-600 text-2xl font-black text-white shadow">
                  {initial}
                </div>
                <div className="min-w-0 pb-1">
                  <p
                    key={displayName}
                    className="bv-fade-up truncate text-lg font-black text-slate-900"
                  >
                    {displayName}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-slate-500">
                    <CategoryIcon className="h-3 w-3" /> {category.label}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {category.products.map((product) => (
                  <div key={`${categoryIndex}-${product.name}`} className="bv-fade-up">
                    <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-100">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          sizes="(max-width: 640px) 45vw, 180px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-400">
                          <CategoryIcon className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    <p className="mt-1.5 truncate text-xs font-semibold text-slate-800">
                      {product.name}
                    </p>
                    <p className="text-xs font-bold text-emerald-700">{product.price}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white">
                <MessageCircle className="h-4 w-4" /> Order on WhatsApp
              </div>
            </div>
          </div>

          <p className="mt-3 flex items-center justify-center gap-1.5 font-mono text-xs text-slate-500">
            <Link2 className="h-3.5 w-3.5" /> sellee.store/v/{slug}
          </p>
          <p className="mt-1 text-center text-[11px] text-slate-400">
            Sample products. You&apos;ll add your own after setup.
          </p>
        </div>
      </Reveal>
    </section>
  );
}