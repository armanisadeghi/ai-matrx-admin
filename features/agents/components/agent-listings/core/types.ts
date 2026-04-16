import type { AgentSortOption } from "@/features/agents/redux/agent-consumers/slice";

export type RightPanel = "detail" | "sort" | "categories" | "tags" | null;

export const SORT_OPTIONS: { value: AgentSortOption; label: string }[] = [
  { value: "updated-desc", label: "Recent" },
  { value: "created-desc", label: "Created" },
  { value: "name-asc", label: "A \u2192 Z" },
  { value: "name-desc", label: "Z \u2192 A" },
  { value: "category-asc", label: "Category" },
];

export const PANEL_HEIGHT = "528px";
export const LIST_MAX_HEIGHT = "528px";
