// features/spaces/data/entity-views.ts — what a database block over a built-in source (data/EntityDatabase.tsx)
// offers beside a custom table's (CD-VIEW-11): its layouts, how many rows a view reads, which properties a card
// shows, and which settings each layout takes. Pure; tested in
// __tests__/a-built-in-source-offers-gallery-list-card-size-and-load-limit.test.ts.
import type { Column, Row } from "@ai-matrx/records/data";
import type { Field, ReadRow } from "@ai-matrx/records/react";
import type { EntityColumn, EntityRow } from "@ai-matrx/records-ui";

import { ENTITY_PAGE } from "./first-reads";
import type { SpaceDbView, SpaceViewLayout } from "./sources";
import { blockPageSize, DEFAULT_CARD_FIELDS } from "./view-spec";

/** The layouts a built-in source draws, in the layout menu's order. */
export const ENTITY_LAYOUT_IDS: readonly SpaceViewLayout[] = ["grid", "kanban", "gallery", "list", "calendar", "timeline", "chart"];

/** Rows a built-in view reads at first and per "Load more": its own load limit, else the block's page. */
export function entityPageSize(view: Pick<SpaceDbView, "loadLimit">): number {
  return blockPageSize(view) ?? ENTITY_PAGE;
}

const isBareId = (c: EntityColumn) => /uuid/i.test(c.type) || (c.api_name.endsWith("_id") && !c.lookup);

/** The properties a gallery card or list row shows under its title: the view's shown ones, never a bare id. */
export function entityCardColumns(columns: readonly EntityColumn[], hidden: readonly string[], title: EntityColumn | undefined): EntityColumn[] {
  const off = new Set(hidden);
  return columns.filter((c) => c !== title && !off.has(c.api_name) && !isBareId(c)).slice(0, DEFAULT_CARD_FIELDS);
}

/** Which of the card-size, load-limit, date and sub-group settings a layout takes. */
export function entitySettingsFor(layout: SpaceViewLayout): { cardSize: boolean; loadLimit: boolean; date: boolean; subGroup: boolean } {
  return { cardSize: layout === "gallery", loadLimit: layout !== "chart", date: layout === "calendar" || layout === "timeline", subGroup: layout === "kanban" };
}

/** A module column that holds a day ("date") or an instant ("datetime", "timestamp"). */
export function isEntityDateColumn(c: Pick<EntityColumn, "type">): boolean {
  return c.type === "date" || c.type === "datetime" || c.type === "timestamp";
}

/** The date properties a calendar or a timeline over a built-in source may be placed by (its own, never a lookup's). */
export function entityDateColumns(columns: readonly EntityColumn[]): EntityColumn[] {
  return columns.filter((c) => isEntityDateColumn(c) && !c.lookup);
}

/** The date a calendar or timeline view draws by: the view's own when the source still has it, else the first date. */
export function entityDateFor(view: Pick<SpaceDbView, "dateField">, columns: readonly EntityColumn[]): EntityColumn | null {
  const dates = entityDateColumns(columns);
  return dates.find((c) => c.api_name === view.dateField) ?? dates[0] ?? null;
}

/**
 * A module column in the record store's Field shape, so records-ui's ONE calendar and ONE timeline draw a
 * built-in source exactly as they draw a custom table: a date is a range of kind date / datetime, a number a
 * range, everything else text (a module's choice is its word, never a store pick-list of option records).
 */
export function entityField(c: EntityColumn, index: number): Field {
  const date = isEntityDateColumn(c);
  return {
    id: `entity:${c.api_name}`,
    organization_id: "",
    entity_definition_id: null,
    table_token: null,
    key: c.api_name,
    label: c.name,
    name: c.name,
    type: date || c.type === "number" || c.type === "integer" ? "range" : "text",
    multi: false,
    dated: false,
    rules: [],
    config: date ? { kind: c.type === "date" ? "date" : "datetime" } : {},
    required: false,
    default: null,
    sort: (index + 1) * 10,
    relation_target: null,
    relation_max: null,
    on_target_delete: null,
    inverse_key: null,
    display: null,
    source: "manual",
    source_config: {},
    compute_on: null,
    unit: null,
    format: null,
    sensitivity: null,
    context_policy: null,
    review_interval_days: null,
    depends_on: null,
    applies_to_types: [],
    options_table_id: null,
    created_by: null,
    updated_by: null,
    created_at: "",
    updated_at: "",
    version: 1,
    metadata: {},
    visibility: "organization",
  };
}

/**
 * A built-in source's page as the store's rows. Read as "viewer": the calendar and timeline draw every row and
 * open it on a click (the peek writes through the module's own door); a drag never writes a module row here.
 */
export function entityReadRows(rows: readonly EntityRow[]): ReadRow[] {
  return rows.map((row) => ({ id: String(row.id), document: { ...row }, level: "viewer", hidden: {} }));
}

/**
 * A module column as records-ui's board column (`EntityBoard`). A lookup's word is shown, never written from a
 * card: the peek writes a module's own columns only, so the board moves cards only where the peek may write.
 */
export function entityBoardColumn(c: EntityColumn): Column {
  return { key: c.api_name, label: c.name, type: c.type, origin: "platform", required: false, ...(c.choices ? { choices: c.choices } : {}), readOnly: c.writable !== true || Boolean(c.lookup) };
}

/** A module row as records-ui's board row; `moved` lays a move over it until the re-read rows carry it. */
export function entityBoardRows(rows: readonly EntityRow[], moved: Readonly<Record<string, Record<string, unknown>>> = {}): Row[] {
  return rows.map((row) => {
    const id = String(row.id);
    const version = row["version"];
    const org = row["organization_id"];
    return { ...row, ...(moved[id] ?? {}), _id: id, _version: typeof version === "number" ? version : 0, _organization_id: typeof org === "string" ? org : "" };
  });
}

/** The words a choice cell holds (a word, or a list of words). */
function choiceWord(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(String).join(", ");
  return String(value);
}

/**
 * Notion's board "Sub-group": the rows cut by a second choice property, one band per choice in the property's
 * order, then "No <property>" for rows without one. A band with no rows is left out, so empty choices draw nothing.
 */
export function entitySubGroups(rows: readonly EntityRow[], column: EntityColumn): Array<{ key: string; label: string; rows: EntityRow[] }> {
  const words = column.choices ?? [];
  const known = new Set(words);
  const bands = words.map((w) => ({ key: w, label: w, rows: rows.filter((r) => choiceWord(r[column.api_name]) === w) }));
  const rest = rows.filter((r) => !known.has(choiceWord(r[column.api_name])));
  bands.push({ key: "", label: `No ${column.name.trim().toLowerCase()}`, rows: rest });
  return bands.filter((b) => b.rows.length > 0);
}

/** The choice properties a built-in board groups or sub-groups by (they carry their words). */
export function entityChoiceColumnsOf(columns: readonly EntityColumn[]): EntityColumn[] {
  return columns.filter((c) => c.type === "choice" && Array.isArray(c.choices) && c.choices.length > 0);
}
