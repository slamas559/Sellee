import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import "./atlas.css";

const atlasDisplay = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal"],
  variable: "--font-atlas-display",
});

export const metadata: Metadata = {
  title: {
    default: "Atlas",
    template: "%s · Atlas",
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function AdminConsoleRootLayout({ children }: { children: React.ReactNode }) {
  return <div className={`atlas ${atlasDisplay.variable}`}>{children}</div>;
}
