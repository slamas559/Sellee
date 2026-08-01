"use client";

import { useState } from "react";
import { Check, Sparkles, X } from "lucide-react";

type RefineKind = "product_description" | "store_hero_subtitle" | "broadcast_message";

type AiRefineButtonProps = {
  value: string;
  kind: RefineKind;
  onApply: (refined: string) => void;
  className?: string;
};

/**
 * A small "Improve with AI" button to sit next to any text field. Never
 * overwrites the field directly - shows the refined version alongside the
 * original with Apply/Discard, so the vendor always sees what changed
 * before committing to it.
 */
export function AiRefineButton({ value, kind, onApply, className }: AiRefineButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "preview" | "error">("idle");
  const [refined, setRefined] = useState("");
  const [error, setError] = useState("");

  async function handleRefine() {
    const trimmed = value.trim();
    if (!trimmed || status === "loading") return;

    setStatus("loading");
    setError("");

    try {
      const response = await fetch("/api/ai/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, kind }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error ?? "Couldn't refine that - please try again.");
        setStatus("error");
        return;
      }

      setRefined(data.refined);
      setStatus("preview");
    } catch {
      setError("Network error - please try again.");
      setStatus("error");
    }
  }

  function apply() {
    onApply(refined);
    setStatus("idle");
  }

  function discard() {
    setStatus("idle");
  }

  return (
    <div className={className}>
      {status === "idle" || status === "loading" || status === "error" ? (
        <button
          type="button"
          onClick={handleRefine}
          disabled={status === "loading" || !value.trim()}
          className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Sparkles className="h-3 w-3" />
          {status === "loading" ? "Improving..." : "Improve with AI"}
        </button>
      ) : null}

      {status === "error" ? <p className="mt-1 text-[11px] text-red-600">{error}</p> : null}

      {status === "preview" ? (
        <div className="mt-2 space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5">
          <p className="text-[11px] font-semibold text-emerald-800">AI suggestion</p>
          <p className="whitespace-pre-wrap text-xs text-slate-800">{refined}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={apply}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
            >
              <Check className="h-3 w-3" /> Apply
            </button>
            <button
              type="button"
              onClick={discard}
              className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              <X className="h-3 w-3" /> Discard
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}