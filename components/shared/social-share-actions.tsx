"use client";

import { Copy, Share2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type SocialShareActionsProps = {
  url: string;
  title: string;
  text: string;
  compact?: boolean;
  mode?: "menu" | "inline";
  align?: "left" | "right";
  menuPosition?: "down" | "up";
  className?: string;
  triggerClassName?: string;
  triggerLabel?: string;
};

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#25D366" />
      <path d="M8.2 17.3l.7-2.4a5.8 5.8 0 1 1 2.5 1.1h-.1l-3.1 1.3z" fill="#fff" />
      <path d="M14.8 13.8c-.2.6-1.1 1-1.6 1-.4 0-.9.1-2.9-.8-2.4-1.1-3.9-3.7-4-3.8-.1-.2-1-1.2-1-2.4s.6-1.7.8-2c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .5.4.2.5.6 1.6.7 1.7.1.1.1.3 0 .5-.1.2-.2.3-.4.5-.2.2-.3.3-.5.5-.2.2-.3.3-.1.6.2.3.9 1.4 2 2.3 1.4 1.2 2.5 1.5 2.9 1.7.3.1.4.1.6-.1.2-.2.8-.8 1-1.1.2-.3.4-.2.6-.1.2.1 1.6.8 1.9 1 .2.1.4.2.4.3 0 .2 0 .9-.2 1.5z" fill="#25D366" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <rect width="24" height="24" rx="12" fill="#111827" />
      <path d="M7 6h3l3 4 3-4h3l-4.6 6 5 7h-3l-3.4-4.6L9.6 19h-3l4.7-6L7 6z" fill="#fff" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <rect width="24" height="24" rx="12" fill="#1877F2" />
      <path d="M13.4 20v-7h2.3l.3-2.7h-2.6V8.7c0-.8.2-1.4 1.4-1.4H16V5c-.2 0-1-.1-1.9-.1-1.9 0-3.2 1.2-3.2 3.3v2h-2V13h2v7h2.5z" fill="#fff" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#229ED9" />
      <path d="M17.3 6.9 6.8 10.9c-.7.3-.7.7-.1.9l2.7.8 1 3.2c.1.4.1.5.5.5.3 0 .5-.1.6-.3l1.5-1.5 3 2.2c.5.3.9.2 1-.5l1.8-8.8c.2-.8-.3-1.2-.9-1zM9.8 12.4l5.4-3.4c.3-.2.5-.1.3.1l-4.4 4-.2 2.2-1.1-2.9z" fill="#fff" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <rect width="24" height="24" rx="12" fill="#0A66C2" />
      <rect x="6" y="10" width="2.5" height="8" fill="#fff" />
      <circle cx="7.2" cy="7.7" r="1.3" fill="#fff" />
      <path d="M10.4 10h2.4v1.1h.1c.3-.6 1.2-1.3 2.5-1.3 2.7 0 3.2 1.8 3.2 4.1V18h-2.5v-3.7c0-.9 0-2-1.2-2-1.2 0-1.4 1-1.4 1.9V18h-2.5V10z" fill="#fff" />
    </svg>
  );
}

function openInNewTab(href: string) {
  if (typeof window === "undefined") return;
  window.open(href, "_blank", "noopener,noreferrer");
}

