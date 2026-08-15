"use client";

import { Fragment, useState } from "react";
import { ChevronDown } from "lucide-react";

type ProductDetailsSectionProps = {
  description: string | null;
  brand: string | null;
  condition: string | null;
  attributes: Record<string, string> | null;
};

// Beyond this many characters, the description gets collapsed by default so
// a long write-up doesn't push the CTA / vendor card far down the page.
const DESCRIPTION_COLLAPSE_THRESHOLD = 220;
// Beyond this many rows, the product-info table gets collapsed by default.
const INFO_COLLAPSE_ROW_THRESHOLD = 4;

export function ProductDetailsSection({
  description,
  brand,
  condition,
  attributes,
}: ProductDetailsSectionProps) {
  const text = description ?? "No description added for this product yet.";
  const isLongDescription = text.length > DESCRIPTION_COLLAPSE_THRESHOLD;
  const [descriptionOpen, setDescriptionOpen] = useState(!isLongDescription);

  const attributeEntries = Object.entries(attributes ?? {});
  const infoRowCount = (condition ? 1 : 0) + (brand ? 1 : 0) + attributeEntries.length;
  const hasInfo = infoRowCount > 0;
  const isLongInfo = infoRowCount > INFO_COLLAPSE_ROW_THRESHOLD;
  const [infoOpen, setInfoOpen] = useState(!isLongInfo);

  return (
    <>
      {/* Description — collapses to a short preview for long write-ups */}
      <div className="relative">
        <p
          className={`text-sm leading-relaxed text-stone-600 ${
            !descriptionOpen ? "line-clamp-4" : ""
          }`}
        >
          {text}
        </p>
        {!descriptionOpen && isLongDescription && (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 h-8 bg-gradient-to-t from-white rounded-b-xl to-transparent" />
        )}
        {isLongDescription && (
          <button
            type="button"
            onClick={() => setDescriptionOpen((prev) => !prev)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
          >
            {descriptionOpen ? "Show less" : "Show more"}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${descriptionOpen ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

      {/* Structured product info — accordion for long attribute lists */}
      {hasInfo && (
        <div className="mt-5 rounded-xl border border-stone-200 bg-stone-50/60">
          <button
            type="button"
            onClick={() => isLongInfo && setInfoOpen((prev) => !prev)}
            className={`flex w-full items-center justify-between px-4 py-3 text-left ${
              isLongInfo ? "cursor-pointer" : "cursor-default"
            }`}
            aria-expanded={infoOpen}
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Product information
            </span>
            {isLongInfo && (
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-stone-400 transition-transform ${infoOpen ? "rotate-180" : ""}`}
              />
            )}
          </button>

          <div
            className={`grid transition-all duration-300 ease-in-out ${
              infoOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-4 pb-4 text-sm">
                {condition ? (
                  <>
                    <dt className="capitalize text-stone-500">Condition</dt>
                    <dd className="capitalize font-medium text-stone-800">{condition}</dd>
                  </>
                ) : null}
                {brand ? (
                  <>
                    <dt className="text-stone-500">Brand</dt>
                    <dd className="font-medium text-stone-800">{brand}</dd>
                  </>
                ) : null}
                {attributeEntries.map(([key, value]) => (
                  <Fragment key={key}>
                    <dt className="text-stone-500">{key}</dt>
                    <dd className="font-medium text-stone-800">{value}</dd>
                  </Fragment>
                ))}
              </dl>
            </div>
          </div>
        </div>
      )}
    </>
  );
}