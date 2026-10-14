/**
 * How an example row presents itself. The stored label is free text; a row
 * labelled "... canonical example" that is NOT the canonical one must not
 * claim to be, and a row written for an older kind version must say so.
 */

export function exampleDisplayLabel(
  label: string | null,
  isCanonical: boolean,
): string | null {
  if (label === null || isCanonical) return label;
  return label.replace(/\bcanonical example$/i, "example");
}

/** Plain-words note when the example predates the kind's current version; else null. */
export function exampleStaleNote(
  exampleKindVersion: number,
  currentVersion: number | undefined,
): string | null {
  if (currentVersion === undefined || exampleKindVersion >= currentVersion) return null;
  return `written for v${exampleKindVersion}, shape is now v${currentVersion} — re-check it`;
}
