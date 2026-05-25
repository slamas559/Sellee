"use client";

import Image from "next/image";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";

type ProductMediaGalleryProps = {
  name: string;
  imageUrl: string | null;
  imageUrls: string[] | null;
};

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_MS = 280;

// ---------- tiny helpers ----------
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function dist2(t: React.Touch, u: React.Touch) {
  const dx = t.clientX - u.clientX;
  const dy = t.clientY - u.clientY;
  return Math.hypot(dx, dy);
}

function midpoint(t: React.Touch, u: React.Touch) {
  return { x: (t.clientX + u.clientX) / 2, y: (t.clientY + u.clientY) / 2 };
}

// ---------- main component ----------
export function ProductMediaGallery({
  name,
  imageUrl,
  imageUrls,
}: ProductMediaGalleryProps) {
  const images = useMemo(() => {
    const list = (imageUrls ?? []).filter(Boolean);
    if (list.length > 0) return list;
    return imageUrl ? [imageUrl] : [];
  }, [imageUrl, imageUrls]);

  // ── gallery state ──
  const [activeIndex, setActiveIndex] = useState(0);
  const galleryTouchStart = useRef<{ x: number; y: number } | null>(null);

  // ── lightbox open/close ──
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lbIndex, setLbIndex] = useState(0);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const [showHint, setShowHint] = useState(false);

  // ── transform state (single source of truth in refs to avoid stale closures) ──
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0); // translateX in px
  const [ty, setTy] = useState(0); // translateY in px
  const scaleRef = useRef(1);
  const txRef = useRef(0);
  const tyRef = useRef(0);

  // committed values (what the last gesture ended at)
  const commitScale = useRef(1);
  const commitTx = useRef(0);
  const commitTy = useRef(0);

  // ── gesture refs ──
  const imgWrapRef = useRef<HTMLDivElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  // pan (single pointer / mouse)
  const panActive = useRef(false);
  const panOrigin = useRef({ x: 0, y: 0 });

  // pinch (two touches)
  const pinchActive = useRef(false);
  const pinchStart = useRef({ dist: 0, scale: 1, midX: 0, midY: 0 });

  // double-tap
  const lastTapRef = useRef(0);

  // ── helpers ──

  /** Compute max translate given current scale and wrapper size */
  function maxTranslate(s: number) {
    const el = imgWrapRef.current;
    if (!el) return { maxX: 0, maxY: 0 };
    const { width: W, height: H } = el.getBoundingClientRect();
    // image fills wrapper with object-fit:contain
    // at scale=1 no overflow; at scale>1 overflow = (s-1)/2 * dimension
    const maxX = Math.max(0, ((s - 1) * W) / 2);
    const maxY = Math.max(0, ((s - 1) * H) / 2);
    return { maxX, maxY };
  }

  function clampedTranslate(s: number, x: number, y: number) {
    const { maxX, maxY } = maxTranslate(s);
    return { x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) };
  }

  /** Push scale + translate to both refs and state */
  const applyTransform = useCallback(
    (s: number, x: number, y: number, commit = false) => {
      const { x: cx, y: cy } = clampedTranslate(s, x, y);
      scaleRef.current = s;
      txRef.current = cx;
      tyRef.current = cy;
      setScale(s);
      setTx(cx);
      setTy(cy);
      if (commit) {
        commitScale.current = s;
        commitTx.current = cx;
        commitTy.current = cy;
      }
    },
    []
  );

  /** Reset transform fully */
  const resetTransform = useCallback(
    (commit = true) => {
      applyTransform(1, 0, 0, commit);
    },
    [applyTransform]
  );

  // ── lightbox open / close ──
  function openLightbox(index: number) {
    prevFocusRef.current = document.activeElement as HTMLElement | null;
    setLbIndex(index);
    resetTransform(true);
    setLightboxOpen(true);
    setShowHint(true);
    setTimeout(() => setShowHint(false), 2200);
  }

  function closeLightbox() {
    setLightboxOpen(false);
    resetTransform(true);
    try {
      prevFocusRef.current?.focus();
    } catch (_) {}
  }

  /** Change lightbox image and reset zoom */
  function goTo(index: number) {
    setLbIndex(index);
    resetTransform(true);
  }

  // ── keyboard navigation ──
  useEffect(() => {
    if (!lightboxOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft")
        goTo((lbIndex - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") goTo((lbIndex + 1) % images.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen, lbIndex, images.length]);

  // ── focus trap + initial focus ──
  useEffect(() => {
    if (!lightboxOpen || !modalRef.current) return;
    const el = modalRef.current;
    const btn = el.querySelector<HTMLElement>("button[data-close]");
    setTimeout(() => btn?.focus(), 30);

    function trap(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const nodes = Array.from(
        el.querySelectorAll<HTMLElement>(
          'button:not([disabled]),[tabindex]:not([tabindex="-1"])'
        )
      );
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    el.addEventListener("keydown", trap);
    return () => el.removeEventListener("keydown", trap);
  }, [lightboxOpen]);

  // ── Zoom buttons ──
  function zoomBy(delta: number) {
    const s = clamp(scaleRef.current + delta, MIN_SCALE, MAX_SCALE);
    if (s === MIN_SCALE) {
      applyTransform(MIN_SCALE, 0, 0, true);
    } else {
      applyTransform(s, txRef.current, tyRef.current, true);
    }
  }

  // ── Pointer (mouse + stylus) handlers ──
  function onPointerDown(e: React.PointerEvent) {
    // Only handle primary pointer here; touch is handled via onTouch*
    if (e.pointerType === "touch") return;
    if (scaleRef.current <= 1) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    panActive.current = true;
    panOrigin.current = { x: e.clientX, y: e.clientY };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (e.pointerType === "touch" || !panActive.current) return;
    const dx = e.clientX - panOrigin.current.x;
    const dy = e.clientY - panOrigin.current.y;
    applyTransform(
      scaleRef.current,
      commitTx.current + dx,
      commitTy.current + dy
    );
  }

  function onPointerUp(e: React.PointerEvent) {
    if (e.pointerType === "touch" || !panActive.current) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}
    panActive.current = false;
    commitTx.current = txRef.current;
    commitTy.current = tyRef.current;
  }

  // ── Mouse click (zoom toggle) ──
  function onImgClick(e: React.MouseEvent) {
    // If panned significantly, treat as drag end, not click
    if (
      Math.abs(txRef.current - commitTx.current) > 4 ||
      Math.abs(tyRef.current - commitTy.current) > 4
    )
      return;

    const wrapper = imgWrapRef.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();

    if (scaleRef.current > 1.01) {
      applyTransform(MIN_SCALE, 0, 0, true);
      return;
    }

    // Zoom 2× into clicked point
    const newScale = 2;
    const cx = e.clientX - rect.left - rect.width / 2; // offset from center
    const cy = e.clientY - rect.top - rect.height / 2;
    // translate so the clicked point moves to center
    const nx = -cx * (newScale - 1);
    const ny = -cy * (newScale - 1);
    applyTransform(newScale, nx, ny, true);
  }

  // ── Touch handlers (for pinch + pan + double-tap + swipe) ──
  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 1) {
      const t = e.touches[0];

      // double-tap detection
      const now = Date.now();
      if (now - lastTapRef.current < DOUBLE_TAP_MS) {
        lastTapRef.current = 0;
        // toggle zoom 2× / reset
        if (scaleRef.current > 1.01) {
          applyTransform(MIN_SCALE, 0, 0, true);
        } else {
          const wrapper = imgWrapRef.current;
          if (wrapper) {
            const rect = wrapper.getBoundingClientRect();
            const cx = t.clientX - rect.left - rect.width / 2;
            const cy = t.clientY - rect.top - rect.height / 2;
            const newScale = 2;
            applyTransform(newScale, -cx * (newScale - 1), -cy * (newScale - 1), true);
          }
        }
        return;
      }
      lastTapRef.current = now;

      // pan (only if zoomed)
      if (scaleRef.current > 1) {
        panActive.current = true;
        panOrigin.current = { x: t.clientX, y: t.clientY };
      }
    } else if (e.touches.length === 2) {
      panActive.current = false;
      pinchActive.current = true;
      const [a, b] = [e.touches[0], e.touches[1]];
      const mid = midpoint(a, b);
      pinchStart.current = {
        dist: dist2(a, b),
        scale: scaleRef.current,
        midX: mid.x,
        midY: mid.y,
      };
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    e.preventDefault(); // prevent browser scroll / bounce

    if (pinchActive.current && e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const currentDist = dist2(a, b);
      const ratio = currentDist / pinchStart.current.dist;
      const newScale = clamp(
        pinchStart.current.scale * ratio,
        MIN_SCALE,
        MAX_SCALE
      );

      // pan with midpoint delta
      const mid = midpoint(a, b);
      const dMidX = mid.x - pinchStart.current.midX;
      const dMidY = mid.y - pinchStart.current.midY;
      applyTransform(
        newScale,
        commitTx.current + dMidX,
        commitTy.current + dMidY
      );
    } else if (panActive.current && e.touches.length === 1) {
      const t = e.touches[0];
      const dx = t.clientX - panOrigin.current.x;
      const dy = t.clientY - panOrigin.current.y;
      applyTransform(
        scaleRef.current,
        commitTx.current + dx,
        commitTy.current + dy
      );
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (pinchActive.current) {
      pinchActive.current = false;
      commitScale.current = scaleRef.current;
      commitTx.current = txRef.current;
      commitTy.current = tyRef.current;
    }
    if (panActive.current) {
      panActive.current = false;
      commitTx.current = txRef.current;
      commitTy.current = tyRef.current;
    }
  }

  // ── Gallery swipe (main view) ──
  function onGalleryTouchStart(e: React.TouchEvent) {
    galleryTouchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  }

  function onGalleryTouchEnd(e: React.TouchEvent) {
    if (!galleryTouchStart.current) return;
    const dx = e.changedTouches[0].clientX - galleryTouchStart.current.x;
    const dy = e.changedTouches[0].clientY - galleryTouchStart.current.y;
    galleryTouchStart.current = null;
    if (Math.abs(dx) < 40 || Math.abs(dy) > Math.abs(dx) * 1.5) return; // too short or mostly vertical
    if (dx < 0) {
      setActiveIndex((i) => (i + 1) % images.length);
    } else {
      setActiveIndex((i) => (i - 1 + images.length) % images.length);
    }
  }

  // ── prevent body scroll when lightbox is open ──
  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [lightboxOpen]);

  // ── render ──
  const activeImage = images[activeIndex] ?? null;

  return (
    <div className="space-y-3">
      {/* ── Main gallery view ── */}
      <div
        className="relative w-full h-96 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:h-[80vh] cursor-zoom-in"
        onTouchStart={images.length > 1 ? onGalleryTouchStart : undefined}
        onTouchEnd={images.length > 1 ? onGalleryTouchEnd : undefined}
      >
        {activeImage ? (
          <button
            type="button"
            onClick={() => openLightbox(activeIndex)}
            className="absolute inset-0 w-full h-full"
            aria-label="Open image in fullscreen"
          >
            <Image
              src={activeImage}
              alt={name}
              fill
              className="object-cover transition-transform duration-300"
              sizes="(max-width: 1024px) 100vw, 60vw"
              priority
            />
          </button>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            No product image
          </div>
        )}

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() =>
                setActiveIndex((i) => (i - 1 + images.length) % images.length)
              }
              className="absolute left-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/80 text-slate-700 shadow-sm backdrop-blur hover:bg-white transition"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                setActiveIndex((i) => (i + 1) % images.length)
              }
              className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/80 text-slate-700 shadow-sm backdrop-blur hover:bg-white transition"
              aria-label="Next image"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/35 px-2 py-1">
              {images.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Show image ${index + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    index === activeIndex
                      ? "w-4 bg-white"
                      : "w-1.5 bg-white/60"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Thumbnail strip ── */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto p-1 pb-1">
          {images.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border transition ${
                index === activeIndex
                  ? "border-emerald-500 ring-2 ring-emerald-200"
                  : "border-slate-200 hover:border-slate-400"
              }`}
              aria-label={`View image ${index + 1}`}
            >
              <Image
                src={image}
                alt={`${name} preview ${index + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightboxOpen && (
        <div
          ref={modalRef}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90"
          role="dialog"
          aria-modal="true"
          aria-label={`Image ${lbIndex + 1} of ${images.length}`}
        >
          {/* Backdrop tap to close (only when not zoomed) */}
          {scale <= 1.01 && (
            <div
              className="absolute inset-0"
              onClick={closeLightbox}
              aria-hidden="true"
            />
          )}

          {/* ── Top bar ── */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 pointer-events-none">
            <span className="rounded-full bg-black/50 px-3 py-1 text-sm text-white/80 pointer-events-none select-none">
              {lbIndex + 1} / {images.length}
            </span>
            <button
              data-close
              type="button"
              onClick={closeLightbox}
              className="pointer-events-auto rounded-full bg-black/60 p-2 text-white hover:bg-black/80 transition"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* ── Image area ── */}
          <div
            ref={imgWrapRef}
            className="relative w-full h-full flex items-center justify-center overflow-hidden select-none"
            style={{
              cursor:
                scale > 1
                  ? "grab"
                  : "zoom-in",
              touchAction: "none", // we fully own touch events
            }}
            onClick={onImgClick}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <Image
              src={images[lbIndex]}
              alt={`${name} full view ${lbIndex + 1}`}
              fill
              sizes="100vw"
              className="select-none pointer-events-none"
              style={{
                objectFit: "contain",
                transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                transformOrigin: "center center",
                willChange: "transform",
                transition: panActive.current || pinchActive.current
                  ? "none"
                  : "transform 0.15s ease-out",
              }}
              priority
            />
          </div>

          {/* ── Prev / Next arrows ── */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => goTo((lbIndex - 1 + images.length) % images.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/60 p-2.5 text-white hover:bg-black/80 transition"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => goTo((lbIndex + 1) % images.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/60 p-2.5 text-white hover:bg-black/80 transition"
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* ── Zoom controls (bottom) ── */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3">
            <button
              type="button"
              onClick={() => zoomBy(-0.5)}
              disabled={scale <= MIN_SCALE}
              className="rounded-full bg-black/60 p-2 text-white hover:bg-black/80 transition disabled:opacity-40"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-5 w-5" />
            </button>
            <span className="rounded-full bg-black/60 px-3 py-1 text-sm text-white/90 tabular-nums min-w-[52px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => zoomBy(0.5)}
              disabled={scale >= MAX_SCALE}
              className="rounded-full bg-black/60 p-2 text-white hover:bg-black/80 transition disabled:opacity-40"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-5 w-5" />
            </button>
          </div>

          {/* ── Hint ── */}
          {showHint && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10 rounded-full bg-black/65 px-4 py-1.5 text-sm text-white/90 pointer-events-none whitespace-nowrap animate-fade-in">
              Click or double-tap to zoom · Drag to pan · Pinch to zoom
            </div>
          )}

          {/* ── Thumbnail strip at bottom (desktop) ── */}
          {images.length > 1 && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 hidden sm:flex gap-2 rounded-2xl bg-black/50 p-2 backdrop-blur-sm">
              {images.map((img, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => goTo(index)}
                  className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                    index === lbIndex
                      ? "border-white"
                      : "border-transparent opacity-60 hover:opacity-90"
                  }`}
                  aria-label={`Go to image ${index + 1}`}
                >
                  <Image
                    src={img}
                    alt={`${name} thumbnail ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}