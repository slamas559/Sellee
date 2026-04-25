"use client";

type RatingPickerProps = {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
};

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very good",
  5: "Excellent",
};

export function RatingPicker({ value, onChange, disabled = false }: RatingPickerProps) {
  const safeValue = Math.max(1, Math.min(5, value || 5));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, index) => {
          const score = index + 1;
          const active = score <= safeValue;
          return (
            <button
              key={score}
              type="button"
              onClick={() => onChange(score)}
              disabled={disabled}
              aria-label={`Rate ${score} star${score > 1 ? "s" : ""}`}
              className={`text-2xl leading-none transition ${
                active ? "text-amber-400" : "text-slate-300"
              } ${disabled ? "cursor-not-allowed opacity-70" : "hover:scale-105"}`}
            >
              ★
            </button>
          );
        })}
      </div>
      <p className="text-xs font-medium text-slate-600">
        {safeValue}/5 · {RATING_LABELS[safeValue]}
      </p>
    </div>
  );
}
