import type { CSSProperties } from "react";
import { safePrimary } from "@/lib/storefront-theme";

/**
 * Miniature wireframes of the four storefront layouts, used by the template
 * picker in the dashboard. They mirror the real layouts (header, hero, shelves,
 * grid) and take the vendor's current colour so changing the colour step
 * re-tints every preview. Pure divs: no images, safe in client components.
 */

type PreviewKey = "grocery_promo" | "fashion_editorial" | "lifestyle_showcase" | "modern_grid";

function Bar({ w, h = 3, c = "#cbd5e1", r = 2, className = "" }: { w: number | string; h?: number; c?: string; r?: number; className?: string }) {
  return <div className={`shrink-0 ${className}`} style={{ width: w, height: h, background: c, borderRadius: r }} />;
}

function MarketPreview({ primary }: { primary: string }) {
  const soft = `color-mix(in srgb, ${primary} 12%, white)`;
  return (
    <div className="flex h-full flex-col" style={{ background: "#f5f6f3" }}>
      <div className="flex h-[17px] items-center gap-1.5 border-b border-slate-200 bg-white px-1.5">
        <div className="h-2.5 w-2.5 rounded-[3px]" style={{ background: primary }} />
        <div className="h-[7px] flex-1 rounded-full bg-slate-100" />
        <div className="h-[7px] w-[16px] rounded-[3px]" style={{ background: primary }} />
      </div>
      <div className="h-[7px]" style={{ background: primary }} />
      <div className="space-y-1.5 p-1.5">
        <div className="h-[24px] rounded-md" style={{ background: `linear-gradient(120deg, ${primary}, color-mix(in srgb, ${primary} 45%, white))` }} />
        <div className="flex gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[6px] w-[15px] rounded-full border" style={i === 0 ? { background: primary, borderColor: primary } : { background: "#fff", borderColor: "#e2e8f0" }} />
          ))}
        </div>
        <div className="flex gap-1 rounded-md p-1" style={{ background: soft }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="relative h-[21px] flex-1 rounded-[3px] bg-white shadow-sm">
              <div className="absolute left-0 top-1 h-[4px] w-[8px] rounded-r-sm" style={{ background: primary }} />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[17px] rounded-[3px] border border-slate-200 bg-white" />
          ))}
        </div>
      </div>
    </div>
  );
}

