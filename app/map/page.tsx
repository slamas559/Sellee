import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Vendor Map",
  description: "Find Sellee vendors near you on the map.",
};

// Leaflet touches `window` at module load time, so it can never be
// server-rendered - ssr: false is required here, not optional.
const VendorsMap = dynamic(() => import("@/components/map/vendors-map"), {
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

export default function MapPage() {
  return (
    <div className="h-[calc(100vh-106px)] w-full sm:h-[calc(100vh-64px)]">
      <VendorsMap />
    </div>
  );
}