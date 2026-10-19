import type { Metadata } from "next";
import { PreviewFrame } from "@/components/storefront/preview-frame";

export const metadata: Metadata = {
  title: "Storefront preview",
  robots: { index: false, follow: false },
};

// Rendered inside an iframe by the dashboard "Preview" modal. It holds no data
// of its own: the dashboard posts the preview payload to it.
export default function StorePreviewPage() {
  return <PreviewFrame />;
}
