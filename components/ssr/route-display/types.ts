export interface RouteDisplayData {
  routes: string[];
  groups: Record<string, string[]>;
  sortedGroupKeys: string[];
  basePath: string;
  title?: string;
  description?: string;
  hasGroups: boolean;
}

export type RouteDisplayVariant =
  | "grouped-cards"
  | "data-table"
  | "expandable-sections"
  | "flat-list";

export interface RouteDisplayProps {
  data: RouteDisplayData;
}

export const VARIANT_LABELS: Record<RouteDisplayVariant, string> = {
  "grouped-cards": "Grouped Cards",
  "data-table": "Data Table",
  "expandable-sections": "Expandable Sections",
  "flat-list": "Flat List",
};
