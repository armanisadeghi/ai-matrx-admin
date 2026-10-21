/**
 * Which picture is the brand's logo. Enrichment saves every mark it meets (site logo, favicons at five
 * sizes, social avatars, the og:image sharing banner) as `logo`/`favicon` assets and may copy a banner
 * onto `web.brand.logo_url` (vasaro 2026-10-21: a 1200x628 photo of models). We hold no pixel sizes, so
 * the rank reads what the URL says: a sharing banner or social card is never the logo; a file named
 * "logo", an SVG, and a larger square size win; a 16-32 px favicon or a social avatar comes after.
 * Pure; tested.
 */

const BANNER = /social[-_ ]?(sharing|card|share)|share[-_ ]?image|banner|og[-_]?image|opengraph|twitter[-_]?card|\/social-card\b/i;
const SOCIAL_AVATAR_HOST = /(fbcdn\.net|cdninstagram\.com|twimg\.com|googleusercontent\.com|licdn\.com|tiktokcdn|pinimg\.com)/i;
const ICON_FAMILY = /^(favicon|apple-touch-icon|android-chrome|mstile|safari-pinned-tab)|(^|[-_])icon([-_.]|$)/i;

function parsed(url: string): { host: string; file: string } {
  try {
    const u = new URL(url);
    return { host: u.hostname.replace(/^www\./, ""), file: u.pathname.split("/").pop()?.toLowerCase() ?? "" };
  } catch {
    return { host: "", file: url.split("?")[0]?.split("/").pop()?.toLowerCase() ?? "" };
  }
}

/** True when the URL names a sharing banner / social card rather than a mark. */
export function isBannerUrl(url: string | null | undefined): boolean {
  return Boolean(url && BANNER.test(url));
}

/** The pixel size a file name states ("logo-180x180.png", "_32x32_", "s800", "width=320"), else null. */
function statedSize(url: string): number | null {
  const box = url.match(/(\d{2,4})x(\d{2,4})/i);
  if (box) return Math.max(Number(box[1]), Number(box[2]));
  const width = url.match(/[?&]width=(\d{2,4})/i) ?? url.match(/[=_-]s(\d{2,4})(?:[-_]|$)/i);
  return width ? Number(width[1]) : null;
}

export function logoScore(url: string, kind: string): number {
  if (isBannerUrl(url)) return -100;
  const { host, file } = parsed(url);
  let score = 0;
  if (/logo|wordmark|brandmark/i.test(file)) score += 20;
  if (/\.svg(\?|$)/i.test(url)) score += 10;
  if (kind === "logo" || kind === "wordmark" || kind === "logo_dark") score += 5;
  if (kind === "headshot") score -= 5;
  // A social avatar is never ahead of a mark from the brand's own site, even a small one.
  if (SOCIAL_AVATAR_HOST.test(host)) score -= 30;
  if (/\.ico(\?|$)/i.test(url)) score -= 10;
  const size = statedSize(url);
  if (size !== null) score += size <= 32 ? -15 : size <= 64 ? -5 : Math.min(10, Math.log2(size / 64) * 3);
  return score;
}

/** "wide" / "tall" when the file name states a box at least 2:1, else "square" (a stated or unknown square mark). */
function shapeOf(url: string): string {
  const box = url.match(/(\d{2,4})x(\d{2,4})/i);
  if (!box) return "square";
  const w = Number(box[1]);
  const h = Number(box[2]);
  return w >= h * 2 ? "wide" : h >= w * 2 ? "tall" : "square";
}

/**
 * The picture a file name describes, with the words that differ between copies of one mark removed: WordPress
 * site-icon crops ("cropped-cropped-data-destruction-1-192x192.png"), size boxes, and the words logo/icon/mark
 * ("data-destruction-logo.png") — both are "datadestruction". Null when too little is left to tell pictures apart.
 */
function nameStem(file: string): string | null {
  const stem = file
    .replace(/\.[a-z0-9]{2,4}$/, "")
    .replace(/^(cropped[-_])+/, "")
    .replace(/\d+x\d+/g, "")
    .replace(/(^|[-_])(logo|icon|mark|brandmark|wordmark|site|scaled|small|large|thumb|\d+)(?=[-_]|$)/g, "")
    .replace(/[^a-z]/g, "");
  return stem.length >= 5 ? stem : null;
}

/**
 * One key per picture: a saved file by its file id; a site's icon family (favicon.ico, favicon-32x32,
 * apple-touch-icon, *-icon.svg) as one mark per host; anything else by what its file name describes plus its shape,
 * so size variants, CDN mirrors and WordPress site-icon crops of one mark collapse, while a wide wordmark and a
 * square mark of the same brand stay two pictures.
 */
export function logoKey(url: string, fileId?: string | null): string {
  if (fileId) return `file:${fileId}`;
  const { host, file } = parsed(url);
  if (ICON_FAMILY.test(file)) return `icon:${host}`;
  const stem = nameStem(file);
  if (stem) return `name:${stem}:${shapeOf(file)}`;
  return file
    .replace(/[-_@]?\d+x\d+(?=[._-])/g, "")
    .replace(/[-_]?(scaled|small|large|thumb)(?=\.)/, "")
    .replace(/[-_]\d+(?=\.)/, "");
}

