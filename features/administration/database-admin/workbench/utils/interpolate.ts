import type { Variable } from "../types";

const VAR_PATTERN = /\{\{\s*(:?)([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

export interface InterpolationWarning {
  type: "double-quoted";
  variable: string;
  message: string;
}

export interface InterpolationResult {
  resolved: string;
  used: string[];
  missing: string[];
  warnings: InterpolationWarning[];
}

function escapeSqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export function interpolateQuery(
  query: string,
  variables: Variable[],
): InterpolationResult {
  const lookup = new Map<string, string>();
  for (const v of variables) {
    if (v.name) lookup.set(v.name, v.value);
  }

  const used = new Set<string>();
  const missing = new Set<string>();
  const warningMap = new Map<string, InterpolationWarning>();

  // Walk the source so we can inspect surrounding characters for each match
  let resolved = "";
  let cursor = 0;
  for (const match of query.matchAll(VAR_PATTERN)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const prefix = match[1];
    const name = match[2];

    resolved += query.slice(cursor, start);

    if (!lookup.has(name)) {
      missing.add(name);
      resolved += match[0];
      cursor = end;
      continue;
    }

    used.add(name);
    const raw = lookup.get(name) ?? "";

    // Detect the "double-quoted" mistake: user wrote '{{:name}}' (auto-quoted
    // token wrapped in their own single quotes). Substitute as raw to avoid
    // producing ''value'' which Postgres reads as empty string + numeric.
    const wrappedInQuotes =
      prefix === ":" && query[start - 1] === "'" && query[end] === "'";

    if (wrappedInQuotes) {
      warningMap.set(name, {
        type: "double-quoted",
        variable: name,
        message: `'{{:${name}}}' is wrapped in extra single quotes — using {{${name}}} (raw) so the result is a single quoted string. Either drop the surrounding ' or switch to {{${name}}}.`,
      });
      resolved += raw;
    } else {
      resolved += prefix === ":" ? escapeSqlString(raw) : raw;
    }

    cursor = end;
  }
  resolved += query.slice(cursor);

  return {
    resolved,
    used: Array.from(used),
    missing: Array.from(missing),
    warnings: Array.from(warningMap.values()),
  };
}

export function extractVariableNames(query: string): string[] {
  const names = new Set<string>();
  const matches = query.matchAll(VAR_PATTERN);
  for (const m of matches) {
    names.add(m[2]);
  }
  return Array.from(names);
}
