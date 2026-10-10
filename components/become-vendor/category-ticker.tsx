import { Sparkles } from "lucide-react";

const ITEMS = [
  "Phones & gadgets",
  "Fashion & style",
  "Groceries & foodstuff",
  "Beauty & skincare",
  "Home goods",
  "Gifts",
  "Fabrics & tailoring",
  "Accessories",
];

function Row({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {ITEMS.map((item) => (
        <li
          key={item}
          className="flex items-center gap-6 pr-6 text-sm font-semibold text-slate-700 sm:gap-8 sm:pr-8 sm:text-base"
        >
          <span className="whitespace-nowrap">{item}</span>
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
        </li>
      ))}
    </ul>
  );
}

/** Slow, pure-CSS marquee of the kinds of things vendors sell. */
export function CategoryTicker() {
  return (
    <div className="bv-ticker border-y border-slate-200 bg-white py-4">
      <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="bv-ticker-track flex">
          <Row />
          <Row hidden />
        </div>
      </div>
    </div>
  );
}
