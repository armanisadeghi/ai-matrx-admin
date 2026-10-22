// features/spaces/data/entity-where.ts — CD-VIEW-11: a built-in source's advanced filter (Notion's And / Or groups)
// asked of the store. The view keeps records-ui's one condition tree (the same `where` a custom table's view
// keeps); the drill doors read it as their object-form groups — {"$all" | "$any" | "$none": [<where>, …]}, nested
// to any depth (platform._drill_compile, migration closeview_a). Plain module: the server seed imports it.

import type { SpaceDbView } from "./sources";

type Node = { op?: unknown; args?: unknown; const?: unknown; field?: unknown };
type Where = Record<string, unknown>;

/** A rule this source cannot answer, in words (the panel names it and keeps Apply off). */
export interface EntityWhereRefusal {
  says: string;
}

const COMPARE: Record<string, string> = { gt: "gt", gte: "gte", lt: "lt", lte: "lte", ne: "ne" };

function columnOf(n: Node): string | null {
  const f = Array.isArray(n.args) ? (n.args[0] as Node | undefined) : undefined;
  if (!f || typeof f.field !== "string" || !f.field) return null;
  return f.field.startsWith("entity:") ? f.field.slice("entity:".length) : f.field;
}

function constOf(n: Node): { ok: true; value: unknown } | { ok: false } {
  const c = Array.isArray(n.args) ? (n.args[1] as Node | undefined) : undefined;
  if (!c || typeof c !== "object" || !("const" in c)) return { ok: false };
  return { ok: true, value: c.const };
}

const isScalar = (v: unknown) => v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean";

/** One rule as one object-form filter, or a refusal in words. */
function leaf(n: Node): Where | EntityWhereRefusal {
  const op = String(n.op ?? "");
  const col = columnOf(n);
  if (!col) return { says: "A rule here names a property this database does not have." };
  if (op === "is_empty") return { [col]: null };
  if (op === "is_not_empty" || op === "present") return { $none: [{ [col]: null }] };
  const v = constOf(n);
  if (!v.ok) return { says: "A rule here compares with something other than a value; this database filters by values." };
  const value = v.value;
  if (op === "eq") return Array.isArray(value) ? { [col]: value.filter(isScalar) } : isScalar(value) ? { [col]: value } : { says: "A rule here compares with a value this database cannot read." };
  if (op in COMPARE && isScalar(value) && value !== null) return { [col]: { [COMPARE[op]]: value } };
  if ((op === "contains" || op === "not_contains") && (typeof value === "string" || typeof value === "number")) {
    const has = { [col]: { contains: value } };
    return op === "contains" ? has : { $none: [has] };
  }
  if ((op === "has_any" || op === "has_none") && Array.isArray(value)) {
    const list = value.filter(isScalar);
    const any = { [col]: list };
    return op === "has_any" ? any : { $none: [any] };
  }
  return { says: `"${op.replace(/_/g, " ")}" is not a filter this database answers yet.` };
}

const isRefusal = (x: Where | EntityWhereRefusal): x is EntityWhereRefusal => typeof (x as EntityWhereRefusal).says === "string";

/** records-ui's condition tree (and / or / not over rules) as the drill doors' object-form where. */
export function entityWhereOf(expr: unknown): { where: Where | null; refused: EntityWhereRefusal | null } {
  if (!expr || typeof expr !== "object" || Array.isArray(expr)) return { where: null, refused: null };
  const said: { refused: EntityWhereRefusal | null } = { refused: null };
  const walk = (raw: unknown): Where | null => {
    const n = raw as Node;
    const args = Array.isArray(n.args) ? n.args : [];
    if (n.op === "and" || n.op === "or") {
      const parts = args.map(walk).filter((x): x is Where => x !== null);
      return { [n.op === "and" ? "$all" : "$any"]: parts };
    }
    if (n.op === "not") {
      const inner = args[0] as Node | undefined;
      // Notion's "None of": not (a or b …) is none of them.
      if (inner && inner.op === "or" && Array.isArray(inner.args)) return { $none: inner.args.map(walk).filter((x): x is Where => x !== null) };
      const one = walk(inner);
      return one ? { $none: [one] } : null;
    }
    const got = leaf(n);
    if (isRefusal(got)) {
      said.refused ??= got;
      return null;
    }
    return got;
  };
  const where = walk(expr);
  return { where: said.refused ? null : where, refused: said.refused };
}

/** The whole question a built-in view asks: its plain filters AND its advanced filter (when the store can answer it). */
export function entityViewWhere(view: Pick<SpaceDbView, "filters" | "where">): Where {
  const flat = { ...((view.filters ?? {}) as Where) };
  const { where } = entityWhereOf(view.where);
  return where ? { ...flat, $all: [where] } : flat;
}
