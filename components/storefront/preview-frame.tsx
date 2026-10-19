"use client";

import { useEffect, useState } from "react";
import { STOREFRONT_TEMPLATES } from "@/components/storefront/registry";
import { ThemeScope } from "@/components/storefront/theme-scope";
import type { PreviewPayload } from "@/lib/storefront-samples";

/**
 * Lives at /store-preview and is shown inside an iframe, so the real
 * templates respond to the frame's width (a 390px frame gets the true mobile
 * layout). It receives its data from the parent window via postMessage and
 * blocks all navigation: this is a preview, nothing should open or submit.
 */
export function PreviewFrame() {
  const [payload, setPayload] = useState<PreviewPayload | null>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; payload?: PreviewPayload } | null;
      if (data?.type === "sellee-preview" && data.payload) setPayload(data.payload);
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const el = target?.closest("a, button");
      if (!el) return;
      event.preventDefault();
      event.stopPropagation();
      const href = el.getAttribute("href") ?? "";
      if (el.tagName === "A" && href.startsWith("#") && href.length > 1) {
        document.getElementById(href.slice(1))?.scrollIntoView({ behavior: "smooth" });
      }
    };
    const onSubmit = (event: Event) => event.preventDefault();

    window.addEventListener("message", onMessage);
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    window.parent?.postMessage({ type: "sellee-preview-ready" }, window.location.origin);
    return () => {
      window.removeEventListener("message", onMessage);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, []);

  // Reset scroll when the template changes so each layout is seen from the top.
  const template = payload?.template;
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [template]);

  if (!payload) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-sm text-slate-500">
        Loading preview…
      </div>
    );
  }

  const Template = STOREFRONT_TEMPLATES[payload.template];
  return (
    <ThemeScope template={payload.template} primary={payload.primary}>
      <Template {...payload.props} />
    </ThemeScope>
  );
}
