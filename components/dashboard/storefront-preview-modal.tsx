"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Info, Lock, Monitor, Smartphone, X } from "lucide-react";
import type { PreviewPayload } from "@/lib/storefront-samples";
import type { TemplateKey } from "@/lib/storefront-theme";

export type PreviewTemplateOption = { key: TemplateKey; label: string; locked: boolean };

type Props = {
  open: boolean;
  payload: PreviewPayload | null;
  templates: PreviewTemplateOption[];
  /** The template currently saved/selected in the form. */
  selectedTemplate: TemplateKey;
  onClose: () => void;
  onTemplateChange: (key: TemplateKey) => void;
  onUse: (key: TemplateKey) => void;
};

type Device = "desktop" | "phone";

function sampleSummary(s: PreviewPayload["sample"]): string | null {
  const parts: string[] = [];
  if (s.storeName) parts.push("store name");
  if (s.logo) parts.push("logo");
  if (s.hero) parts.push("hero image");
  if (s.banner) parts.push("banner");
  if (s.products > 0) parts.push(`${s.products} product${s.products === 1 ? "" : "s"}`);
  if (s.copy) parts.push("headline text");
  if (s.ratings) parts.push("ratings and order counts");
  return parts.length > 0 ? parts.join(", ") : null;
}

/**
 * Full-size preview of the REAL storefront template. The template runs inside
 * an iframe pointed at /store-preview, so the Phone view gets the genuine
 * mobile layout, not a scaled-down desktop page.
 */
export function StorefrontPreviewModal({ open, payload, templates, selectedTemplate, onClose, onTemplateChange, onUse }: Props) {
  const [device, setDevice] = useState<Device>("desktop");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  const latest = useRef<PreviewPayload | null>(payload);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    latest.current = payload;
  }, [payload]);

  const post = useCallback(() => {
    if (!readyRef.current || !latest.current) return;
    iframeRef.current?.contentWindow?.postMessage({ type: "sellee-preview", payload: latest.current }, window.location.origin);
  }, []);

  // Handshake: the frame announces it is ready, then we send the payload.
  useEffect(() => {
    if (!open) return;
    readyRef.current = false;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      if ((event.data as { type?: string } | null)?.type === "sellee-preview-ready") {
        readyRef.current = true;
        post();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [open, post]);

  // Re-send whenever the data (template, colour, products…) changes.
  useEffect(() => {
    if (open) post();
  }, [open, payload, post]);

  // Esc to close, lock page scroll, move focus into the dialog.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !payload) return null;

  const active = templates.find((t) => t.key === payload.template);
  const locked = Boolean(active?.locked);
  const isSelected = payload.template === selectedTemplate;
  const summary = sampleSummary(payload.sample);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/85 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Storefront preview">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/10 bg-slate-900 px-3 py-2.5 text-white sm:px-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">Preview</p>
          <p className="truncate text-sm font-bold">{active?.label ?? "Template"}</p>
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-300">
          <span className="hidden sm:inline">Template</span>
          <select
            value={payload.template}
            onChange={(e) => onTemplateChange(e.target.value as TemplateKey)}
            className="rounded-md border border-white/20 bg-slate-800 px-2 py-1.5 text-sm text-white"
          >
            {templates.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
                {t.locked ? " (Pro / Business)" : ""}
              </option>
            ))}
          </select>
        </label>

        <div className="flex rounded-lg border border-white/15 p-0.5" role="group" aria-label="Preview device">
          {(
            [
              { key: "desktop", label: "Desktop", Icon: Monitor },
              { key: "phone", label: "Phone", Icon: Smartphone },
            ] as const
          ).map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setDevice(key)}
              aria-pressed={device === key}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${device === key ? "bg-white text-slate-900" : "text-slate-300 hover:bg-white/10"}`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {locked ? (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-400/15 px-3 py-1.5 text-xs font-semibold text-amber-200">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Preview only &middot; Pro and Business
              </span>
              <a
                href="/dashboard/plans"
                target="_blank"
                rel="noopener"
                className="rounded-md bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-900 hover:bg-amber-300"
              >
                See plans
              </a>
            </>
          ) : isSelected ? (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-400/15 px-3 py-1.5 text-xs font-semibold text-emerald-200">
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> Currently selected
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                onUse(payload.template);
                onClose();
              }}
              className="rounded-md bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-400"
            >
              Use this template
            </button>
          )}
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close preview" className="rounded-md p-2 text-slate-300 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {summary ? (
        <div className="flex items-start gap-2 bg-amber-50 px-4 py-2 text-xs text-amber-900">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <p>
            <span className="font-semibold">Sample content shown:</span> {summary}. These are placeholders so you can judge the layout, and images tagged “SAMPLE” are not real. Add your own and they replace these automatically.
          </p>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 justify-center overflow-hidden p-2 sm:p-5">
        <div
          className={
            device === "desktop"
              ? "h-full w-full max-w-[1500px] overflow-hidden rounded-xl bg-white shadow-2xl"
              : "h-full max-h-[860px] w-[390px] max-w-full overflow-hidden rounded-[2rem] border-[10px] border-slate-900 bg-white shadow-2xl"
          }
        >
          <iframe ref={iframeRef} src="/store-preview" title="Storefront preview" className="h-full w-full border-0 bg-white" />
        </div>
      </div>
    </div>
  );
}
