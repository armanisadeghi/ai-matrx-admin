/**
 * Profile sites: the developer / creator "social" sites a person has an account on (GitHub, Hugging Face,
 * Substack, Bluesky, Ko-fi...). Recognised everywhere a social account is, but with no provider lookup: the
 * address itself is the evidence. Pure.
 *
 * The ONE rule shared with aidream `packages/matrx-social/matrx_social/profile_sites.py`; both sides are pinned
 * by the same case table (`__tests__/profile_site_cases.json` here, `tests/fixtures/profile_site_cases.json`
 * there). Change one, change both. `mastodon` and `twitch` reuse the SocialPlatform ids.
 */

export interface ProfileSite {
  id: string;
  label: string;
  /** Hosts whose path names the account (`github.com/<user>`). */
  hosts: readonly string[];
  /** Hosts whose subdomain names the account (`<user>.substack.com`). */
  subHosts?: readonly string[];
  /** "first" segment, "at" (`/@user`), or a literal prefix segment ("users", "profile"). */
  rule: string;
  reserved?: ReadonlySet<string>;
  /** Profile address; `{h}` is the handle. */
  url: string;
}

const COMMON = [
  "", "about", "login", "signin", "sign-in", "signup", "sign-up", "join", "register", "search", "explore", "help",
  "settings", "pricing", "terms", "privacy", "blog", "docs", "features", "home", "feed", "new", "notifications",
  "trending", "topics", "tags", "tag", "discover", "jobs", "careers", "contact", "legal", "security", "api", "apps",
  "download", "downloads", "support", "faq", "press", "status", "static", "assets", "logout", "dashboard",
];
const reserved = (...more: string[]) => new Set([...COMMON, ...more].map((s) => s.toLowerCase()));

export const PROFILE_SITES: readonly ProfileSite[] = [
  { id: "github", label: "GitHub", hosts: ["github.com"], rule: "first", url: "https://github.com/{h}",
    reserved: reserved("orgs", "organizations", "marketplace", "sponsors", "collections", "enterprise", "issues", "pulls", "codespaces", "copilot", "customer-stories", "readme", "events", "site", "team", "resources", "solutions", "pages", "gist", "account", "users", "repos", "stars", "watching") },
  { id: "gitlab", label: "GitLab", hosts: ["gitlab.com"], rule: "first", url: "https://gitlab.com/{h}",
    reserved: reserved("users", "groups", "projects", "dashboard", "-", "admin", "public") },
  { id: "stackoverflow", label: "Stack Overflow", hosts: ["stackoverflow.com"], rule: "users", url: "https://stackoverflow.com/users/{h}" },
  { id: "huggingface", label: "Hugging Face", hosts: ["huggingface.co"], rule: "first", url: "https://huggingface.co/{h}",
    reserved: reserved("models", "datasets", "spaces", "papers", "organizations", "tasks", "learn", "posts", "collections", "enterprise", "chat", "inference-endpoints") },
  { id: "kaggle", label: "Kaggle", hosts: ["kaggle.com"], rule: "first", url: "https://www.kaggle.com/{h}",
    reserved: reserved("competitions", "datasets", "code", "models", "discussions", "learn", "c", "d", "kernels", "organizations", "benchmarks", "rankings") },
  { id: "devto", label: "DEV", hosts: ["dev.to"], rule: "first", url: "https://dev.to/{h}",
    reserved: reserved("t", "top", "latest", "listings", "podcasts", "videos", "enter", "series", "badge") },
  { id: "hashnode", label: "Hashnode", hosts: ["hashnode.com"], subHosts: ["hashnode.dev"], rule: "at", url: "https://hashnode.com/@{h}" },
  { id: "medium", label: "Medium", hosts: ["medium.com"], subHosts: ["medium.com"], rule: "at", url: "https://medium.com/@{h}" },
  { id: "substack", label: "Substack", hosts: ["substack.com"], subHosts: ["substack.com"], rule: "at", url: "https://{h}.substack.com" },
  { id: "behance", label: "Behance", hosts: ["behance.net"], rule: "first", url: "https://www.behance.net/{h}",
    reserved: reserved("gallery", "galleries", "joblist", "hire", "assets", "onboarding", "for_you", "live", "moodboard") },
  { id: "dribbble", label: "Dribbble", hosts: ["dribbble.com"], rule: "first", url: "https://dribbble.com/{h}",
    reserved: reserved("shots", "designers", "stories", "hiring", "pro", "learn", "following", "session", "uploads") },
  { id: "producthunt", label: "Product Hunt", hosts: ["producthunt.com"], rule: "at", url: "https://www.producthunt.com/@{h}" },
  { id: "keybase", label: "Keybase", hosts: ["keybase.io"], rule: "first", url: "https://keybase.io/{h}",
    reserved: reserved("_", "team", "docs", "blog") },
  { id: "mastodon", label: "Mastodon", hosts: ["mastodon.social", "mastodon.online", "mstdn.social", "fosstodon.org", "hachyderm.io", "infosec.exchange", "mas.to", "techhub.social"], rule: "at", url: "https://mastodon.social/@{h}" },
  { id: "bluesky", label: "Bluesky", hosts: ["bsky.app"], rule: "profile", url: "https://bsky.app/profile/{h}" },
  { id: "twitch", label: "Twitch", hosts: ["twitch.tv"], rule: "first", url: "https://www.twitch.tv/{h}",
    reserved: reserved("directory", "videos", "p", "subscriptions", "inventory", "wallet", "drops", "turbo", "prime", "store", "broadcast") },
  { id: "soundcloud", label: "SoundCloud", hosts: ["soundcloud.com"], rule: "first", url: "https://soundcloud.com/{h}",
    reserved: reserved("stream", "you", "charts", "pages", "mobile", "upload", "people", "stations", "imprint", "connect") },
  { id: "bandcamp", label: "Bandcamp", hosts: [], subHosts: ["bandcamp.com"], rule: "first", url: "https://{h}.bandcamp.com" },
  { id: "patreon", label: "Patreon", hosts: ["patreon.com"], rule: "first", url: "https://www.patreon.com/{h}",
    reserved: reserved("c", "posts", "creators", "product", "become-a-patreon-creator", "m", "messages", "membership", "member", "policy", "checkout", "file", "bePatron") },
  { id: "kofi", label: "Ko-fi", hosts: ["ko-fi.com"], rule: "first", url: "https://ko-fi.com/{h}",
    reserved: reserved("manage", "shop", "account", "s", "post", "i", "home", "explore-creators") },
];

