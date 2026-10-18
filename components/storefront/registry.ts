import type { ComponentType } from "react";
import type { TemplateKey } from "@/lib/storefront-theme";
import { EditorialTemplate } from "./templates/editorial";
import { GridTemplate } from "./templates/grid";
import { MarketTemplate } from "./templates/market";
import { ShowcaseTemplate } from "./templates/showcase";
import type { TemplateProps } from "./types";

/**
 * One entry per storefront template. To add a template: build a component in
 * ./templates, add its tokens in lib/storefront-theme.ts, register it here.
 */
export const STOREFRONT_TEMPLATES: Record<TemplateKey, ComponentType<TemplateProps>> = {
  grocery_promo: MarketTemplate,
  fashion_editorial: EditorialTemplate,
  lifestyle_showcase: ShowcaseTemplate,
  modern_grid: GridTemplate,
};
