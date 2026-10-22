// The page-top bake-off (ui-sharp): a brand's sections, grouped into the tabs row.
// One tab per section GROUP of the real brand workspace (MARKETING_BRAND_SECTIONS), so the
// tabs stay few and calm while every real section is one row away inside its tab.
import {
  MARKETING_BRAND_SECTION_GROUPS,
  listMarketingBrandModes,
  type MarketingBrandMode,
  type MarketingBrandSectionGroup,
} from "@/features/marketing/lib/brand-sections";

export type BrandTabId =
  | "overview"
  | "websites"
  | "socials"
  | "locations"
  | "identity"
  | "content"
  | "outreach"
  | "competitors"
  | "settings";

const TAB_OF_GROUP: Record<MarketingBrandSectionGroup, { id: BrandTabId; label: string }> = {
  Start: { id: "overview", label: "Overview" },
  Websites: { id: "websites", label: "Websites" },
  Socials: { id: "socials", label: "Socials" },
  Locations: { id: "locations", label: "Locations" },
  Identity: { id: "identity", label: "Identity" },
  Content: { id: "content", label: "Content" },
  Outreach: { id: "outreach", label: "Outreach" },
  "Competitors & monitoring": { id: "competitors", label: "Competitors" },
  Manage: { id: "settings", label: "Settings" },
};

export interface BrandTab {
  id: BrandTabId;
  label: string;
  sections: MarketingBrandMode[];
}

export function brandTabs(brandPath: string): BrandTab[] {
  const modes = listMarketingBrandModes(brandPath);
  return MARKETING_BRAND_SECTION_GROUPS.map((group) => ({
    ...TAB_OF_GROUP[group],
    sections: modes.filter((m) => m.group === group),
  })).filter((t) => t.sections.length > 0);
}

export function isBrandTabId(value: string | null | undefined, tabs: readonly BrandTab[]): value is BrandTabId {
  return value != null && tabs.some((t) => t.id === value);
}
