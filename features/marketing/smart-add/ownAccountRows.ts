/**
 * A social-platform page is an ACCOUNT question, never an "On the web" row (MKT-045).
 *
 * The web step finds pages on Facebook, Instagram, X… beside news and listings. Asked as web rows they read wrong:
 * the brand's own confirmed profile showed again as a web row pre-marked "Not us", and another Facebook page was
 * pre-marked "Review site". So:
 *
 *   - {@link webProfileAsAccount} (at intake, `mergeEvidence`): a web row (listing, mention, web page) whose address
 *     is a social PROFILE becomes that account's candidate (`social:<platform>:<handle>`), merging with the account
 *     when it is already a candidate;
 *   - {@link withoutOwnAccountRows} (every render, so the order things are confirmed in never matters): a web row
 *     that is a CONFIRMED account's profile or any page under it (a post, a photo, its about tab) is dropped — the
 *     account is already its own card.
 *
 * Pure; no I/O. The server applies the same two rules (aidream brand_identify_web.result_evidence / keep).
 */

import type { Decision, EvidenceItem } from "./evidence";
import { accountOfPost, socialIdentity } from "./validate/fold";

const WEB_FIELDS = new Set(["listing", "mention", "web_page"]);

/** fold.ts identity `acct:facebook:ritualcoffee` → evidence key `social:facebook:ritualcoffee`. */
const socialKeyOf = (acct: string) => `social:${acct.slice("acct:".length).toLowerCase()}`;

/** A web row that is a social profile → that account's candidate; anything else unchanged. */
export function webProfileAsAccount(item: EvidenceItem): EvidenceItem {
  if (!WEB_FIELDS.has(item.field)) return item;
  const url = item.url ?? item.value;
  const social = socialIdentity(url);
  // A LinkedIn /in/ page is a person, never the brand's account: it stays a row the person classifies.
  if (!social.key || social.person) return item;
  const key = socialKeyOf(social.key);
  const [platform, ...rest] = key.slice("social:".length).split(":");
  return {
    ...item,
    key,
    field: "social",
    platform,
    handle: rest.join(":"),
    // A web row's label is the page title and its handle the host; the account's own label comes from the title.
    label: item.label,
    value: url,
    url,
  };
}

/** The account identity (`acct:<platform>:<handle>`) of an account item, from its address or its key. */
function accountIdentity(item: EvidenceItem): string | null {
  const fromUrl = socialIdentity(item.url ?? item.value).key;
  if (fromUrl) return fromUrl.toLowerCase();
  return item.key.startsWith("social:") ? `acct:${item.key.slice("social:".length)}`.toLowerCase() : null;
}

const address = (url: string) =>
  url
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/^(www|m|mobile|web)\./, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "");

/** Every item except web rows that are a confirmed account's profile or a page under it. */
export function withoutOwnAccountRows<T extends EvidenceItem>(
  items: Iterable<T>,
  decisions: Record<string, Decision | undefined>,
): T[] {
  const all = [...items];
  const confirmed = all.filter((i) => i.field === "social" && (decisions[i.key] === "yes" || decisions[i.key] === "preferred"));
  if (!confirmed.length) return all;
  const ids = new Set(confirmed.map(accountIdentity).filter((k): k is string => Boolean(k)));
  const bases = confirmed.map((i) => address(i.url ?? i.value)).filter((a) => a.includes("/"));
  return all.filter((item) => {
    if (!WEB_FIELDS.has(item.field)) return true;
    const url = item.url ?? item.value;
    const here = address(url);
    const profile = socialIdentity(url).key?.toLowerCase();
    const under = accountOfPost(url)?.toLowerCase();
    if ((profile && ids.has(profile)) || (under && ids.has(under))) return false;
    return !bases.some((b) => here === b || here.startsWith(`${b}/`));
  });
}
