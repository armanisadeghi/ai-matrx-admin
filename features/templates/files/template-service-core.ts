/**
 * File-template service, port-injected so the rules are testable without a
 * database. `template-service.ts` binds the real ports (supabase, the workbook
 * and document services, the thumbnail renderer).
 */
import {
  LANE_VISIBILITY,
  SYSTEM_ORGANIZATION_ID,
  TEMPLATE_CATEGORIES,
  templateKindOf,
  toSummary,
  type SaveTemplateLane,
  type TemplateKind,
  type TemplateLane,
  type TemplateRow,
  type TemplateSummary,
} from "./types";

export const TEMPLATE_SUMMARY_COLUMNS =
  "id, kind, name, category, description, thumbnail_file_id, organization_id, visibility, created_by, updated_at, sort_order";

export type ListFilter = {
  kind: TemplateKind;
  lane?: TemplateLane;
  category?: string;
  limit: number;
  userId: string | null;
};

export type InsertTemplate = {
  kind: TemplateKind;
  name: string;
  category: string;
  description: string | null;
  snapshot: unknown;
  organization_id: string;
  visibility: "personal" | "internal" | "public";
  source_record_id: string;
};

export type TemplatePorts = {
  userId: () => Promise<string | null>;
  activeOrgId: () => Promise<string>;
  listRows: (f: ListFilter) => Promise<TemplateRow[]>;
  getSnapshot: (templateId: string) => Promise<{ row: TemplateRow; snapshot: unknown }>;
  insertRow: (row: InsertTemplate) => Promise<TemplateRow>;
  setThumbnail: (templateId: string, fileId: string) => Promise<void>;
  latestRecordSnapshot: (kind: TemplateKind, recordId: string) => Promise<unknown | null>;
  createRecord: (kind: TemplateKind, name: string, orgId: string, snapshot: unknown) => Promise<string>;
  /**
   * Renders + stores the thumbnail; returns its file id — or null for a kind whose tile is drawn
   * live by its own renderer (a presentation's first slide).
   */
  renderThumbnail: (kind: TemplateKind, snapshot: unknown, lane: TemplateLane, templateId: string) => Promise<string | null>;
};

export class TemplateError extends Error {}

export function createTemplateService(ports: TemplatePorts) {
  async function listTemplates(
    kind: TemplateKind,
    opts: { lane?: TemplateLane; category?: string; limit?: number } = {},
  ): Promise<TemplateSummary[]> {
    const userId = opts.lane === "mine" ? await ports.userId() : null;
    if (opts.lane === "mine" && !userId) return [];
    const rows = await ports.listRows({
      kind,
      lane: opts.lane,
      category: opts.category,
      limit: Math.min(Math.max(opts.limit ?? 200, 1), 500),
      userId,
    });
    const summaries = rows.map(toSummary);
    // A lane is a promise about every row it returns — RLS may hand back more.
    return opts.lane ? summaries.filter((s) => s.lane === opts.lane || opts.lane === "mine") : summaries;
  }

  async function createFromTemplate(templateId: string): Promise<{ kind: TemplateKind; id: string }> {
    const { row, snapshot } = await ports.getSnapshot(templateId);
    if (!snapshot) throw new TemplateError("This template has no content.");
    const kind: TemplateKind = templateKindOf(row.kind);
    const orgId = await ports.activeOrgId();
    const id = await ports.createRecord(kind, row.name, orgId, snapshot);
    return { kind, id };
  }

  async function saveAsTemplate(
    kind: TemplateKind,
    recordId: string,
    input: { name: string; category: string; description?: string; lane: SaveTemplateLane },
  ): Promise<TemplateSummary> {
    const name = input.name.trim();
    if (!name) throw new TemplateError("Name the template.");
    if (!(TEMPLATE_CATEGORIES as readonly string[]).includes(input.category)) {
      throw new TemplateError(`Unknown category "${input.category}".`);
    }
    const visibility = LANE_VISIBILITY[input.lane];
    if (!visibility) throw new TemplateError("Featured templates are curated by the platform.");
    const snapshot = await ports.latestRecordSnapshot(kind, recordId);
    if (!snapshot) throw new TemplateError(`Save the ${kind} once before making it a template.`);
    const orgId = await ports.activeOrgId();
    if (orgId === SYSTEM_ORGANIZATION_ID) {
      throw new TemplateError("Switch to one of your organizations to save a template.");
    }
    const row = await ports.insertRow({
      kind,
      name: name.slice(0, 120),
      category: input.category,
      description: input.description?.trim() ? input.description.trim().slice(0, 500) : null,
      snapshot,
      organization_id: orgId,
      visibility,
      source_record_id: recordId,
    });
    const summary = toSummary(row);
    const fileId = await ports.renderThumbnail(kind, snapshot, summary.lane, row.id);
    if (fileId) await ports.setThumbnail(row.id, fileId);
    return { ...summary, thumbnailUrl: fileId };
  }

  return { listTemplates, createFromTemplate, saveAsTemplate };
}
