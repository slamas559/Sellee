"use client";

import { useEffect, useRef, useState } from "react";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
};

/**
 * Wraps children and fades/slides them into view the first time they
 * scroll into the viewport. Falls back to visible immediately if
 * IntersectionObserver isn't available.
 */
export function Reveal({ children, className = "", delay = 0, y = 24 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Always start hidden on both server and client so the first client
  // render matches the server-rendered HTML (avoids a hydration mismatch).
  // The effect below (client-only, post-mount) decides when to reveal.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      // No observer support: reveal on next frame instead of during the
      // effect itself, so we don't trigger a synchronous cascading render.
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-700 ease-out will-change-transform`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0px)" : `translateY(${y}px)`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}