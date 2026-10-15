import type { ResolvePartyInput } from "@/features/crm/service";

/**
 * The party a founder / key-person answer resolves to. A person party can never carry a
 * primary_domain (crm.party `party_org_facet`: that column belongs to organizations, and the
 * database refuses the whole save), so the page they were found on rides in attributes instead.
 */
export function personPartyInput(
  organizationId: string,
  name: string,
  relationLabel: string,
  c: { url?: string | null; platform?: string | null; bio?: string | null },
): ResolvePartyInput {
  return {
    kind: "person",
    displayName: name,
    orgId: organizationId,
    source: "smart_add",
    sourceDetail: `${relationLabel}: ${c.url ?? name}`,
    ...(c.platform === "website" && c.url ? { attributes: { website: c.url } } : {}),
    ...(c.bio ? { headline: c.bio.slice(0, 200) } : {}),
  };
}

const NOT_A_PERSON = /\b(inc|llc|ltd|co|corp|company|coffee|roasters?|restaurant|cafe|shop|store|staffing|solutions|services|group|home|about|contact|news|blog|official|jobs|careers|reviews?|menu|order|team|us|supply|supplies|hardware|outdoor|outdoors|products?|systems?|studio|studios|labs?|partners|industries|enterprises|trading|foods?|market|sauces?|hot|co\.)\b/i;

/**
 * A person's name the page names, to prefill the ask when a web result is answered Founder / Key person
 * (MKT-040): a title or snippet segment of two to four capitalised words that is not the brand and not
 * a business word. Null when nothing reads as a name, so the field starts empty — a page title is never saved
 * as the person's name.
 */
export function personNameOnPage(
  page: { title?: string | null; snippet?: string | null },
  brandName: string | null,
  siteUrl?: string | null,
): string | null {
  // The site's own name (its host, letters only) is a company, never a person (MKT-136).
  let hostStem = "";
  try {
    hostStem = new URL(/^https?:\/\//i.test(siteUrl ?? "") ? (siteUrl as string) : `https://${siteUrl ?? ""}`).hostname
      .replace(/^www\./, "")
      .split(".")[0]
      .replace(/[^a-z0-9]/gi, "")
      .toLowerCase();
  } catch {
    hostStem = "";
  }
  const brand = (brandName ?? "").toLowerCase();
  const candidates = [
    ...(page.title ?? "").split(/\s+[|\-–—:·•»,]\s+|\s*\|\s*/),
    ...[...(page.snippet ?? "").matchAll(/\b(?:founded by|founder,?|owner,?|CEO,?|meet)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z.]+){1,3})/g)].map((m) => m[1]),
  ];
  for (const raw of candidates) {
    const text = raw.replace(/^(meet|about)\s+/i, "").trim();
    const words = text.split(/\s+/);
    if (words.length < 2 || words.length > 4) continue;
    if (!words.every((w) => /^[A-Z][a-zA-Z'.-]+$/.test(w))) continue;
    if (NOT_A_PERSON.test(text)) continue;
    const letters = text.replace(/[^a-z0-9]/gi, "").toLowerCase();
    if (hostStem.length >= 4 && (hostStem.includes(letters) || letters.includes(hostStem))) continue;
    if (brand && (brand.includes(text.toLowerCase()) || text.toLowerCase().includes(brand))) continue;
    return text;
  }
  return null;
}
