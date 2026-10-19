import Image from "next/image";
import Link from "next/link";
import { MessageCircle, Search } from "lucide-react";
import { FollowStoreButton } from "@/components/store/follow-store-button";
import { SocialShareActions } from "@/components/shared/social-share-actions";
import { CurrencySwitcher } from "@/components/marketplace/currency-switcher";
import { T } from "@/lib/storefront-theme";
import { SORT_OPTIONS, type SortKey, type TemplateProps } from "./types";

// ─── URL helper ─────────────────────────────────────────────────────────────

type Filters = { q?: string; category?: string; sort?: SortKey };

export function buildHref(base: string, filters: Filters) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

// ─── Search ─────────────────────────────────────────────────────────────────

export function SearchForm({
  action,
  query,
  category,
  sort,
  placeholder = "Search this store",
  variant = "pill",
  className = "",
}: {
  action: string;
  query: string;
  category: string;
  sort: SortKey;
  placeholder?: string;
  variant?: "pill" | "underline" | "box";
  className?: string;
}) {
  const shape =
    variant === "pill"
      ? `rounded-full border ${T.line} bg-white px-4`
      : variant === "box"
        ? `${T.r} border ${T.line} bg-white px-3`
        : "border-b border-[color:var(--s-ink)] bg-transparent px-0";
  return (
    <form action={action} role="search" className={`flex items-center gap-2 ${className}`}>
      <label className={`flex min-w-0 flex-1 items-center gap-2 py-2 text-sm ${shape} focus-within:ring-2 focus-within:ring-[color:var(--s-primary)]/40`}>
        <Search className={`h-4 w-4 shrink-0 ${T.muted}`} aria-hidden="true" />
        <input
          name="q"
          defaultValue={query}
          placeholder={placeholder}
          aria-label={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[color:var(--s-muted)]"
        />
      </label>
      {category ? <input type="hidden" name="category" value={category} /> : null}
      {sort !== "newest" ? <input type="hidden" name="sort" value={sort} /> : null}
      <button type="submit" className="sr-only">Search</button>
    </form>
  );
}

// ─── Categories ─────────────────────────────────────────────────────────────

export function CategoryNav({
  base,
  categories,
  selected,
  query,
  sort,
  variant = "pill",
  counts,
  total,
  className = "",
}: {
  base: string;
  categories: string[];
  selected: string;
  query: string;
  sort: SortKey;
  variant?: "pill" | "text" | "box" | "list";
  /** list variant: product count per category. */
  counts?: Record<string, number>;
  total?: number;
  className?: string;
}) {
  if (categories.length === 0) return null;
  const items = [{ label: "All", value: "" }, ...categories.map((c) => ({ label: c, value: c }))];

  if (variant === "list") {
    return (
      <nav aria-label="Categories" className={`flex flex-col ${className}`}>
        {items.map((item) => {
          const active = selected === item.value;
          const count = item.value ? counts?.[item.value] : total;
          return (
            <Link
              key={item.label}
              href={buildHref(base, { q: query, category: item.value, sort })}
              aria-current={active ? "page" : undefined}
              className={`flex items-baseline justify-between gap-3 border-b py-2 text-sm uppercase tracking-wide transition ${T.line} ${
                active ? "font-bold" : "text-[color:var(--s-muted)] hover:text-[color:var(--s-ink)]"
              }`}
            >
              <span className="truncate">{active ? "— " : ""}{item.label}</span>
              {typeof count === "number" ? <span className="text-xs tabular-nums opacity-70">{count}</span> : null}
            </Link>
          );
        })}
      </nav>
    );
  }

  const itemClass = (active: boolean) => {
    if (variant === "text") {
      return `shrink-0 border-b py-2 text-[11px] font-medium uppercase tracking-[0.2em] transition ${
        active ? "border-[color:var(--s-ink)]" : "border-transparent text-[color:var(--s-muted)] hover:text-[color:var(--s-ink)]"
      }`;
    }
    const shape = variant === "pill" ? "rounded-full" : T.r;
    return `shrink-0 ${shape} border px-3.5 py-1.5 text-xs font-semibold transition ${
      active
        ? `${T.primary} border-transparent`
        : `${T.line} bg-white hover:border-[color:var(--s-primary)]`
    }`;
  };

  return (
    <nav aria-label="Categories" className={`flex gap-2 overflow-x-auto [scrollbar-width:none] ${variant === "text" ? "gap-6" : ""} ${className}`}>
      {items.map((item) => {
        const active = selected === item.value;
        return (
          <Link
            key={item.label}
            href={buildHref(base, { q: query, category: item.value, sort })}
            aria-current={active ? "page" : undefined}
            className={itemClass(active)}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SortLinks({
  base,
  query,
  category,
  sort,
  className = "",
}: {
  base: string;
  query: string;
  category: string;
  sort: SortKey;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-1 overflow-x-auto text-xs [scrollbar-width:none] ${className}`} aria-label="Sort products">
      <span className={`mr-1 shrink-0 ${T.muted}`}>Sort</span>
      {SORT_OPTIONS.map((o) => (
        <Link
          key={o.key}
          href={buildHref(base, { q: query, category, sort: o.key })}
          aria-current={sort === o.key ? "true" : undefined}
          className={`shrink-0 ${T.r} px-2.5 py-1 font-semibold transition ${
            sort === o.key ? `${T.primary}` : `${T.card} border ${T.line} hover:border-[color:var(--s-primary)]`
          }`}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}

// ─── Identity + actions ─────────────────────────────────────────────────────

export function StoreLogo({
  store,
  size = 40,
  className = "",
}: {
  store: Pick<TemplateProps["store"], "name" | "logo_url">;
  size?: number;
  className?: string;
}) {
  return store.logo_url ? (
    <span className={`relative inline-block shrink-0 overflow-hidden ${className}`} style={{ width: size, height: size }}>
      <Image src={store.logo_url} alt={`${store.name} logo`} fill sizes={`${size}px`} className="object-cover" />
    </span>
  ) : (
    <span
      className={`inline-flex shrink-0 items-center justify-center font-bold ${T.primary} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {store.name.charAt(0).toUpperCase()}
    </span>
  );
}

export function ChatButton({
  href,
  label,
  className = "",
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 text-sm font-bold transition hover:opacity-90 ${T.primary} ${className}`}
    >
      <MessageCircle className="h-4 w-4" aria-hidden="true" />
      {label}
    </a>
  );
}

export function FollowAndShare({
  p,
  compact = true,
  shareClassName,
  upper = false,
  heavy = false,
}: {
  p: Pick<TemplateProps, "store" | "follow" | "storeUrl">;
  compact?: boolean;
  shareClassName?: string;
  /** Uppercase, letter-spaced label (editorial / streetwear / lookbook). */
  upper?: boolean;
  /** 2px ink borders (streetwear). */
  heavy?: boolean;
}) {
  const followClass = [upper ? "uppercase tracking-[0.15em]" : "", heavy ? "!border-2 !border-[color:var(--s-ink)]" : ""].join(" ").trim();
  const shareBase = `inline-flex h-8 w-8 items-center justify-center rounded-[var(--s-r)] border bg-[var(--s-card)] text-[color:var(--s-ink)] transition hover:border-[color:var(--s-primary)] ${
    heavy ? "border-2 border-[color:var(--s-ink)]" : T.line
  }`;
  return (
    <div className="flex items-center gap-2">
      <FollowStoreButton
        storeId={p.store.id}
        storeSlug={p.store.slug}
        isLoggedIn={p.follow.isLoggedIn}
        isOwner={p.follow.isOwner}
        initialFollowing={p.follow.isFollowing}
        compact={compact}
        themed
        className={followClass}
      />
      <SocialShareActions
        mode="menu"
        compact
        url={p.storeUrl}
        title={p.store.name}
        text={`Shop at ${p.store.name}.`}
        triggerLabel="Share"
        triggerClassName={shareClassName ?? shareBase}
      />
    </div>
  );
}

export function TrustLine({
  rating,
  ratingCount,
  orders,
  products,
  className = "",
}: {
  rating: number | null;
  ratingCount: number;
  orders: number;
  products?: number;
  className?: string;
}) {
  const parts: string[] = [];
  if (rating && ratingCount > 0) parts.push(`★ ${rating.toFixed(1)} (${ratingCount} review${ratingCount === 1 ? "" : "s"})`);
  if (orders > 0) parts.push(`${orders} order${orders === 1 ? "" : "s"} delivered`);
  if (typeof products === "number") parts.push(`${products} product${products === 1 ? "" : "s"}`);
  if (parts.length === 0) return null;
  return <p className={`text-xs ${className}`}>{parts.join("  ·  ")}</p>;
}

export function CurrencyRow({ currencies }: { currencies: string[] }) {
  if (currencies.length === 0) return null;
  return <CurrencySwitcher activatedCurrencies={currencies} />;
}

export function EmptyProducts({
  isFiltered,
  clearHref,
}: {
  isFiltered: boolean;
  clearHref: string;
}) {
  return (
    <div className={`border border-dashed ${T.line} ${T.card} ${T.r} px-6 py-16 text-center`}>
      <p className="text-sm font-semibold">
        {isFiltered ? "Nothing matches that search." : "This store hasn't listed anything yet."}
      </p>
      {isFiltered ? (
        <Link href={clearHref} className={`mt-3 inline-block text-sm font-semibold underline underline-offset-4 ${T.primaryText}`}>
          Clear filters
        </Link>
      ) : (
        <p className={`mt-1 text-xs ${T.muted}`}>Check back soon, or message the vendor on WhatsApp.</p>
      )}
    </div>
  );
}
