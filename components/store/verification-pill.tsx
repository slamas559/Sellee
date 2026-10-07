import { Award, BadgeCheck, ShieldCheck } from "lucide-react";
import { TIER_LABEL, type VerificationTier } from "@/lib/verification-tier-constants";

const STYLE: Record<Exclude<VerificationTier, "none">, { pill: string; icon: typeof BadgeCheck }> = {
  verified: { pill: "bg-emerald-50 text-emerald-700 ring-emerald-200", icon: BadgeCheck },
  trusted: { pill: "bg-sky-50 text-sky-700 ring-sky-200", icon: ShieldCheck },
  top_seller: { pill: "bg-amber-50 text-amber-700 ring-amber-200", icon: Award },
};

type VerificationPillProps = {
  tier: VerificationTier | null | undefined;
  className?: string;
};

/** Tier badge for a store. Renders nothing for stores without a badge. */
export function VerificationPill({ tier, className = "" }: VerificationPillProps) {
  if (!tier || tier === "none") return null;

  const { pill, icon: Icon } = STYLE[tier];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${pill} ${className}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {TIER_LABEL[tier]}
    </span>
  );
}
