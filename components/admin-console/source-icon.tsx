import { Globe, HelpCircle, Link2, MessageCircle, Play, Search, Share2, Store } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Deliberately generic pictograms tinted with a brand-associated color,
// not reproductions of actual brand logos/marks - avoids any trademark
// concern while still being instantly readable at a glance.
const SOURCE_META: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  whatsapp: { label: "WhatsApp", icon: MessageCircle, color: "#25D366" },
  google: { label: "Google", icon: Search, color: "#4285F4" },
  bing: { label: "Bing", icon: Search, color: "#008373" },
  duckduckgo: { label: "DuckDuckGo", icon: Search, color: "#DE5833" },
  youtube: { label: "YouTube", icon: Play, color: "#FF0000" },
  meta: { label: "Facebook/Instagram", icon: Share2, color: "#1877F2" },
  tiktok: { label: "TikTok", icon: Share2, color: "#000000" },
  twitter: { label: "X / Twitter", icon: Share2, color: "#14171A" },
  sellee: { label: "Sellee (internal)", icon: Store, color: "#16a34a" },
  direct: { label: "Direct", icon: Link2, color: "#6b6559" },
  other: { label: "Other", icon: HelpCircle, color: "#6b6559" },
};

export function sourceLabel(source: string): string {
  return SOURCE_META[source]?.label ?? source;
}

export function SourceIcon({ source, size = 14 }: { source: string; size?: number }) {
  const meta = SOURCE_META[source] ?? { label: source, icon: Globe, color: "#6b6559" };
  const Icon = meta.icon;
  return <Icon size={size} color={meta.color} strokeWidth={2} aria-hidden="true" />;
}