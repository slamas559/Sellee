import type { Metadata } from "next";
import VendorsMapClient from "@/components/map/vendors-map-client";

export const metadata: Metadata = {
  title: "Vendor Map",
  description: "Find Sellee vendors near you on the map.",
};

export default function MapPage() {
  return (
    <div className="h-[calc(100vh-106px)] w-full sm:h-[calc(100vh-64px)]">
      <VendorsMapClient />
    </div>
  );
}
