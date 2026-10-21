/**
 * Real anchor-stage evidence (aidream brand.identify.person_anchor_extract, name-only rounds of 2026-10-16), for the
 * peopleGroups tests and the /lab/welcome-people page. Copied verbatim from the run dumps' `evidence` arrays.
 */

import { evidenceFromPayload, type EvidenceItem } from "../../evidence";
import nicoleLong from "./nicole-long.json";
import rochelleMoulton from "./rochelle-moulton.json";
import kehindeWiley from "./kehinde-wiley.json";
import johannaKlomann from "./johanna-klomann.json";

export interface AnchorFixture {
  searchedName: string;
  items: EvidenceItem[];
}

const load = (raw: { searched_name: string; evidence: unknown[] }): AnchorFixture => ({
  searchedName: raw.searched_name,
  items: evidenceFromPayload(raw),
});

/** "Nicole Long": a common name, six people. */
export const NICOLE_LONG = load(nicoleLong);
/** "Rochelle Moulton": one person (four Rachelle/Rachel/Rachael namesakes dropped). */
export const ROCHELLE_MOULTON = load(rochelleMoulton);
/** "Kehinde Wiley": one person, an account and a site. */
export const KEHINDE_WILEY = load(kehindeWiley);
/** "Johanna Klomann": one person found by a narrowed round (name + city, 2026-10-21): a Facebook profile whose intro
 * line holds her place and work, and her own site; no profile location field at all. */
export const JOHANNA_KLOMANN = load(johannaKlomann);
