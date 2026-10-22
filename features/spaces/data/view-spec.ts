// features/spaces/data/view-spec.ts — the ONE builder of a Spaces grid's saved-view spec. The browser's
// grid (DatabaseBlock) and the server's first page (page/space-page-seed.server.ts, `askTablePageSeed({ view })`)
// both call `viewSpec`, so the page the server asks for is the page the grid asks for. No "use client": the
// server imports it.

import type { RuleExpression } from "@ai-matrx/records";
import type { Field } from "@ai-matrx/records/react";
import type { SavedViewSpec } from "@ai-matrx/records-ui";

import type { SpaceDbView } from "./sources";

/** The field's parity type when the store sends it (the memory store does), else its behavior word. */
export function kindOf(f: Field): string {
  const parity: unknown = (f as unknown as Record<string, unknown>)["parity_type"];
  return typeof parity === "string" ? parity : String(f.type);
}

/** A custom table's view filter: its "is" filters (lists are a built-in source's "any of"). */
export function scalarFilters(f: SpaceDbView["filters"]): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(f ?? {})) if (!Array.isArray(v)) out[k] = v;
  return out;
}

/**
 * THE QUESTION A BLOCK'S GRID ASKS (the `filter` handed to records-ui's ViewSwitcher, which reads no `where` of
 * its own): the view's saved `where` (N7's advanced filter, a pack's within / me / anyOf) ANDed with its "is"
 * filters by field id, or the "is" filters alone. Undefined = every row.
 */
export function blockQuestion(view: Pick<SpaceDbView, "filters" | "where">, fields: Field[]): Record<string, string | number | boolean | null> | RuleExpression | undefined {
  const flat = scalarFilters(view.filters);
  const keys = Object.keys(flat);
  const where = view.where && typeof view.where === "object" ? (view.where as unknown as RuleExpression) : null;
  if (!where) return keys.length ? flat : undefined;
  if (!keys.length) return where;
  const idOf = (key: string) => fields.find((f) => f.key === key)?.id ?? key;
  const is = keys.map((k) => (flat[k] === null ? { op: "is_empty", args: [{ field: idOf(k) }] } : { op: "eq", args: [{ field: idOf(k) }, { const: flat[k] }] }));
  return { op: "and", args: [where, ...is] } as unknown as RuleExpression;
}

/** Notion's default date is "Full date" (January 1, 2026): every date column of an inline grid. */
function longDates(fields: Field[]): Record<string, { id: "date"; options: { dateStyle: "long" } }> {
  const out: Record<string, { id: "date"; options: { dateStyle: "long" } }> = {};
  for (const f of fields) if (kindOf(f) === "date" || kindOf(f) === "datetime") out[f.key] = { id: "date", options: { dateStyle: "long" } };
  return out;
}

/**
 * N6 — the calculation row: the footer measure each column shows (Count all, Sum, Average…), picked on
 * the table's own footer and saved with the block's view (`summaries`, a key the stored view carries
 * through; records-ui's summary bar draws and computes it).
 */
export type ViewWithSummaries = SpaceDbView & { summaries?: Record<string, string> };

/** Notion's board / gallery / calendar cards open showing a few of the database's properties, not just the title. */
export const DEFAULT_CARD_FIELDS = 4;

export function isCardLayout(layout: string): boolean {
  return layout === "kanban" || layout === "gallery" || layout === "calendar" || layout === "timeline";
}

/**
 * The property keys a view hides. A saved list wins (the Properties menu writes it). A card view with none saved
 * hides every property past the first few (dates always show on a card), so a new view draws like Notion's.
 */
export function effectiveHidden(view: Pick<SpaceDbView, "layout" | "hiddenFields" | "groupField" | "dateField">, fields: Field[]): string[] {
  if (view.hiddenFields) return view.hiddenFields;
  if (!isCardLayout(view.layout)) return [];
  // The first property is the record's title (the card's heading), so it never counts against the cap.
  const pool = fields.slice(1).filter((f) => f.key !== view.groupField && f.key !== view.dateField && kindOf(f) !== "date" && kindOf(f) !== "datetime");
  return pool.slice(DEFAULT_CARD_FIELDS).map((f) => f.key);
}

/** Notion's load limits: how many rows a database view reads at first. */
export const LOAD_LIMITS = [10, 25, 50, 100] as const;

/** The page size a block's view asks for: its own load limit, or undefined for records-ui's default. */
export function blockPageSize(view: Pick<SpaceDbView, "loadLimit">): number | undefined {
  const n = view.loadLimit;
  return typeof n === "number" && (LOAD_LIMITS as readonly number[]).includes(n) ? n : undefined;
}

/** Notion's card sizes for a board and a gallery. */
export const CARD_SIZES = ["small", "medium", "large"] as const;
export type CardSize = (typeof CARD_SIZES)[number];

const isCardSize = (v: unknown): v is CardSize => typeof v === "string" && (CARD_SIZES as readonly string[]).includes(v);

/** The records-ui presentation key a layout's card size lives in (absent: the layout has no card size). */
function cardSizeKey(layout: string): "gallerySize" | "boardSize" | null {
  return layout === "gallery" ? "gallerySize" : layout === "kanban" ? "boardSize" : null;
}

/** A card size a person picked on the board or gallery itself (records-ui's look patch), to keep on the view. */
export function cardSizeFromLook(layout: string, presentation: Record<string, unknown> | undefined): CardSize | undefined {
  const key = cardSizeKey(layout);
  const v = key ? presentation?.[key] : undefined;
  return isCardSize(v) ? v : undefined;
}

export function viewSpec(tableId: string, view: ViewWithSummaries, fields: Field[] = []): SavedViewSpec {
  const layout = view.layout === "chart" ? "grid" : view.layout;
  const formats = longDates(fields);
  const hasFormats = Object.keys(formats).length > 0;
  const hidden = effectiveHidden(view, fields);
  const sizeKey = cardSizeKey(layout);
  const size = sizeKey && isCardSize(view.cardSize) ? { [sizeKey]: view.cardSize } : {};
  return {
    name: view.name,
    subject: tableId,
    layout,
    groupField: view.groupField ?? null,
    swimlaneField: layout === "kanban" ? (view.subGroupField ?? null) : null,
    dateField: view.dateField ?? null,
    startField: view.dateField ?? null,
    sorts: view.sorts ?? [],
    filters: scalarFilters(view.filters),
    ...(view.where ? { where: view.where as unknown as RuleExpression } : {}),
    // Notion's inline table: columns at their natural width, one line each, the table scrolling sideways
    // inside the block when it is wider than the column it sits in (screenshot 1) — never squeezed to "…".
    presentation: { fit: "scroll", wrap: false, ...(hidden.length && !isCardLayout(layout) ? { hiddenFields: hidden } : {}), ...(isCardLayout(layout) ? { cardHidden: hidden } : {}), ...(hasFormats ? { formats } : {}), ...(view.summaries && Object.keys(view.summaries).length ? { summaries: view.summaries } : {}), ...(view.widths && Object.keys(view.widths).length ? { widths: view.widths } : {}), ...(view.columnOrder?.length ? { columnOrder: view.columnOrder } : {}), ...(view.wrapColumns?.length ? { wrapColumns: view.wrapColumns } : {}), ...size },
  };
}
