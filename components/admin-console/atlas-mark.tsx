/**
 * The console's one deliberately-designed signature element: a compass
 * rose reduced to four ticks and a center point, standing in for "a fixed
 * reference point you navigate the platform from." Used small and once
 * per screen (sidebar nameplate) rather than repeated as decoration.
 */
export function AtlasGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.1" opacity="0.55" />
      <path d="M12 3.4V6M12 18v2.6M3.4 12H6M18 12h2.6" stroke="currentColor" strokeWidth="1.1" />
      <path d="M12 8L14 12L12 16L10 12L12 8Z" fill="currentColor" />
    </svg>
  );
}

export function AtlasWordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <AtlasGlyph />
      <span className="atlas-display text-[15px] font-semibold tracking-wide">ATLAS</span>
    </div>
  );
}
