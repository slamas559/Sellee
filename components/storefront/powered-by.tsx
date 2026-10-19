import { mainAppUrl } from "@/lib/store-url";
import { T } from "@/lib/storefront-theme";

/**
 * Small attribution line at the bottom of every vendor storefront. Uses the
 * template's design tokens, so it reads correctly on light and dark templates
 * and never competes with the vendor's own branding.
 */
export function PoweredBySellee({ className = "" }: { className?: string }) {
  return (
    <footer className={`border-t ${T.line} px-4 py-5 text-center text-[11px] tracking-wide ${T.muted} ${className}`}>
      <a
        href={mainAppUrl("/?ref=powered-by")}
        target="_blank"
        rel="noopener"
        className="inline-flex items-center gap-1 transition hover:text-[color:var(--s-ink)]"
      >
        Powered by <span className="font-semibold text-[color:var(--s-ink)]">Sellee</span>
      </a>
    </footer>
  );
}
