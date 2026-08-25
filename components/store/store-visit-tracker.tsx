"use client";

import { useEffect, useRef } from "react";

export function StoreVisitTracker({
  storeId,
  productId,
  isOwnerViewing,
}: {
  storeId: string;
  productId?: string | null;
  isOwnerViewing: boolean;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || isOwnerViewing || !storeId) return;
    fired.current = true;

    const payload = JSON.stringify({
      storeId,
      productId: productId ?? null,
      path: window.location.pathname,
      referrer: document.referrer || null,
    });

    try {
      const blob = new Blob([payload], { type: "application/json" });
      const sent = navigator.sendBeacon?.("/api/track/visit", blob);
      if (!sent) {
        // Fallback for browsers without sendBeacon support.
        fetch("/api/track/visit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Never let tracking failures affect the storefront.
    }
  }, [storeId, productId, isOwnerViewing]);

  return null;
}