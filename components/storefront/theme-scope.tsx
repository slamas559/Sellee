import type { ReactNode } from "react";
import { storefrontFontVars } from "@/lib/storefront-fonts";
import { T, themeStyle, type ThemeKey } from "@/lib/storefront-theme";

type ThemeScopeProps = {
  template: ThemeKey;
  primary: string;
  as?: "main" | "div";
  className?: string;
  children: ReactNode;
};

/** Sets the storefront design tokens + fonts for everything inside it. */
export function ThemeScope({ template, primary, as = "main", className = "", children }: ThemeScopeProps) {
  const Tag = as;
  return (
    <Tag
      data-template={template}
      className={`${storefrontFontVars} min-h-screen ${T.bg} ${T.ink} ${className}`}
      style={themeStyle(template, primary)}
    >
      {children}
    </Tag>
  );
}
