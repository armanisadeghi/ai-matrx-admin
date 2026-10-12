/**
 * Reading one fetched record. The provider's field names vary a little between datasets and over
 * time, so each reader takes the candidate names in order and the first real value wins. Pure.
 */

export type DataRecord = Record<string, unknown>;

function isRecord(v: unknown): v is DataRecord {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** A value at a dotted path ("funding.last_round_type"). */
function at(record: DataRecord, path: string): unknown {
  let cur: unknown = record;
  for (const part of path.split(".")) {
    if (!isRecord(cur)) return undefined;
    cur = cur[part];
  }
  return cur;
}

/** The first non-empty text among the candidate paths (numbers become text). */
export function pickText(record: DataRecord | null | undefined, ...paths: string[]): string | null {
  if (!record) return null;
  for (const p of paths) {
    const v = at(record, p);
    if (typeof v === "string" && v.trim() !== "") return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return null;
}

/** The first finite number among the candidate paths (a numeric string like "12,345" counts). */
export function pickNumber(record: DataRecord | null | undefined, ...paths: string[]): number | null {
  if (!record) return null;
  for (const p of paths) {
    const v = at(record, p);
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = Number(v.replace(/[,\s]/g, ""));
      if (v.trim() !== "" && Number.isFinite(n)) return n;
    }
  }
  return null;
}

/** A list of text values ("industries" may be a string, a list of strings, or a list of {name}). */
export function pickList(record: DataRecord | null | undefined, ...paths: string[]): string[] {
  if (!record) return [];
  for (const p of paths) {
    const v = at(record, p);
    if (typeof v === "string" && v.trim() !== "") return [v.trim()];
    if (Array.isArray(v)) {
      const out = v
        .map((x) => (typeof x === "string" ? x.trim() : isRecord(x) ? pickText(x, "name", "title", "label", "value") ?? "" : ""))
        .filter((x) => x !== "");
      if (out.length > 0) return out;
    }
  }
  return [];
}

export function pickObject(record: DataRecord | null | undefined, ...paths: string[]): DataRecord | null {
  if (!record) return null;
  for (const p of paths) {
    const v = at(record, p);
    if (isRecord(v)) return v;
  }
  return null;
}

/** 12345 -> "12,345". */
export function countText(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** 1234567 -> "$1.2M" (an amount in whole currency units; currency defaults to USD). */
export function moneyText(amount: number, currency = "USD"): string {
  const sign = currency.toUpperCase() === "USD" ? "$" : `${currency.toUpperCase()} `;
  const abs = Math.abs(amount);
  const unit = abs >= 1e9 ? [1e9, "B"] : abs >= 1e6 ? [1e6, "M"] : abs >= 1e3 ? [1e3, "K"] : [1, ""];
  const scaled = amount / (unit[0] as number);
  const digits = Math.abs(scaled) >= 100 || Number.isInteger(scaled) ? 0 : 1;
  return `${sign}${scaled.toFixed(digits)}${unit[1]}`;
}
