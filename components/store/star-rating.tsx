type StarRatingProps = {
  value: number | null;
  count?: number;
  size?: "sm" | "md";
  accent?: "yellow" | "green";
};

function getStarClass(active: boolean, accent: "yellow" | "green"): string {
  if (!active) return "text-slate-300";
  return accent === "green" ? "text-emerald-500" : "text-amber-400";
}

export function StarRating({
  value,
  count = 0,
  size = "sm",
  accent = "yellow",
}: StarRatingProps) {
  const safeValue = typeof value === "number" ? Math.max(0, Math.min(5, value)) : 0;
  const rounded = Math.round(safeValue * 2) / 2;
  const starCount = 5;
  const textClass = size === "md" ? "text-sm" : "text-xs";

  return (
    <div className={`inline-flex items-center gap-1.5 ${textClass}`}>
      <div className="inline-flex items-center gap-0.5">
        {Array.from({ length: starCount }).map((_, index) => {
          const threshold = index + 1;
          const active = rounded >= threshold - 0.25;
          return (
            <span key={index} className={getStarClass(active, accent)}>
              ★
            </span>
          );
        })}
      </div>
      <span className="font-medium text-slate-700">
        {safeValue > 0 ? safeValue.toFixed(1) : "New"}
      </span>
      <span className="text-slate-500">({count})</span>
    </div>
  );
}