function EditorialPreview() {
  return (
    <div className="flex h-full flex-col" style={{ background: "#faf8f5" }}>
      <div className="flex flex-col items-center gap-[3px] pt-2">
        <Bar w={56} h={7} c="#1c1917" r={1} />
        <Bar w={30} h={2} c="#a8a29e" r={1} />
      </div>
      <div className="mt-1.5 flex items-center gap-2 border-y px-2 py-[3px]" style={{ borderColor: "#e7e2da" }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Bar key={i} w={11} h={2} c={i === 0 ? "#1c1917" : "#c9c3b8"} r={1} />
        ))}
      </div>
      <div className="relative h-[44px]" style={{ background: "linear-gradient(135deg,#57534e,#1c1917)" }}>
        <div className="absolute bottom-1.5 left-2 space-y-[3px]">
          <Bar w={52} h={6} c="#fff" r={1} />
          <Bar w={30} h={2} c="rgba(255,255,255,.55)" r={1} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5 px-2 pt-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className={i === 1 ? "mt-2" : ""}>
            <div className="h-[28px]" style={{ background: "#e7e2da" }} />
            <Bar w="70%" h={2} c="#a8a29e" r={1} className="mt-[3px]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ShowcasePreview({ primary }: { primary: string }) {
  const tint = `color-mix(in srgb, ${primary} 7%, #fffdf9)`;
  return (
    <div className="flex h-full flex-col" style={{ background: tint }}>
      <div className="flex items-center justify-between px-2 pt-1.5">
        <div className="flex items-center gap-1">
          <div className="h-[9px] w-[9px] rounded-full" style={{ background: primary }} />
          <Bar w={20} h={3} c="#94a3b8" />
        </div>
        <div className="h-[6px] w-[16px] rounded-full border border-slate-300 bg-white" />
      </div>
      <div className="grid grid-cols-2 items-center gap-2 px-2 pt-1.5">
        <div className="space-y-[3px]">
          <div className="flex gap-[3px]">
            <div className="h-[5px] w-[11px] rounded-full" style={{ background: `color-mix(in srgb, ${primary} 18%, white)` }} />
            <div className="h-[5px] w-[11px] rounded-full" style={{ background: `color-mix(in srgb, ${primary} 18%, white)` }} />
          </div>
          <Bar w="100%" h={6} c="#1e293b" />
          <Bar w="70%" h={6} c="#1e293b" />
          <Bar w="85%" h={2} c="#cbd5e1" />
          <div className="flex gap-1 pt-[2px]">
            <div className="h-[8px] w-[30px] rounded-full" style={{ background: primary }} />
            <div className="h-[8px] w-[22px] rounded-full border border-slate-300 bg-white" />
          </div>
        </div>
        <div className="h-[54px] overflow-hidden rounded-b-md rounded-t-full" style={{ background: `color-mix(in srgb, ${primary} 26%, white)` }}>
          <div className="mx-auto mt-3 h-[20px] w-[20px] rounded-full bg-white/50" />
        </div>
      </div>
      <div className="mt-auto flex gap-1.5 px-2 pb-2 pt-1.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="relative h-[26px] flex-1 overflow-hidden rounded-lg bg-white shadow-sm" style={{ transform: i === 1 ? "translateY(3px)" : undefined }}>
            <div className="absolute bottom-[3px] left-[3px] h-[5px] w-[12px] rounded-full bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

function GridPreview({ primary }: { primary: string }) {
  return (
    <div className="flex h-full flex-col" style={{ background: "#eef0f3" }}>
      <div className="flex h-[15px] items-center gap-1.5 bg-slate-900 px-1.5">
        <div className="h-[7px] w-[7px] rounded-[2px]" style={{ background: primary }} />
        <div className="h-[7px] flex-1 rounded-[3px] bg-white" />
        <div className="h-[7px] w-[17px] rounded-[2px]" style={{ background: primary }} />
      </div>
      <div className="grid flex-1 grid-cols-[34px_1fr] gap-1.5 p-1.5">
        <div className="space-y-[3px] rounded-[4px] border border-slate-200 bg-white p-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[5px] rounded-[2px]" style={{ background: i === 0 ? primary : "#e2e8f0" }} />
          ))}
        </div>
        <div className="space-y-1">
          <div className="flex h-[8px] items-center justify-end gap-[2px] rounded-[3px] border border-slate-200 bg-white px-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[4px] w-[9px] rounded-[1px]" style={{ background: i === 0 ? primary : "#e2e8f0" }} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="relative rounded-[3px] border border-slate-200 bg-white p-[2px]">
                <div className="h-[13px] rounded-[2px] bg-slate-200" />
                <Bar w="80%" h={2} c="#94a3b8" className="mt-[2px]" />
                <Bar w="45%" h={3} c="#0f172a" className="mt-[2px]" />
                {i === 1 || i === 4 ? <div className="absolute right-[3px] top-[3px] h-[4px] w-[7px] rounded-[1px] bg-rose-500" /> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


function StreetPreview({ primary }: { primary: string }) {
  return (
    <div className="flex h-full flex-col border-b-2 border-black" style={{ background: "#efeee8" }}>
      <div className="h-[6px] bg-black" />
      <div className="px-2 pt-1.5">
        <Bar w="78%" h={11} c="#0a0a0a" r={0} />
        <div className="mt-1 flex gap-[3px]">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[6px] w-[16px] border border-black" style={{ background: i === 0 ? primary : "#fff" }} />
          ))}
        </div>
      </div>
      <div className="mx-2 mt-1.5 grid h-[34px] grid-cols-[1.15fr_1fr] border-2 border-black">
        <div className="border-r-2 border-black bg-neutral-300" />
        <div className="p-1" style={{ background: primary }}>
          <Bar w="85%" h={5} c="#0a0a0a" r={0} />
          <Bar w="55%" h={5} c="#0a0a0a" r={0} className="mt-[2px]" />
          <div className="mt-1.5 h-[6px] w-[22px] bg-black" />
        </div>
      </div>
      <div className="mx-2 mt-1.5 grid flex-1 grid-cols-4 border-l-2 border-t-2 border-black">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="border-b-2 border-r-2 border-black bg-white">
            <div className="h-[13px] border-b-2 border-black bg-neutral-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

