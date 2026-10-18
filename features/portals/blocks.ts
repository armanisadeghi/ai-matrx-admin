// features/portals/blocks.ts — THE BLOCKS A PORTAL PAGE IS BUILT FROM (lane PORTAL-BLOCKS).
//
// Champions: Softr and Glide — a client's page is a stack of tiles, charts and lists over HER data.
//
// ONE RULE: A BLOCK IS A VIEW OVER ROWS THE DOOR ALREADY GAVE HER, never a second door. Every
// number here is computed from the records `custom.read_records` returned as her, after `isHers`
// kept them to her client — so a second client sees different numbers, and a master with more
// access never sees everybody's under her own name. Every Field key a block names is kept to the
// Table's `visible_fields` (the portal's own list), so a block can never print or sum a column the
// portal did not open. A block that names something not shown says so, in a sentence, and its
// siblings still draw.
//
// The drawing is records-ui's ONE `ChartBlock` (bar / line / donut, with its data labels), fed a
// `DashboardBlockResult` built here; there is no portal-only chart.
//
// Pure — no I/O — so the arithmetic and the masking are tested without a browser.

import type { AggregateRow, DashboardBlockResult } from "@ai-matrx/records";
import { measureKey } from "@ai-matrx/records";

import type { PortalStage } from "./service";

export const PORTAL_BLOCK_KINDS = ["kpi", "bar", "line", "donut", "list", "cards", "table"] as const;
export type PortalBlockKind = (typeof PORTAL_BLOCK_KINDS)[number];
export const CHART_KINDS = ["bar", "line", "donut"] as const;
export type PortalMeasureOp = "count" | "sum" | "avg" | "min" | "max";

/** One block, exactly as the store keeps it (`custom.portal.config.blocks`). */
export interface PortalBlock {
  kind: PortalBlockKind;
  table_id: string;
  title?: string;
  /** Charts: the Field the groups are made from. */
  group_by?: string;
  measure_op?: PortalMeasureOp;
  /** The Field summed / averaged; absent for a count. */
  measure_key?: string;
  /** List, cards, table: the Fields shown on each item, in order. */
  fields?: string[];
  /** The Fields the record's own page shows for this Table (the owner's choice). */
  detail_fields?: string[];
}

export interface BlockContext {
  /** The Table's visible Field keys and labels — the only keys a block may read. */
  shown: Array<{ key: string; label: string; type: string }>;
  stage?: PortalStage | null | undefined;
  /** HER rows only (already through the door and `isHers`). */
  rows: Array<{ id: string; document: Record<string, unknown> }>;
}

/** A number out of a stored value, or null. */
export function numeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) return Number(value);
  return null;
}

/** The sentence that says why a block cannot draw, or null when it can. */
export function blockProblem(block: PortalBlock, ctx: BlockContext): string | null {
  const known = new Set(ctx.shown.map((f) => f.key));
  if ((CHART_KINDS as readonly string[]).includes(block.kind)) {
    if (!block.group_by) return "Pick what to group this chart by.";
    if (!known.has(block.group_by)) return "This chart groups by a field this portal does not show.";
  }
  if (block.measure_op && block.measure_op !== "count") {
    if (!block.measure_key) return "Pick the field to add up.";
    if (!known.has(block.measure_key)) return "This block adds up a field this portal does not show.";
  }
  return null;
}

/** The fields a list block shows, kept to what the portal shows, in the block's order (default: the Table's). */
export function listFields(block: PortalBlock, shown: BlockContext["shown"]): BlockContext["shown"] {
  const worded = shown.filter((f) => f.type !== "relation");
  if (!block.fields || block.fields.length === 0) return worded;
  const byKey = new Map(worded.map((f) => [f.key, f]));
  return block.fields.map((k) => byKey.get(k)).filter((f): f is BlockContext["shown"][number] => !!f);
}

/** The fields the record's page shows: the owner's `detail_fields` kept to what the portal shows; null = all shown. */
export function detailFieldKeys(blocks: readonly PortalBlock[] | undefined, tableId: string, shownKeys: readonly string[]): string[] | null {
  const chosen = (blocks ?? []).find((b) => b.table_id === tableId && b.detail_fields && b.detail_fields.length > 0);
  if (!chosen?.detail_fields) return null;
  const known = new Set(shownKeys);
  return chosen.detail_fields.filter((k) => known.has(k));
}

function reduce(op: PortalMeasureOp, values: number[], rows: number): number | null {
  if (op === "count") return rows;
  if (values.length === 0) return null;
  if (op === "sum") return values.reduce((a, b) => a + b, 0);
  if (op === "avg") return values.reduce((a, b) => a + b, 0) / values.length;
  if (op === "min") return Math.min(...values);
  return Math.max(...values);
}

function valuesOf(rows: BlockContext["rows"], key: string | undefined): number[] {
  return key ? rows.map((r) => numeric(r.document[key])).filter((v): v is number => v !== null) : [];
}

/** The one number a KPI tile shows. */
export function kpiValue(block: PortalBlock, ctx: BlockContext): number | null {
  return reduce(block.measure_op ?? "count", valuesOf(ctx.rows, block.measure_key), ctx.rows.length);
}

function groupWord(raw: unknown, groupKey: string, ctx: BlockContext): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const text = Array.isArray(raw) ? raw.map(String).join(", ") : String(raw);
  if (ctx.stage && ctx.stage.field === groupKey) return ctx.stage.stages.find((s) => s.key === text)?.label ?? text;
  return text;
}

/** A chart block as the `DashboardBlockResult` records-ui's `ChartBlock` draws — computed over her rows only. */
export function chartResult(block: PortalBlock, ctx: BlockContext): DashboardBlockResult {
  const op = block.measure_op ?? "count";
  const measure = (op === "count" ? { op } : { op, key: block.measure_key ?? "" }) as NonNullable<DashboardBlockResult["measures"]>[number];
  const mKey = measureKey(measure);
  const group = block.group_by ?? "";
  const buckets = new Map<string | null, BlockContext["rows"]>();
  for (const row of ctx.rows) {
    const k = groupWord(row.document[group], group, ctx);
    buckets.set(k, [...(buckets.get(k) ?? []), row]);
  }
  const rows: AggregateRow[] = [...buckets.entries()].slice(0, 200).map(([k, list]) => ({
    groups: { [group]: k },
    measures: { [mKey]: reduce(op, valuesOf(list, block.measure_key), list.length) },
    row_count: list.length,
  }));
  return { title: block.title ?? "", kind: block.kind, table_id: block.table_id, group_by: [group], measures: [measure], rows };
}
