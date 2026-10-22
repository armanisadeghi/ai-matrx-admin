/**
 * Real anchor-stage evidence (aidream brand.identify.person_anchor_extract, name-only rounds of 2026-10-16), for the
 * peopleGroups tests and the /lab/welcome-people page. Copied verbatim from the run dumps' `evidence` arrays.
 */

import { evidenceFromPayload, type EvidenceItem } from "../../evidence";
import nicoleLong from "./nicole-long.json";
import rochelleMoulton from "./rochelle-moulton.json";
import kehindeWiley from "./kehinde-wiley.json";
import johannaKlomann from "./johanna-klomann.json";
import thomasFrank from "./thomas-frank.json";
import mikeLittle from "./mike-little.json";

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

/** "Thomas Frank" (sign-up welcome final review, run 04d96a39, 2026-10-21): one person on LinkedIn, Instagram and
 * YouTube (the same profile photo, three platform copies), plus a London namesake whose LinkedIn text is masked. */
export const THOMAS_FRANK = load(thomasFrank);
/** The real photo groups `POST /brand-intake/images/groups` returned for THOMAS_FRANK's photos (2026-10-21). */
export const THOMAS_FRANK_PHOTO_GROUPS: ReadonlyMap<string, string> = new Map([
  ["social:instagram:tomfrankly", "img_tomfrankly"],
  ["social:linkedin:tomfrankly", "img_tomfrankly"],
  ["social:youtube:thomasfrank", "img_tomfrankly"],
  ["social:youtube:thomasfrankexplains", "img_explains"],
]);
/** "Mike Little" (sign-up welcome final review, run 6c7f17cc, 2026-10-21): a common name; one source writes "mike Little". */
export const MIKE_LITTLE = load(mikeLittle);
