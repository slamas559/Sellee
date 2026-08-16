import { Gift, Heart, Package, Percent, ShoppingBag, ShoppingCart, Sparkles, Store, Tag } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICON_SET: LucideIcon[] = [ShoppingBag, Tag, ShoppingCart, Gift, Store, Package, Sparkles, Heart, Percent];
const TONES = ["text-emerald-700/[0.07]", "text-amber-700/[0.09]"] as const;

// Deterministic "looks random" jitter - a fixed pure function of the seed,
// NOT Math.random(). This renders inside app/page.tsx, a Server Component,
// so anything that can return a different value between the server render
// and the client hydration pass (like Math.random()) throws a hydration
// mismatch - the same class of bug fixed in lib/store-url.ts. This produces
// the exact same "random-looking" number every time for a given seed,
// whichever environment calls it.
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 999.123) * 43758.5453;
  return x - Math.floor(x);
}

const ROWS = 7;
const COLS = 9;

type ScatterIcon = {
  Icon: LucideIcon;
  top: string;
  left: string;
  size: number;
  rotate: number;
  tone: (typeof TONES)[number];
  mobileVisible: boolean;
};

const ICONS: ScatterIcon[] = Array.from({ length: ROWS * COLS }, (_, index) => {
  const row = Math.floor(index / COLS);
  const col = index % COLS;

  const baseTop = ((row + 0.5) / ROWS) * 100;
  const baseLeft = ((col + 0.5) / COLS) * 100;

  const jitterTop = (pseudoRandom(index * 2 + 1) - 0.5) * (100 / ROWS) * 0.7;
  const jitterLeft = (pseudoRandom(index * 2 + 2) - 0.5) * (100 / COLS) * 0.7;

  return {
    Icon: ICON_SET[Math.floor(pseudoRandom(index * 3 + 3) * ICON_SET.length)],
    top: `${(baseTop + jitterTop).toFixed(2)}%`,
    left: `${(baseLeft + jitterLeft).toFixed(2)}%`,
    size: 18 + Math.round(pseudoRandom(index * 5 + 5) * 26), // 18-44px, the sm+ size
    rotate: Math.round((pseudoRandom(index * 7 + 7) - 0.5) * 60), // -30..30deg
    tone: TONES[Math.floor(pseudoRandom(index * 11 + 11) * TONES.length)],
    mobileVisible: (row + col) % 2 === 0, // checkerboard thin-out, ~half the icons
  };
});

export function HeroIconScatter() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 origin-center scale-75 overflow-hidden sm:scale-100"
    >
      {ICONS.map(({ Icon, top, left, size, rotate, tone, mobileVisible }, index) => (
        <Icon
          key={index}
          size={size}
          className={`absolute ${tone} ${mobileVisible ? "" : "hidden sm:block"}`}
          style={{ top, left, transform: `translate(-50%, -50%) rotate(${rotate}deg)` }}
        />
      ))}
    </div>
  );
}