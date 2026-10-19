/**
 * What the one box offers when someone types a THING instead of a job (a business name, a social handle,
 * a profile link, a website). Pure. The box understands entities as well as jobs: a thing is never answered
 * with "Nothing does that yet" or with priced source cards, it is answered with the few plain jobs that can
 * start from it. Nothing runs and no price shows here: each offer opens the job with the box filled.
 */

import { classifyText } from "@ai-matrx/chat/mandates/invoke/smart-box";

export type EntityKind = "business" | "handle" | "website" | "social_link" | "email" | "phone";

export interface EntityOffer {
  id: string;
  /** Plain verb phrase on the button ("Compare this business"). */
  label: string;
  /** A catalog job opened with the box filled; null when the offer is a page link. */
  jobKey: string | null;
  inputs: Record<string, string>;
  /** Page link (opens in a new tab); set when `jobKey` is null. */
  href: string | null;
  /** True when every input the job needs is already known, so the open can press the job. */
  complete: boolean;
}

export interface EntityRead {
  kind: EntityKind;
  /** The text with accents folded, for matching. */
  folded: string;
  offers: EntityOffer[];
}

const SOCIAL_HOSTS =
  /(^|\.)(instagram|tiktok|facebook|fb|twitter|x|youtube|youtu|linkedin|threads|pinterest|reddit|snapchat|bsky|mastodon|twitch|tumblr)\.(com|be|app|social|tv|co)$/i;
const COMMON_TLD =
  /\.(com|org|net|io|co|ai|app|dev|edu|gov|us|uk|ca|de|fr|es|it|nl|au|in|jp|me|info|biz|shop|store|news|tv|ly|so|xyz|online|site|tech|cafe|studio|design|agency|club|life|nyc|la|mx|br|ch|se|no|dk|nz|ie|be|at|pl|ru|cn|kr)$/i;
const FEDIVERSE_HOST = /(\.social$|^(mastodon|mstdn|hachyderm|fosstodon|infosec|mas|techhub|sfba|universeodon|pixelfed|misskey)\b)/i;

/** "Café Pasqual's" -> "Cafe Pasqual's": accents out, apostrophes straight, spaces collapsed. */
export function foldForSearch(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function job(id: string, label: string, jobKey: string, inputs: Record<string, string>, complete: boolean): EntityOffer {
  return { id, label, jobKey, inputs, href: null, complete };
}

function businessOffers(name: string): EntityOffer[] {
  return [
    { id: "compare", label: "Compare this business", jobKey: null, inputs: {}, href: `/compare?q=${encodeURIComponent(name)}`, complete: true },
    job("reviews", "Find its reviews", "place_reviews", { place: name }, false),
    job("people", "Find people at it", "people_search", {}, false),
  ];
}

function socialOffer(account: string): EntityOffer {
  return job("social", "See this social account", "social_profile", { account }, false);
}

function siteOffers(domain: string): EntityOffer[] {
  return [job("site", "Check this website's strength", "seo_domain_authority", { domain }, true)];
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/** Reads what was typed. Null when it is a plain job word (the Tool search answers those) or empty. */
export function readEntity(raw: string): EntityRead | null {
  const typed = raw.trim();
  if (!typed) return null;
  const folded = foldForSearch(typed);

  // Mastodon "@user@host" / "user@host.social": a handle, never an email.
  const fedi = /^@?([A-Za-z0-9_.-]+)@([A-Za-z0-9.-]+\.[A-Za-z]{2,})$/.exec(folded);
  if (fedi && (folded.startsWith("@") || FEDIVERSE_HOST.test(fedi[2] as string))) {
    return { kind: "handle", folded, offers: [socialOffer(`@${fedi[1]}@${fedi[2]}`)] };
  }

  const seen = classifyText(folded, { anyEnding: true });
  if (seen?.type === "handle") return { kind: "handle", folded, offers: [socialOffer(`@${seen.value}`)] };
  if (seen?.type === "email") return { kind: "email", folded, offers: [] };
  if (seen?.type === "phone") return { kind: "phone", folded, offers: [] };
  if (seen?.type === "url") {
    const host = hostOf(seen.value);
    if (host && SOCIAL_HOSTS.test(host)) return { kind: "social_link", folded, offers: [socialOffer(seen.value)] };
    return host ? { kind: "website", folded, offers: siteOffers(host) } : null;
  }
  if (seen?.type === "domain") {
    // A dotted word that does not end like a website ("name.surname") is a handle someone typed bare.
    if (!COMMON_TLD.test(seen.value)) return { kind: "handle", folded, offers: [socialOffer(`@${folded.replace(/^@/, "")}`)] };
    if (SOCIAL_HOSTS.test(seen.value)) return { kind: "social_link", folded, offers: [socialOffer(seen.value)] };
    return { kind: "website", folded, offers: siteOffers(seen.value) };
  }

  // Anything else with a letter in it and no job-word shape is a thing's name: a business.
  if (!/\p{L}/u.test(typed) || folded.length < 2 || folded.split(" ").length > 9) return null;
  return { kind: "business", folded, offers: businessOffers(typed) };
}