function BeautyPreview({ primary }: { primary: string }) {
  const soft = `color-mix(in srgb, ${primary} 14%, white)`;
  return (
    <div className="flex h-full flex-col items-center" style={{ background: "#fdf8f6" }}>
      <div className="mt-1.5 h-[11px] w-[11px] rounded-full" style={{ background: primary }} />
      <Bar w={44} h={5} c="#3b2f2f" r={3} className="mt-1" />
      <div className="mt-1.5 flex gap-[3px]">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[6px] w-[15px] rounded-full" style={{ background: i === 0 ? primary : "#fff", border: "1px solid #f0e1dc" }} />
        ))}
      </div>
      <div className="mt-1.5 flex h-[34px] w-[88%] items-end rounded-[14px] p-1" style={{ background: soft }}>
        <div className="h-[16px] w-[46%] rounded-[8px] bg-white/90" />
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[14px] w-[14px] rounded-full" style={{ background: i % 2 ? soft : `color-mix(in srgb, ${primary} 28%, white)` }} />
        ))}
      </div>
      <div className="mt-1.5 grid w-[88%] grid-cols-4 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i}>
            <div className="h-[22px] rounded-[7px]" style={{ background: soft }} />
            <div className="mx-auto mt-[2px] h-[4px] w-[70%] rounded-full" style={{ border: `1px solid ${primary}` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function HomePreview({ primary }: { primary: string }) {
  return (
    <div className="flex h-full flex-col" style={{ background: "#f4efe8" }}>
      <div className="flex items-center justify-between border-b px-2 py-1" style={{ borderColor: "#e2d9cc" }}>
        <Bar w={30} h={6} c="#2b2622" r={1} />
        <div className="flex gap-1.5">{[0, 1, 2].map((i) => <Bar key={i} w={9} h={2} c="#a89c8e" r={1} />)}</div>
      </div>
      <div className="grid grid-cols-[5fr_7fr] gap-2 px-2 pt-2">
        <div className="space-y-[3px] pt-1">
          <Bar w="95%" h={7} c="#2b2622" r={1} />
          <Bar w="60%" h={7} c="#2b2622" r={1} />
          <Bar w="80%" h={2} c="#a89c8e" r={1} className="mt-1" />
          <div className="mt-1 h-[8px] w-[26px] rounded-[2px]" style={{ background: primary }} />
        </div>
        <div className="h-[44px] rounded-[6px]" style={{ background: `color-mix(in srgb, ${primary} 22%, #e2d9cc)` }} />
      </div>
      <div className="mx-2 mt-2 grid flex-1 grid-cols-4 grid-rows-2 gap-1 pb-2">
        <div className="col-span-2 row-span-2 rounded-[4px]" style={{ background: `color-mix(in srgb, ${primary} 30%, #d8cdbd)` }} />
        <div className="rounded-[3px] bg-[#d8cdbd]" />
        <div className="rounded-[3px]" style={{ background: `color-mix(in srgb, ${primary} 18%, #d8cdbd)` }} />
        <div className="rounded-[3px]" style={{ background: `color-mix(in srgb, ${primary} 12%, #cfc3b1)` }} />
        <div className="rounded-[3px] bg-[#cfc3b1]" />
      </div>
    </div>
  );
}

function NoirPreview({ primary }: { primary: string }) {
  return (
    <div className="flex h-full flex-col" style={{ background: "#0f0e0d" }}>
      <div className="flex flex-col items-center gap-[3px] pt-2">
        <Bar w={58} h={4} c="#f3eee6" r={1} />
        <Bar w={26} h={2} c="#6f675d" r={1} />
      </div>
      <div className="mt-1.5 flex items-center justify-center gap-2 border-y py-[3px]" style={{ borderColor: "#2d2926" }}>
        {[0, 1, 2, 3].map((i) => <Bar key={i} w={11} h={2} c={i === 0 ? primary : "#5c554c"} r={1} />)}
      </div>
      <div className="grid flex-1 grid-cols-2 items-center gap-3 px-3">
        <div className="relative">
          <div className="absolute inset-0 translate-x-[3px] translate-y-[3px] border" style={{ borderColor: primary }} />
          <div className="relative h-[40px] bg-[#2a2622]" />
        </div>
        <div className="space-y-[3px]">
          <Bar w="40%" h={2} c={primary} r={1} />
          <Bar w="90%" h={5} c="#f3eee6" r={1} />
          <Bar w="35%" h={3} c={primary} r={1} />
          <div className="mt-1 h-[7px] w-[28px] border" style={{ borderColor: primary }} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1 px-2 pb-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="border p-[2px]" style={{ borderColor: "#2d2926", background: "#171513" }}>
            <div className="h-[12px] bg-[#2a2622]" />
            <Bar w="60%" h={2} c="#6f675d" r={1} className="mx-auto mt-[2px]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function LookbookPreview() {
  return (
    <div className="grid h-full grid-cols-[34px_1fr]" style={{ background: "#f6f6f3" }}>
      <div className="space-y-[4px] border-r p-1.5" style={{ borderColor: "#d9d9d3" }}>
        <div className="h-[8px] w-[8px] bg-black" />
        <Bar w="100%" h={4} c="#111" r={0} />
        <div className="space-y-[3px] pt-1.5">
          {[0, 1, 2, 3, 4].map((i) => <Bar key={i} w="100%" h={2} c={i === 0 ? "#111" : "#bdbdb6"} r={0} />)}
        </div>
      </div>
      <div className="space-y-1 p-1.5">
        <div className="grid h-[48px] grid-cols-3 gap-1">
          <div className="relative col-span-2 bg-neutral-700"><div className="absolute bottom-1 left-1"><Bar w={28} h={3} c="#fff" r={0} /></div></div>
          <div className="grid grid-rows-2 gap-1"><div className="bg-neutral-400" /><div className="bg-neutral-300" /></div>
        </div>
        <div className="grid h-[48px] grid-cols-3 gap-1">
          <div className="grid grid-rows-2 gap-1"><div className="bg-neutral-300" /><div className="bg-neutral-400" /></div>
          <div className="relative col-span-2 bg-neutral-500"><div className="absolute bottom-1 left-1"><Bar w={24} h={3} c="#fff" r={0} /></div></div>
        </div>
      </div>
    </div>
  );
}

export function TemplatePreview({
  template,
  primary,
  className = "",
  style,
}: {
  template: string;
  primary: string;
  className?: string;
  style?: CSSProperties;
}) {
  const color = safePrimary(primary);
  return (
    <div className={`h-[150px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-inner ${className}`} style={style} aria-hidden="true">
      {template === "street_drop" ? (
        <StreetPreview primary={color} />
      ) : template === "soft_beauty" ? (
        <BeautyPreview primary={color} />
      ) : template === "home_living" ? (
        <HomePreview primary={color} />
      ) : template === "noir_gallery" ? (
        <NoirPreview primary={color} />
      ) : template === "lookbook" ? (
        <LookbookPreview />
      ) : template === "fashion_editorial" ? (
        <EditorialPreview />
      ) : template === "lifestyle_showcase" ? (
        <ShowcasePreview primary={color} />
      ) : template === "modern_grid" ? (
        <GridPreview primary={color} />
      ) : (
        <MarketPreview primary={color} />
      )}
    </div>
  );
}

export type { PreviewKey };
