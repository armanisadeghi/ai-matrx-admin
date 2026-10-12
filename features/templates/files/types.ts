/**
 * File templates — the Docs / Sheets template gallery (workbooks and documents).
 *
 * Store: `workbench.file_template` (token `file_template`). A template is a
 * Univer snapshot plus a name, a category and a rendered thumbnail (a file id,
 * rendered with the media primitives). Lanes are derived, never stored:
 *   featured  = owned by the Matrx System organization (platform-curated)
 *   mine      = visibility 'personal' (created by the caller)
 *   org       = visibility 'internal' in one of the caller's organizations
 *   community = visibility 'public' (every signed-in person)
 * Frozen interface: H-tpl ↔ H-home contract (contract-templates.md).
 */

export type TemplateKind = "workbook" | "document" | "presentation";
export type TemplateLane = "featured" | "mine" | "org" | "community";
export type SaveTemplateLane = Exclude<TemplateLane, "featured">;

export interface TemplateSummary {
  id: string;
  kind: TemplateKind;
  name: string;
  category: string;
  description?: string;
  lane: TemplateLane;
  /** Durable file ref (a file id) — render with `InlineMediaRef`; null until rendered. */
  thumbnailUrl?: string | null;
  updatedAt: string;
}

/** The Matrx System organization — featured (platform-curated) templates live here. */
export const SYSTEM_ORGANIZATION_ID = "39c38960-d30c-4840-b0c1-c9960de95582";

/** Gallery sections, in Google's order. A template carries exactly one. */
export const TEMPLATE_CATEGORIES = [
  "Personal",
  "Work",
  "Project management",
  "Finance",
  "Education",
] as const;

export const TEMPLATE_LANE_LABELS: Record<TemplateLane, string> = {
  featured: "Featured",
  mine: "Mine",
  org: "My organizations",
  community: "Community",
};

export const LANE_VISIBILITY: Record<SaveTemplateLane, "personal" | "internal" | "public"> = {
  mine: "personal",
  org: "internal",
  community: "public",
};

export type TemplateRow = {
  id: string;
  kind: string;
  name: string;
  category: string;
  description: string | null;
  thumbnail_file_id: string | null;
  organization_id: string;
  visibility: string;
  created_by: string | null;
  updated_at: string;
  sort_order: number;
};

export function templateKindOf(kind: string): TemplateKind {
  return kind === "document" || kind === "presentation" ? kind : "workbook";
}

export function laneOf(row: Pick<TemplateRow, "organization_id" | "visibility">): TemplateLane {
  if (row.organization_id === SYSTEM_ORGANIZATION_ID) return "featured";
  if (row.visibility === "public") return "community";
  if (row.visibility === "personal") return "mine";
  return "org";
}

export function toSummary(row: TemplateRow): TemplateSummary {
  return {
    id: row.id,
    kind: templateKindOf(row.kind),
    name: row.name,
    category: row.category,
    ...(row.description ? { description: row.description } : {}),
    lane: laneOf(row),
    thumbnailUrl: row.thumbnail_file_id,
    updatedAt: row.updated_at,
  };
}