export function SocialShareActions({
  url,
  title,
  text,
  compact = false,
  mode = "menu",
  align = "right",
  menuPosition = "down",
  className,
  triggerClassName,
  triggerLabel = "Share",
}: SocialShareActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const shareUrl =
    typeof window !== "undefined" && url.startsWith("/")
      ? `${window.location.origin}${url}`
      : url;

  const encodedText = encodeURIComponent(`${text}\n${shareUrl}`);
  const encodedUrl = encodeURIComponent(shareUrl);

  const links = useMemo(
    () => ({
      whatsapp: `https://wa.me/?text=${encodedText}`,
      x: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodeURIComponent(text)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(text)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    }),
    [encodedText, encodedUrl, text],
  );

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: globalThis.MouseEvent) {
      const target = event.target as Node | null;
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  async function copyLink() {
    setError(null);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyState("copied");
      setIsOpen(false);
      setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setError("Could not copy link on this browser.");
    }
  }

  async function nativeShare() {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.share) {
      setError("Native share is not supported here.");
      return;
    }
    try {
      await navigator.share({ title, text, url: shareUrl });
      setIsOpen(false);
    } catch {
      // user cancelled
    }
  }

  const btnClass = compact
    ? "rounded-full border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
    : "rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50";
  const iconBtnClass = compact
    ? "inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
    : "inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100";
  const dropdownPositionClass = align === "left" ? "left-0" : "right-0";
  const dropdownOffsetClass = menuPosition === "up" ? "bottom-10" : "top-10";
  const dropdownWidthClass = compact
    ? "w-[min(11.5rem,calc(100vw-1rem))] sm:w-max"
    : "w-max max-w-[calc(100vw-1rem)]";
  const iconsWrapClass = compact
    ? "flex flex-wrap items-center justify-end gap-1.5"
    : "flex flex-nowrap items-center gap-1.5 whitespace-nowrap";
  const openShareTarget = (href: string) => {
    openInNewTab(href);
    setIsOpen(false);
  };

  if (mode === "menu") {
    return (
      <div ref={rootRef} className={`relative ${className ?? ""}`}>
        <button
          type="button"
          aria-label={triggerLabel}
          title={triggerLabel}
          onClick={() => setIsOpen((prev) => !prev)}
          className={
            triggerClassName ??
            "inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }
        >
          <Share2 className="h-3 w-3" />
        </button>
        {isOpen ? (
          <div className={`absolute ${dropdownPositionClass} ${dropdownOffsetClass} ${dropdownWidthClass} z-30 rounded-xl border border-slate-200 bg-white p-2 shadow-lg`}>
            <div className={iconsWrapClass}>
              <button type="button" onClick={() => openShareTarget(links.whatsapp)} className={iconBtnClass} title="WhatsApp">
                <WhatsAppIcon />
              </button>
              <button type="button" onClick={() => openShareTarget(links.x)} className={iconBtnClass} title="X">
                <XIcon />
              </button>
              <button type="button" onClick={() => openShareTarget(links.facebook)} className={iconBtnClass} title="Facebook">
                <FacebookIcon />
              </button>
              <button type="button" onClick={() => openShareTarget(links.telegram)} className={iconBtnClass} title="Telegram">
                <TelegramIcon />
              </button>
              <button type="button" onClick={() => openShareTarget(links.linkedin)} className={iconBtnClass} title="LinkedIn">
                <LinkedInIcon />
              </button>
              <button type="button" onClick={() => void copyLink()} className={iconBtnClass} title="Copy link">
                <Copy className="h-4 w-4" />
              </button>
              {"share" in navigator ? (
                <button type="button" onClick={() => void nativeShare()} className={iconBtnClass} title="Share">
                  <Share2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        {error ? <p className="mt-1 text-[11px] text-rose-600">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void nativeShare()} className={btnClass}>
          Share
        </button>
        <button type="button" onClick={() => void copyLink()} className={btnClass}>
          {copyState === "copied" ? "Copied" : "Copy link"}
        </button>
        <button type="button" onClick={() => openInNewTab(links.whatsapp)} className={btnClass}>
          WhatsApp
        </button>
        <button type="button" onClick={() => openInNewTab(links.x)} className={btnClass}>
          X
        </button>
        <button type="button" onClick={() => openInNewTab(links.facebook)} className={btnClass}>
          Facebook
        </button>
        <button type="button" onClick={() => openInNewTab(links.telegram)} className={btnClass}>
          Telegram
        </button>
        <button type="button" onClick={() => openInNewTab(links.linkedin)} className={btnClass}>
          LinkedIn
        </button>
      </div>
      {error ? <p className="text-[11px] text-rose-600">{error}</p> : null}
    </div>
  );
}
