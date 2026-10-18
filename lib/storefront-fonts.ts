import { Archivo, Bricolage_Grotesque, DM_Sans, Fraunces, Manrope } from "next/font/google";

// Loaded only by storefront routes. preload is off so a store page does not
// download all five families; the browser fetches just the ones its template
// actually uses (the CSS variables decide which).

const manrope = Manrope({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-manrope" });
const fraunces = Fraunces({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-fraunces" });
const dmSans = DM_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-dm-sans" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-bricolage" });
const archivo = Archivo({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-archivo" });

export const storefrontFontVars = [
  manrope.variable,
  fraunces.variable,
  dmSans.variable,
  bricolage.variable,
  archivo.variable,
].join(" ");
