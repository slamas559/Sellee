"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";

const HIDDEN_FOOTER_ROUTES = ["/login", "/register"];

export function ConditionalFooter() {
  const pathname = usePathname();
  const shouldHideFooter = HIDDEN_FOOTER_ROUTES.some((route) =>
    pathname?.startsWith(route),
  );

  if (shouldHideFooter) {
    return null;
  }

  return <SiteFooter />;
}

