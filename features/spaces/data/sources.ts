// features/spaces/data/sources.ts — where a database or chart block's records come from.
//
// Two kinds of source, both read through the record store's one client:
//  - a template pack's tables in memory (`props.sample` names the world): `templatePreview` installs the
//    pack's spec into memory — read-only; drawn only by the template gallery's preview;
//  - a real custom table (no `props.sample`): read live as the table's own organization.
// Blocks are filters only: what a person may open is the database's answer, never this code's.

import { templatePreview, type TemplatePreview } from "@ai-matrx/records/memory";
import type { TemplateSpec } from "@ai-matrx/records/templates";

import type { SpaceDataSource } from "../contract";

const worlds = new Map<string, TemplatePreview>();

/** A template pack's tables in memory (the gallery preview), made once per id per page load. Read-only. */
export function registerSampleWorld(id: string, spec: TemplateSpec): TemplatePreview {
  let w = worlds.get(id);
  if (!w) {
    w = templatePreview(spec);
    worlds.set(id, w);
  }
  return w;
}

/** The in-memory world a block's `props.sample` names, or null (a real table, or a world this tab never made). */
export function sampleWorld(id: string | undefined | null): TemplatePreview | null {
  if (!id) return null;
  return worlds.get(id) ?? null;
}

/** One layout a database block can show. `chart` draws the Notion chart view over the same records. */
export type SpaceViewLayout = "grid" | "kanban" | "gallery" | "list" | "calendar" | "timeline" | "chart";

export type ChartType = "donut" | "bar" | "hbar" | "line";
export type ChartOp = "count" | "sum" | "avg" | "min" | "max";

export interface ChartSettings {
  type: ChartType;
  /** X axis: the field whose values become the groups (null = one group). */
  groupBy: string | null;
  /** Y axis: how each group is measured. */
  op: ChartOp;
  /** The field a sum / average / min / max reads. */
  field?: string | null;
  sort?: "manual" | "asc" | "desc";
  legend?: boolean;
  dataLabels?: boolean;
  /** Donut: the total drawn in the middle. */
  centerValue?: boolean;
}

export interface SpaceDbView {
  id: string;
  name: string;
  layout: SpaceViewLayout;
  /** Lucide icon name drawn on the view tab. */
  icon?: string;
  groupField?: string | null;
  dateField?: string | null;
  sorts?: Array<{ field: string; direction: "asc" | "desc" }>;
  /** Field key → value: a scalar is "is", a list is "is any of" (the store's own filter shape). */
  filters?: Record<string, string | number | boolean | null | string[]>;
  /** Property keys this view hides (F4 show/hide). */
  hiddenFields?: string[];
  /**
   * N7 Notion's advanced filter: the view's nested And/Or question in the store's Rule shape (records-ui
   * `ConditionGroup`; groups two levels deep), asked together with `filters`. Saved with the view.
   */
  where?: Record<string, unknown> | null;
  /** N8 Notion's Form view: the table's form (`custom.anon_form`, records-ui FormBuilder) this view edits. */
  formId?: string | null;
  /** N5 the width a person dragged each column to (by property key) and the order they dragged them into. */
  widths?: Record<string, number>;
  columnOrder?: string[];
  /** N5 Notion's per-column "Wrap column": the property keys whose cells wrap. */
  wrapColumns?: string[];
  chart?: ChartSettings;
}

export type AutofillKind = "summary" | "keywords" | "translation" | "custom";
/** One AI autofill property (data/ai-autofill.tsx): a text column of the table plus its job. */
export interface AiFieldSpec {
  key: string;
  label: string;
  kind: AutofillKind;
  instruction?: string;
  language?: string;
}

export function readAiFields(raw: unknown): AiFieldSpec[] {
  return Array.isArray(raw) ? (raw as AiFieldSpec[]).filter((f) => f && typeof f.key === "string" && typeof f.label === "string") : [];
}

/** The stored props of a `database` block (BLOCK-SCHEMA C24 plus the view list this builder adds). */
export interface DatabaseBlockProps {
  source: SpaceDataSource;
  inline: boolean;
  title?: string;
  /** The in-memory preview world this table lives in (template gallery); absent = a real custom table. */
  sample?: string;
  /** Linked view of database (F9): shows the source's name with an arrow. */
  linked?: boolean;
  showTitle?: boolean;
  /** Where a record opens: side peek, center peek or full page. */
  openAs?: "side" | "center" | "page";
  views?: SpaceDbView[];
  activeViewId?: string;
  /** AI autofill properties (data/ai-autofill.tsx): a text column of the table plus its job. */
  aiFields?: AiFieldSpec[];
}

export function readDatabaseProps(p: Record<string, unknown>): DatabaseBlockProps | null {
  const source = p.source as SpaceDataSource | undefined;
  if (!source || (source.kind !== "table" && source.kind !== "entity")) return null;
  return {
    source,
    inline: p.inline !== false,
    title: typeof p.title === "string" ? p.title : undefined,
    sample: typeof p.sample === "string" ? p.sample : undefined,
    linked: p.linked === true,
    showTitle: p.showTitle !== false,
    openAs: p.openAs === "center" || p.openAs === "page" ? p.openAs : "side",
    views: Array.isArray(p.views) ? (p.views as SpaceDbView[]) : undefined,
    activeViewId: typeof p.activeViewId === "string" ? p.activeViewId : undefined,
    aiFields: readAiFields(p.aiFields),
  };
}

export const newViewId = () => `view-${crypto.randomUUID().slice(0, 8)}`;

/**
 * Built-in sources: the platform's own modules, read through the drill doors as the person
 * (`{kind: "entity", token}`). The database decides which rows a person sees.
 */
export const BUILT_IN_SOURCES: ReadonlyArray<{ token: string; name: string; icon: "task" | "project" | "deal" | "employee" }> = [
  { token: "task", name: "Tasks", icon: "task" },
  { token: "project", name: "Projects", icon: "project" },
  { token: "crm_deal", name: "Deals", icon: "deal" },
  { token: "hr_employee", name: "Employees", icon: "employee" },
];
