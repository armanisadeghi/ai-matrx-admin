/**
 * A kind has ONE name, set in platform.entity_types.label. The host overlay may give a
 * grammatical plural ("Code Repositories" for "Code Repository") but never a different
 * word: on 2026-09-29 the overlay renamed Audio Session → "Recordings", Processed document →
 * "Saved sources" and Canonical Page → "Site pages" while the registry, agents and every
 * other screen kept the old names (law: common-docs/policies/no-dead-ends.md rule 12).
 * Rename a kind in the registry, with a vocabulary ruling, never here.
 */
import { ENTITY_TYPE_METADATA } from "@ai-matrx/associations";
import { pluralizeLabel } from "@ai-matrx/associations/core";
import { getAssociationsEntityOverlay } from "../entityRegistry";


/**
 * Overlay plurals that rename a kind today, waiting for a naming ruling (vocabulary row +
 * registry label). This list only shrinks: a fixed entry fails the test until it is deleted.
 */
const AWAITING_A_NAMING_RULING = new Set<string>([]);

it("every overlay plural is the grammatical plural of the registry label", () => {
  const overlay = getAssociationsEntityOverlay() as Record<string, { labelPlural?: string }>;
  const meta = ENTITY_TYPE_METADATA as Record<string, { label: string } | undefined>;
  const renames: string[] = [];
  for (const [token, entry] of Object.entries(overlay)) {
    const plural = entry?.labelPlural;
    const label = meta[token]?.label;
    if (!plural || !label) continue;
    if (plural.toLowerCase() !== pluralizeLabel(label).toLowerCase()) {
      renames.push(`${token}: ${label} → ${plural}`);
    }
  }
  expect(renames.filter((r) => !AWAITING_A_NAMING_RULING.has(r)).sort()).toEqual([]);
  expect([...AWAITING_A_NAMING_RULING].filter((r) => !renames.includes(r))).toEqual([]);
});

