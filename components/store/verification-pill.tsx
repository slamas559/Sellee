import { Award, BadgeCheck, ShieldCheck } from "lucide-react";
import { TIER_LABEL, type VerificationTier } from "@/lib/verification-tier-constants";

const STYLE: Record<
  Exclude<VerificationTier, "none">,
  { pill: string; icon: typeof BadgeCheck }
> = {
  verified: { pill: "bg-emerald-50 text-emerald-700 ring-emerald-200", icon: BadgeCheck },
  trusted: { pill: "bg-sky-50 text-sky-700 ring-sky-200", icon: ShieldCheck },
  top_seller: { pill: "bg-amber-50 text-amber-700 ring-amber-200", icon: Award },
};

// On a coloured storefront header the light pills would clash, so the tier is
// shown as a translucent white pill instead. The icon still tells tiers apart.
const ON_DARK_STYLE = "bg-white/15 text-white ring-white/30";

type VerificationPillProps = {
  tier: VerificationTier | null | undefined;
  /** "sm" fits inside product and vendor cards. */
  size?: "sm" | "md";
  /** Use on a coloured / dark background (e.g. the storefront hero). */
  onDark?: boolean;
  className?: string;
};

/** Tier badge for a store. Renders nothing for stores without a badge. */
export function VerificationPill({ tier, size = "md", onDark = false, className = "" }: VerificationPillProps) {
  if (!tier || tier === "none") return null;

  const { pill, icon: Icon } = STYLE[tier];
  const sizing = size === "sm" ? "gap-0.5 px-1.5 py-px text-[10px]" : "gap-1 px-2.5 py-0.5 text-xs";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    // normal-case / tracking-normal: cards that uppercase their text shouldn't shout the badge too.
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full font-semibold normal-case tracking-normal ring-1 ring-inset ${sizing} ${onDark ? ON_DARK_STYLE : pill} ${className}`}
    >
      <Icon className={iconSize} aria-hidden="true" />
      {TIER_LABEL[tier]}
    </span>
  );
}
