/**
 * THE TABLE TILE'S NAMES (pure, no UI): the item type key and the section layout word, kept on the tile as
 * `source.entity` and `source.meta.layout`. One home for the Add menu (`data-items.tsx`), Get data
 * (`data-fetch/GetDataBody.tsx`) and the board template packs (`templates/board-pack-plan.ts`).
 */

import type { NodeSource } from "../board/document";

export const TABLE_ENTITY = "data-table";

/** `meta.layout` of a table tile drawn as a section (records-ui `SectionCard`) rather than the table page. */
export const TABLE_LAYOUT_SECTION = "section";

/** `meta.layout` of a custom-table tile drawn as a table card (records-ui `RecordsTableCard`): a click on a row opens that row's detail inside the card, with Back. */
export const TABLE_LAYOUT_CARD = "card";

/**
 * A TABLE TILE OVER A REAL SCHEMA TABLE. The platform keeps its own data in tables made with
 * `platform.create_entity_table` (`web.brand_choice`, token `web_brand_choice`), not in custom Tables, so a
 * table tile carries EITHER a custom Table's id (`source.id`) OR a registered entity token
 * (`meta.token`, `source.id` null), optionally pinned to one parent (`meta.filter`, JSON `{ "brand_id": "…" }`:
 * a component table shows that parent's rows only). Drawn by records-ui's `SectionCard` / `RecordsTableCard`
 * with `source: { kind: "entity", token, filter }`.
 */
export const TABLE_META_TOKEN = "token";
/** The template pack's table token on a custom-Table tile ("color", "type_style"…), stamped at install. */
export const TABLE_META_PACK_TOKEN = "table_token";
export const TABLE_META_FILTER = "filter";
/** `meta.read_only` = "true": the tile shows the rows and never writes, whatever the person's level (drawn as a section). */
export const TABLE_META_READ_ONLY = "read_only";

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
export function entityTableOf(source: NodeSource): { token: string; filter?: EntityTileFilter; readOnly?: true } | null {
  // A tile with a custom Table id is never a schema table, whatever its meta says (a template stamps its
  // pack table token as `meta.table_token`; boards made 2026-10-19 carry it as `meta.token` beside the id).
  if (source.kind !== "entity" || source.entity !== TABLE_ENTITY || source.id) return null;
  const token = source.meta?.[TABLE_META_TOKEN];
  if (!token) return null;
  const filter = readFilter(source.meta?.[TABLE_META_FILTER]);
  const readOnly = source.meta?.[TABLE_META_READ_ONLY] === "true";
  return { token, ...(filter ? { filter } : {}), ...(readOnly ? { readOnly: true as const } : {}) };
}

/**
 * The custom Table a table tile shows — its id and, for a template's table, the pack token stamped at install
 * ("color", "type_style"…) — or null for any other tile. What `board_items` names so an agent can reach the
 * table's rows through the records tool by id, whether or not the tile is awake.
 */
export function customTableOf(source: NodeSource): { id: string; token?: string } | null {
  if (source.kind !== "entity" || source.entity !== TABLE_ENTITY || !source.id) return null;
  // Boards made 2026-10-19 carry the pack token as `meta.token` beside the id.
  const token = source.meta?.[TABLE_META_PACK_TOKEN] ?? source.meta?.[TABLE_META_TOKEN];
  return { id: source.id, ...(token ? { token } : {}) };
}

/**
 * A table tile over a registered entity token, optionally pinned to one parent and drawn as a section.
 * `readOnly`: shows the rows and never writes; always a section (records-ui's `SectionCard` is the card with a
 * read-only option), whatever `layout` says.
 */
export function entityTableSource(token: string, options: { filter?: EntityTileFilter; layout?: "section" | "table"; readOnly?: boolean } = {}): NodeSource {
  const meta: Record<string, string> = { [TABLE_META_TOKEN]: token };
  if (options.filter && Object.keys(options.filter).length > 0) meta[TABLE_META_FILTER] = JSON.stringify(options.filter);
  if (options.layout === "section" || options.readOnly) meta.layout = TABLE_LAYOUT_SECTION;
  if (options.readOnly) meta[TABLE_META_READ_ONLY] = "true";
  return { kind: "entity", entity: TABLE_ENTITY, id: null, meta };
}

/** The plug-in looks that name what a section holds, most telling first (a color table's name column is plain text). */
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