const BY_ID = new Map(PROFILE_SITES.map((s) => [s.id, s]));
const SITE_SUBDOMAINS = new Set(["www", "m", "help", "blog", "support", "api", "on", "open", "cdn", "status", "docs", "careers", "get", "app", "about"]);
const HANDLE = /^[A-Za-z0-9][A-Za-z0-9._~-]{0,99}$/;

function parse(text: string): URL | null {
  const t = (text ?? "").trim();
  if (!t || /\s/.test(t)) return null;
  const withScheme = /^https?:\/\//i.test(t) ? t : /^(www\.)?[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(t) ? `https://${t}` : null;
  if (!withScheme) return null;
  try {
    return new URL(withScheme);
  } catch {
    return null;
  }
}

const hostIs = (host: string, base: string) => host === base || host.endsWith(`.${base}`);

/** `{site, handle}` when `text` is the address of an account on a profile site; null for a repo, post or site page. */
export function profileSiteHandle(text: string | null | undefined): { site: string; handle: string } | null {
  const url = parse(text ?? "");
  if (!url) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const segments = url.pathname.split("/").filter(Boolean).map((s) => decodeURIComponent(s));
  for (const site of PROFILE_SITES) {
    for (const base of site.subHosts ?? []) {
      if (host.endsWith(`.${base}`)) {
        const sub = host.slice(0, -(base.length + 1));
        if (sub.includes(".") || SITE_SUBDOMAINS.has(sub)) continue;
        if (segments[0] && ["p", "post", "track", "album", "posts"].includes(segments[0].toLowerCase())) return null;
        return HANDLE.test(sub) ? { site: site.id, handle: sub } : null;
      }
    }
    if (!site.hosts.some((h) => hostIs(host, h))) continue;
    let handle: string;
    if (site.id === "mastodon") {
      if (segments.length !== 1 || !segments[0].startsWith("@")) return null;
      const user = segments[0].slice(1);
      if (!HANDLE.test(user)) return null;
      return { site: site.id, handle: host === "mastodon.social" ? user : `${user}@${host}` };
    }
    if (site.rule === "at") {
      if (segments.length !== 1 || !segments[0].startsWith("@") || segments[0].length < 2) return null;
      handle = segments[0].slice(1);
    } else if (site.rule === "first") {
      if (segments.length !== 1 || site.reserved?.has(segments[0].toLowerCase()) || segments[0].startsWith("@")) return null;
      handle = segments[0];
    } else {
      if (segments.length < 2 || segments[0].toLowerCase() !== site.rule) return null;
      if (site.id === "stackoverflow") {
        if (!/^\d+$/.test(segments[1]) || segments.length > 3) return null;
        handle = segments.slice(1, 3).join("/");
      } else {
        if (segments.length !== 2) return null;
        handle = segments[1];
      }
    }
    if (!handle || !HANDLE.test(handle.split("/")[0])) return null;
    return { site: site.id, handle };
  }
  return null;
}

/** The public profile address of `handle` on `siteId`; null for an unknown site. */
export function profileSiteUrl(siteId: string, handle: string): string | null {
  const site = BY_ID.get(siteId);
  const h = (handle ?? "").trim().replace(/^@/, "");
  if (!site || !h) return null;
  if (site.id === "mastodon" && h.includes("@")) {
    const [user, inst] = h.split("@");
    return `https://${inst}/@${user}`;
  }
  return site.url.replace("{h}", h);
}

export function profileSite(siteId: string): ProfileSite | null {
  return BY_ID.get(siteId) ?? null;
}
