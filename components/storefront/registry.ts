import type { ComponentType } from "react";
import type { TemplateKey } from "@/lib/storefront-theme";
import { EditorialTemplate } from "./templates/editorial";
import { BeautyTemplate } from "./templates/beauty";
import { GridTemplate } from "./templates/grid";
import { HomeTemplate } from "./templates/home";
import { LookbookTemplate } from "./templates/lookbook";
import { MarketTemplate } from "./templates/market";
import { NoirTemplate } from "./templates/noir";
import { ShowcaseTemplate } from "./templates/showcase";
import { StreetTemplate } from "./templates/street";
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
  street_drop: StreetTemplate,
  soft_beauty: BeautyTemplate,
  home_living: HomeTemplate,
  noir_gallery: NoirTemplate,
  lookbook: LookbookTemplate,
};