export interface RankableLogo {
  url: string;
  kind: string;
  fileId?: string | null;
  /** A provider link past its expiry: still shown (with its Refresh), never ahead of a picture that loads. */
  expired?: boolean;
}

/** Best first, one per picture (the best-scored copy of each wins). */
export function rankLogos<T extends RankableLogo>(logos: readonly T[]): T[] {
  const best = new Map<string, { item: T; score: number }>();
  for (const item of logos) {
    const key = logoKey(item.url, item.fileId);
    const score = logoScore(item.url, item.kind) - (item.expired ? 60 : 0);
    const prev = best.get(key);
    if (!prev || score > prev.score) best.set(key, { item, score });
  }
  return [...best.values()].sort((a, b) => b.score - a.score).map((v) => v.item);
}

/**
 * The hero's logo: the brand's own logo URL unless it is a sharing banner, else the best ranked logo
 * asset that is not a banner. Null when nothing better than a banner exists (the mark falls back).
 */
export function pickHeroLogo(brandLogoUrl: string | null | undefined, assets: readonly RankableLogo[]): string | null {
  if (brandLogoUrl && !isBannerUrl(brandLogoUrl)) return brandLogoUrl;
  const best = rankLogos(assets.filter((a) => a.kind !== "favicon" && !isBannerUrl(a.url)))[0];
  return best?.url ?? null;
}

/** A property as far as avatar provenance needs it. */
export interface OwnedAccount {
  id?: string;
  kind: string;
  url: string | null;
  handle: string | null;
  owner_kind: string | null;
}

/** An asset as far as avatar provenance needs it. */
export interface AvatarProvenanceAsset {
  id: string;
  source: string | null;
  confirmed_by: string | null;
  notes: string | null;
}

// Smart Add writes "Smart Add enrich · <platform> photo · <account url>" on a profile picture it saved as a logo.
const AVATAR_NOTE = /^Smart Add (?:enrich|validation) · ([a-z0-9_]+) photo · (\S+)/i;

function accountHandle(url: string): string {
  const path = url.replace(/^https?:\/\/(www\.)?[^/]+\/?/i, "").split(/[?#]/)[0] ?? "";
  const parts = path.split("/").filter(Boolean);
  const marker = parts.findIndex((p) => ["in", "pub", "user", "c", "channel", "company"].includes(p.toLowerCase()));
  return (marker >= 0 ? (parts[marker + 1] ?? "") : (parts[0] ?? "")).replace(/^@/, "").toLowerCase();
}

/**
 * Ids of the discovered logo assets that are a PERSON's profile picture: Smart Add noted the account the photo came
 * from, and that account is a property owned by a person (web.property.owner_kind = 'person'). A person's headshot
 * is never the brand's mark. Only unconfirmed-by-a-person discovered rows qualify; uploads and confirmed assets never.
 */
export function personAvatarAssetIds(assets: readonly AvatarProvenanceAsset[], properties: readonly OwnedAccount[]): Set<string> {
  const personal = properties
    .filter((p) => p.owner_kind === "person")
    .map((p) => ({ kind: p.kind.toLowerCase(), handle: (p.handle || (p.url ? accountHandle(p.url) : "")).replace(/^@/, "").toLowerCase() }))
    .filter((p) => p.handle);
  const ids = new Set<string>();
  for (const asset of assets) {
    if (asset.source !== "discovered" || asset.confirmed_by) continue;
    const note = asset.notes?.match(AVATAR_NOTE);
    if (!note) continue;
    const platform = note[1]!.toLowerCase();
    const handle = accountHandle(note[2]!);
    if (personal.some((p) => p.kind === platform && p.handle === handle)) ids.add(asset.id);
  }
  return ids;
}

/** The brand's live account a profile picture came from (same platform and handle), or null when none matches. */
export function sourceAccountOf<T extends OwnedAccount>(properties: readonly T[], platform: string | null | undefined, accountUrl: string | null | undefined): T | null {
  if (!platform || !accountUrl) return null;
  const handle = accountHandle(accountUrl);
  if (!handle) return null;
  const kind = platform.toLowerCase();
  return properties.find((p) => p.kind.toLowerCase() === kind && (p.handle || (p.url ? accountHandle(p.url) : "")).replace(/^@/, "").toLowerCase() === handle) ?? null;
}

/**
 * Ids of discovered social-avatar logos whose source account is no longer a live property of the brand (an orphan
 * picture: the account was removed or never was ours). They are not brand logos. `properties` must be the brand's LIVE properties.
 */
export function orphanAvatarAssetIds(assets: readonly AvatarProvenanceAsset[], properties: readonly OwnedAccount[]): Set<string> {
  const ids = new Set<string>();
  for (const asset of assets) {
    if (asset.source !== "discovered" || asset.confirmed_by) continue;
    const note = asset.notes?.match(AVATAR_NOTE);
    if (!note) continue;
    if (!sourceAccountOf(properties, note[1], note[2])) ids.add(asset.id);
  }
  return ids;
}
