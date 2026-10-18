/**
 * THE TABLE TILE'S NAMES (pure, no UI): the item type key and the section layout word, kept on the tile as
 * `source.entity` and `source.meta.layout`. One home for the Add menu (`data-items.tsx`), Get data
 * (`data-fetch/GetDataBody.tsx`) and the board template packs (`templates/board-pack-plan.ts`).
 */

import type { NodeSource } from "../board/document";

export const TABLE_ENTITY = "data-table";

/** `meta.layout` of a table tile drawn as a section (records-ui `SectionCard`) rather than the table page. */
export const TABLE_LAYOUT_SECTION = "section";

/**
 * A TABLE TILE OVER A REAL SCHEMA TABLE. The platform keeps its own data in tables made with
 * `platform.create_entity_table` (`web.brand_choice`, token `web_brand_choice`), not in custom Tables, so a
 * table tile carries EITHER a custom Table's id (`source.id`) OR a registered entity token
 * (`meta.token`, `source.id` null), optionally pinned to one parent (`meta.filter`, JSON `{ "brand_id": "…" }`:
 * a component table shows that parent's rows only). Drawn by records-ui's `SectionCard` / `RecordsTableCard`
 * with `source: { kind: "entity", token, filter }`.
 */
export const TABLE_META_TOKEN = "token";
export const TABLE_META_FILTER = "filter";

/** A parent constraint: every key equals its value. */
export type EntityTileFilter = Record<string, string | number | boolean | null>;

function readFilter(raw: string | undefined): EntityTileFilter | undefined {
  if (!raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
    const out: EntityTileFilter = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean") out[k] = v;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  } catch {
    // A filter that does not read is dropped LOUDLY: showing every parent's rows silently would be a lie.
    console.error(`[board] a table tile's filter is not JSON and was ignored: ${raw}`);
    return undefined;
  }
}

/** The entity token (and parent filter) a table tile shows, or null when it shows a custom Table. */
export function entityTableOf(source: NodeSource): { token: string; filter?: EntityTileFilter } | null {
  if (source.kind !== "entity" || source.entity !== TABLE_ENTITY) return null;
  const token = source.meta?.[TABLE_META_TOKEN];
  if (!token) return null;
  const filter = readFilter(source.meta?.[TABLE_META_FILTER]);
  return filter ? { token, filter } : { token };
}

/** A table tile over a registered entity token, optionally pinned to one parent and drawn as a section. */
export function entityTableSource(token: string, options: { filter?: EntityTileFilter; layout?: "section" | "table" } = {}): NodeSource {
  const meta: Record<string, string> = { [TABLE_META_TOKEN]: token };
  if (options.filter && Object.keys(options.filter).length > 0) meta[TABLE_META_FILTER] = JSON.stringify(options.filter);
  if (options.layout === "section") meta.layout = TABLE_LAYOUT_SECTION;
  return { kind: "entity", entity: TABLE_ENTITY, id: null, meta };
}

/** The plug-in looks that name what a section holds, most telling first (a colour table's name column is plain text). */
const LOOK_ORDER = ["color_pair", "color", "type_style", "measure", "shadow", "opacity", "motion", "html_sample", "attachment"] as const;

/** A column's look id and options, read defensively (the field document carries it as `display_format`). */
function lookOf(field: unknown): { id: string; options: Record<string, unknown> } | null {
  if (!field || typeof field !== "object") return null;
  const f = field as Record<string, unknown>;
  const df = f.display_format;
  if (df && typeof df === "object" && typeof (df as Record<string, unknown>).id === "string") {
    const o = (df as Record<string, unknown>).options;
    return { id: (df as { id: string }).id, options: o && typeof o === "object" ? (o as Record<string, unknown>) : {} };
  }
  if (typeof df === "string") return { id: df, options: {} };
  if (typeof f.format === "string") return { id: f.format, options: {} };
  return null;
}

/**
 * What a table holds, as the outline's icon hint (`engine/tile-chrome.ts` `LOOK_ICON` keys): the most
 * telling plug-in look its columns wear — a measure says spacing or radius by its preview. Null = none.
 */
export function tableLookHint(fields: readonly unknown[]): string | null {
  const looks = fields.map(lookOf).filter((l): l is { id: string; options: Record<string, unknown> } => l !== null);
  for (const id of LOOK_ORDER) {
    const hit = looks.find((l) => l.id === id);
    if (!hit) continue;
    if (id === "measure") {
      const preview = hit.options.measurePreview;
      return preview === "radius" ? "measure_radius" : preview === "spacing" ? "measure_spacing" : "measure";
    }
    return id;
  }
  return null;
}
