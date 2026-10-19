/**
 * The name a person reads for where an answer came from. Pure; the table is `sourceNames.json` (data, not
 * code). A real brand (Moz, SpyFu…) shows by name; every other source reads "Matrx <kind>" by the Tool's job
 * family. Never a vendor behind a Matrx source.
 */

import names from "./sourceNames.json";

const BRANDS = new Set(names.brands.map((b) => b.toLowerCase()));
const BY_FAMILY: Record<string, string> = names.matrxByFamily;

export function sourceLabel(displaySource: string | null | undefined, jobFamily: string | null | undefined): string | null {
  const raw = displaySource?.trim();
  if (!raw) return null;
  if (BRANDS.has(raw.toLowerCase())) return raw;
  return (jobFamily ? BY_FAMILY[jobFamily] : undefined) ?? names.matrxDefault;
}
