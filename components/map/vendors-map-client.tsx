"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const VendorsMap = dynamic(() => import("./vendors-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-100">
      <div className="flex flex-col items-center gap-2 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        <p className="text-sm font-medium">Loading map...</p>
      </div>
    </div>
  ),
});

export default function VendorsMapClient() {
  return <VendorsMap />;
}
