/**
 * Mastodon profiles on their own servers (MKT-102). `host/@user` fits many sites, so the shape only earns a
 * free check of the host: its Mastodon-compatible account lookup, then its nodeinfo. A host that passes is
 * learned for the session (`learnFediverseHost`) and reported to the known-domains registry as `social`, so
 * every later paste of any account on it reads as a Mastodon account. Pure but for the injected fetch.
 */
import { fediverseProfileShape, isLearnedFediverseHost, learnFediverseHost, profileSiteHandle } from "./profile-sites";

/** Software names whose servers speak the Mastodon account API. */
const FEDIVERSE_SOFTWARE = new Set(["mastodon", "pleroma", "akkoma", "misskey", "friendica", "gotosocial", "glitch-soc", "hometown", "iceshrimp", "sharkey", "firefish"]);

type Fetch = (input: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

async function getJson(fetchImpl: Fetch, url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const body = await res.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** True when `host` answers the Mastodon account lookup for `user`, or its nodeinfo names Mastodon-compatible software. */
export async function hostRunsFediverse(host: string, user: string, fetchImpl: Fetch = fetch as unknown as Fetch): Promise<boolean> {
  const account = await getJson(fetchImpl, `https://${host}/api/v1/accounts/lookup?acct=${encodeURIComponent(user)}`);
  if (account && typeof account.acct === "string" && typeof account.url === "string") return true;
  const index = await getJson(fetchImpl, `https://${host}/.well-known/nodeinfo`);
  const links = Array.isArray(index?.links) ? (index.links as { href?: unknown }[]) : [];
  const href = links.map((l) => l.href).find((h): h is string => typeof h === "string" && h.startsWith(`https://${host}/`));
  if (!href) return false;
  const info = await getJson(fetchImpl, href);
  const name = (info?.software as { name?: unknown } | undefined)?.name;
  return typeof name === "string" && FEDIVERSE_SOFTWARE.has(name.toLowerCase());
}

/**
 * If `text` is a `host/@user` profile on a host not yet known, check the host. Resolves true when the text now
 * reads as a Mastodon account (known before or proven now). `onLearned` gets the proven host once, to teach the registry.
 */
export async function learnFediverseFromText(
  text: string,
  options: { fetchImpl?: Fetch; onLearned?: (host: string, url: string) => void } = {},
): Promise<boolean> {
  const shape = fediverseProfileShape(text);
  if (!shape) return false;
  if (isLearnedFediverseHost(shape.host) || profileSiteHandle(text)?.site === "mastodon") return true;
  if (!(await hostRunsFediverse(shape.host, shape.user, options.fetchImpl))) return false;
  learnFediverseHost(shape.host);
  options.onLearned?.(shape.host, `https://${shape.host}/@${shape.user}`);
  return true;
}
