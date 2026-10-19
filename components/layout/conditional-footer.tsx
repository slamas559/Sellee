"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";

const HIDDEN_FOOTER_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password","/map", "/admin-console", "/dashboard", "/store-preview"];

export function ConditionalFooter() {
  const pathname = usePathname();
  // Same rule as SiteHeader: the vendor's storefront home is the vendor's own
  // branded page, so no Sellee navigation or footer there (a small
  // "Powered by Sellee" line is rendered by the storefront itself). Product
  // pages and profiles keep the site chrome.
  const segments = (pathname ?? "").split("/").filter(Boolean);
  const isVendorStoreHome =
    (segments[0] === "v" || segments[0] === "store") && segments.length === 2;
  const shouldHideFooter =
    isVendorStoreHome ||
    HIDDEN_FOOTER_ROUTES.some((route) => pathname?.startsWith(route));

  if (shouldHideFooter) {
    return null;
  }

  return <SiteFooter />;
}
