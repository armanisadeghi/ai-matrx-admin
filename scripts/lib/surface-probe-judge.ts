/**
 * The pure half of the surface-probe recorder: the chain query and the
 * done-bar (c) verdict. No database, no process — so the verdict is testable
 * (`scripts/__tests__/surface-probe-record-item-values.test.ts`) without the
 * ESM-only direct-Postgres client the recorder (`scripts/surface-probe-record.ts`)
 * writes through.
 */

export const SURFACE_PROBE_VERSION = "surface-probe@2026-10-22.w5b";
/**
 * Longest value text kept in `last_check.values`. The page shows each value as one preview
 * line (already ≤140 chars); the cap keeps a stray long read from bloating the system row.
 */
export const PROBE_VALUE_MAX_CHARS = 300;
/** The sanctioned test identity. A probe signed in as anyone else is never recorded. */
export const PROBE_IDENTITY = "admin@admin.com";

export interface ProbeRecordInput {
  surface: string;
  route: string;
  recordId: string | null;
  base: string;
  supplied: string[];
  suppliedEmpty: string[];
  /** A deployment without keyed rows: label + preview line per row ("Not available" = absent). */
  byLabel?: { label: string; line: string }[];
  /** The page's preview line per supplied key, as the values window showed it. */
  values?: Record<string, string>;
  surfaceNamed: boolean;
  signedIn: boolean;
  probedAs: { email: string | null; userId: string | null; role: string };
  errors: string[];
}

export interface ChainValue {
  name: string;
  label: string | null;
  always_available: boolean;
  auto_context: boolean | null;
  /**
   * '' for a PAGE value; an item type ('table_row', …) for a value of an item a
   * person points at. Item values are supplied only once an item is clicked, so
   * they are never part of a page probe's verdict. `@ai-matrx/alchemy` declares
   * the table-row item as a baseline on every surface, so counting them failed
   * every probe on table_id / row_id / shown / row.
   */
  item_type: string;
}

export interface LastCheckProbe {
  status: "pass" | "fail";
  at: string;
  route: string;
  recordId: string | null;
  base: string;
  declaredOn: string[];
  required: string[];
  conditional: string[];
  suppliedValues: string[];
  suppliedEmpty: string[];
  /**
   * What the page showed for each supplied value (admin test account only — the recorder
   * refuses any other identity), each cut to PROBE_VALUE_MAX_CHARS. The admin page fills
   * the rendered situation's blanks from these.
   */
  values: Record<string, string>;
  readMode: "keys" | "labels";
  unmappedLabels: string[];
  missing: string[];
  conditionalMissing: string[];
  reasons: string[];
  probedAs: { email: string | null; userId: string | null; role: string };
  probeVersion: string;
}

/** Pure: the done-bar (c) verdict from the chain's values and what the page supplied. */
export function judgeProbe(input: ProbeRecordInput, allValues: ChainValue[], at: string): LastCheckProbe {
  const chain = allValues.filter((v) => !v.item_type);
  const declaredOn = chain.filter((v) => v.auto_context !== false).map((v) => v.name).sort();
  const required = chain
    .filter((v) => v.auto_context !== false && v.always_available)
    .map((v) => v.name)
    .sort();
  const conditional = declaredOn.filter((n) => !required.includes(n));
  const reasons: string[] = [];
  if (!input.signedIn) reasons.push("not signed in");
  if (!input.surfaceNamed) reasons.push(`the page on ${input.route} did not name ${input.surface}`);
  // A page that named a DIFFERENT surface supplied that surface's values, not
  // this one's: record nothing as supplied rather than credit the wrong row.
  const fromLabels: string[] = [];
  const emptyFromLabels: string[] = [];
  const unmappedLabels: string[] = [];
  const labelValues: Record<string, string> = {};
  const byLabel = input.byLabel ?? [];
  if (byLabel.length) {
    const nameByLabel = new Map<string, string>();
    for (const v of chain) {
      if (v.label) nameByLabel.set(v.label.trim().toLowerCase(), v.name);
      nameByLabel.set(v.name.toLowerCase(), v.name);
    }
    for (const row of byLabel) {
      if (row.line === "Not available") continue;
      const name = nameByLabel.get(row.label.trim().toLowerCase());
      if (!name) unmappedLabels.push(row.label);
      else if (row.line === "Empty") emptyFromLabels.push(name);
      else {
        fromLabels.push(name);
        labelValues[name] = row.line;
      }
    }
  }
  const emptyAll = [...input.suppliedEmpty, ...emptyFromLabels];
  const suppliedRaw = input.surfaceNamed
    ? [...new Set([...input.supplied, ...fromLabels, ...emptyAll])]
    : [];
  const supplied = new Set(suppliedRaw);
  const values: Record<string, string> = {};
  if (input.surfaceNamed) {
    for (const [name, text] of Object.entries({ ...labelValues, ...(input.values ?? {}) })) {
      if (!supplied.has(name) || typeof text !== "string" || !text) continue;
      values[name] = text.length > PROBE_VALUE_MAX_CHARS ? `${text.slice(0, PROBE_VALUE_MAX_CHARS - 1)}…` : text;
    }
  }
  const missing = required.filter((n) => !supplied.has(n));
  const conditionalMissing = conditional.filter((n) => !supplied.has(n));
  if (missing.length) reasons.push(`${missing.length} always-available value(s) not supplied`);
  if (declaredOn.length === 0) reasons.push("the surface declares no on values");
  return {
    status: reasons.length === 0 ? "pass" : "fail",
    at,
    route: input.route,
    recordId: input.recordId,
    base: input.base,
    declaredOn,
    required,
    conditional,
    suppliedValues: suppliedRaw.sort(),
    suppliedEmpty: input.surfaceNamed ? [...new Set(emptyAll)].sort() : [],
    values,
    readMode: byLabel.length ? "labels" : "keys",
    unmappedLabels,
    missing,
    conditionalMissing,
    reasons,
    probedAs: input.probedAs,
    probeVersion: SURFACE_PROBE_VERSION,
  };
}

export const CHAIN_SQL = `
with recursive chain as (
  select s.name as ancestor_name, 0 as depth
    from ui.ui_surface s where s.name = $1 and s.deleted_at is null
  union all
  select p.parent_surface_name, c.depth + 1
    from chain c join ui.ui_surface p on p.name = c.ancestor_name and p.deleted_at is null
   where p.parent_surface_name is not null and p.parent_surface_name <> p.name and c.depth < 8
)
select distinct on (v.name) v.name, v.label, v.always_available, v.auto_context, v.item_type
  from chain c join ui.ui_surface_value v on v.surface_name = c.ancestor_name and v.deleted_at is null
   and v.item_type = ''
 order by v.name, c.depth`;
