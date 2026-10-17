/**
 * A Tool answer, read as table rows (lane L6b). Pure: no network, no store.
 *
 * A row-shaped answer keeps its rows in the ONE array-of-objects property of its kind; each scalar
 * field of an item becomes a column, titled by the kind schema (our words), and the item field marked
 * `x-row-key` is the dedupe key (several = a composite key). A single-record answer is one row.
 * No marked key falls back to the first conventional identifier, then to the whole row, so a re-run
 * never duplicates what is already in the table.
 */

import { KIND_KEY } from "@ai-matrx/content-ir";

export type Cell = string | number | boolean | null;

export type ResultRows = {
  /** The array property the rows came from; null for a single-record answer. */
  rowsKey: string | null;
  headers: string[];
  /** The single header the table is deduped on (a synthetic "Key" column when the key is composite). */
  keyHeader: string;
  rows: Record<string, Cell>[];
};

type Schema = {
  type?: string | string[];
  title?: string;
  properties?: Record<string, Schema>;
  items?: Schema;
  $ref?: string;
  $defs?: Record<string, Schema>;
  [k: string]: unknown;
};

const SYNTHETIC_KEY = "Key";
const ROW_KEY_FIELD = "row_key";
const CONVENTIONAL_KEYS = ["url", "link", "profile_url", "post_url", "id", "email", "domain", "keyword", "name"];

function resolve(node: Schema | undefined, root: Schema | undefined): Schema | undefined {
  let current = node;
  for (let hops = 0; current?.$ref && hops < 8; hops++) {
    const name = current.$ref.replace(/^#\/(\$defs|definitions)\//, "");
    const defs = (root?.$defs ?? (root as { definitions?: Record<string, Schema> } | undefined)?.definitions) ?? {};
    current = defs[name];
  }
  return current;
}

function typeOf(node: Schema | undefined): string[] {
  const t = node?.type;
  if (Array.isArray(t)) return t;
  return typeof t === "string" ? [t] : [];
}

function humanize(key: string): string {
  const words = key.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function toCell(v: unknown): Cell | undefined {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
  if (Array.isArray(v) && v.every((x) => ["string", "number", "boolean"].includes(typeof x))) return v.join(", ");
  return undefined; // nested structure is not a column
}

/** The kind's rows property: the schema's one array of objects, else the output's. */
function findRowsKey(output: Record<string, unknown>, schema: Schema | undefined): string | null {
  const fromSchema = Object.entries(schema?.properties ?? {}).filter(([, p]) => {
    const prop = resolve(p, schema);
    return typeOf(prop).includes("array") && typeOf(resolve(prop?.items, schema)).includes("object");
  });
  if (fromSchema.length === 1) return fromSchema[0][0];
  const named = ["items", "rows", "results"].find((k) => Array.isArray(output[k]));
  if (named) return named;
  const arrays = Object.entries(output).filter(([, v]) => Array.isArray(v) && v.length > 0 && v.every(isPlainObject));
  return arrays.length === 1 ? arrays[0][0] : null;
}

export function describeRows(output: unknown, schema?: unknown): ResultRows | null {
  if (!isPlainObject(output)) return null;
  const root = (isPlainObject(schema) ? schema : undefined) as Schema | undefined;
  const rowsKey = findRowsKey(output, root);

  let itemSchema: Schema | undefined;
  let sourceRows: Record<string, unknown>[];
  if (rowsKey) {
    const prop = resolve(root?.properties?.[rowsKey], root);
    itemSchema = resolve(prop?.items, root);
    sourceRows = (output[rowsKey] as unknown[]).filter(isPlainObject);
  } else {
    itemSchema = root;
    sourceRows = [output];
  }
  if (sourceRows.length === 0) return null;

  const props = itemSchema?.properties ?? {};
  const fieldOrder = Object.keys(props).length > 0 ? Object.keys(props) : Object.keys(sourceRows[0]);
  const fields = fieldOrder.filter((f) => f !== KIND_KEY);

  const columns: { field: string; header: string }[] = [];
  for (const field of fields) {
    const sample = sourceRows.find((r) => toCell(r[field]) !== undefined && r[field] != null);
    const declared = resolve(props[field], root);
    const nested = declared !== undefined && (typeOf(declared).includes("object") || (typeOf(declared).includes("array") && typeOf(resolve(declared.items, root)).includes("object")));
    if (nested || (sample === undefined && declared === undefined)) continue;
    if (sample !== undefined && toCell(sample[field]) === undefined) continue;
    columns.push({ field, header: (declared?.title as string | undefined)?.trim() || humanize(field) });
  }
  if (columns.length === 0) return null;

  // The key is declared on the kind: a field named `row_key` (what an existing kind can add without breaking
  // its contract) or any field marked `x-row-key`.
  const declaredKey = columns.filter((c) => c.field === ROW_KEY_FIELD);
  const marked = declaredKey.length > 0 ? declaredKey : columns.filter((c) => (resolve(props[c.field], root) as Schema | undefined)?.["x-row-key"] === true);
  const conventional = CONVENTIONAL_KEYS.map((k) => columns.find((c) => c.field === k)).find(Boolean);
  const keyColumns = marked.length > 0 ? marked : conventional ? [conventional] : columns;

  const headers = columns.map((c) => c.header);
  const keyHeader = keyColumns.length === 1 ? keyColumns[0].header : SYNTHETIC_KEY;
  if (keyColumns.length > 1 && !headers.includes(SYNTHETIC_KEY)) headers.push(SYNTHETIC_KEY);

  const seen = new Set<string>();
  const rows: Record<string, Cell>[] = [];
  for (const source of sourceRows) {
    const row: Record<string, Cell> = {};
    for (const c of columns) row[c.header] = toCell(source[c.field]) ?? null;
    if (keyColumns.length > 1) row[SYNTHETIC_KEY] = keyColumns.map((c) => String(row[c.header] ?? "")).join(" | ");
    const key = String(row[keyHeader] ?? "");
    if (key === "" || seen.has(key)) continue; // an answer row with no identity cannot be deduped, and a repeat is one row
    seen.add(key);
    rows.push(row);
  }
  return rows.length === 0 ? null : { rowsKey, headers, keyHeader, rows };
}

/** The same rows as the strings a "Save to a table" grid takes. */
export function asGrid(described: ResultRows): { headers: string[]; rows: string[][] } {
  return { headers: described.headers, rows: described.rows.map((r) => described.headers.map((h) => (r[h] == null ? "" : String(r[h])))) };
}
