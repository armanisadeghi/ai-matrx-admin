/**
 * Sign-up welcome — is the login's website candidate (a work email's domain, a Google Workspace domain) the PERSON's
 * site? Pure. An employer's domain is not "Your site" (reviewer, 2026-10-16: an employer's domain was shown as a
 * certain "Your site"). The candidate becomes theirs only when the run shows it:
 *
 * - the site names the person: a finding read off that host (a name, a title, a description), or a sure fact citing
 *   that host, carries their full name; or
 * - one of their proven or confirmed accounts links to it: a website finding of that host whose source is the
 *   account's own profile.
 *
 * A one-word name never counts (it would match a stranger's page).
 */

import { websiteHost, type Decision, type EvidenceItem } from "../evidence";
import type { BrandFact } from "../validate/queue";

const isOurs = (d: Decision | undefined) => d === "preferred" || d === "yes" || d === "alias";
const SURE = new Set(["confirmed", "likely"]);
const words = (s: string) => ` ${s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;
const bareUrl = (u: string) => u.toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/[/?#]+$/, "");

export interface SiteTheirsInput {
  /** The candidate's host (websiteCandidate). */
  host: string;
  /** The person's full name. */
  name: string;
  items: readonly EvidenceItem[];
  facts: readonly BrandFact[];
  decisions: Record<string, Decision>;
}

/** The host an item was read from: its page, or the round's own website (the candidate) when it carries no page. */
function readFrom(item: EvidenceItem, host: string): string | null {
  if (item.source.url) return websiteHost(item.source.url) || null;
  return item.source.kind === "website" ? host : null;
}

export function siteIsTheirs({ host, name, items, facts, decisions }: SiteTheirsInput): boolean {
  const site = websiteHost(host);
  if (!site) return false;
  const full = words(name);
  const named = full.trim().split(" ").length >= 2;
  const says = (text: string | null | undefined) => named && Boolean(text) && words(text as string).includes(full);

  if (named) {
    for (const i of items) {
      if (decisions[i.key] === "no" || i.source.kind === "typed" || readFrom(i, site) !== site) continue;
      if (says(i.value) || says(i.label) || says(i.snippet)) return true;
    }
    for (const f of facts) {
      if (!SURE.has(f.certainty) || decisions[f.key] === "no") continue;
      if (f.evidence_urls.some((u) => websiteHost(u) === site) && says(f.value)) return true;
    }
  }

  // Their own accounts: proven at sign-in (seeded "yes") or confirmed since.
  const accounts = new Set(items.filter((i) => i.field === "social" && isOurs(decisions[i.key])).map((i) => bareUrl(i.url ?? i.value)));
  if (!accounts.size) return false;
  return items.some(
    (i) =>
      i.field === "website" &&
      decisions[i.key] !== "no" &&
      websiteHost(i.url ?? i.value) === site &&
      (i.source.kind === "social_profile" || i.source.kind === "link_in_bio") &&
      Boolean(i.source.url) &&
      accounts.has(bareUrl(i.source.url as string)),
  );
}
