"use client";

import { usePathname } from "next/navigation";
import { AiShoppingAssistant } from "@/components/marketplace/ai-shopping-assistant";

// Only customer-facing/browsing surfaces get the shopping assistant. It
// stays off vendor dashboards, admin, auth, and the WhatsApp-linked flows,
// since it's read-only marketplace search, not a vendor/admin tool.
// Only customer-facing/browsing surfaces get the shopping assistant. It
// stays off vendor dashboards, admin, and auth flows, since it's read-only
// marketplace search, not a vendor/admin tool. Note: this deliberately does
// NOT include "/vendors" (plural) - that's the public, customer-facing
// vendor directory, not the vendor's own dashboard.
const HIDDEN_ROUTES = ["/dashboard", "/admin", "/login", "/register"];

export function ConditionalAiAssistant() {
  const pathname = usePathname();
  const shouldHide = HIDDEN_ROUTES.some((route) => pathname?.startsWith(route));

  if (shouldHide) {
    return null;
  }

  return <AiShoppingAssistant />;
}