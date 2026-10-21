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
  if (SOCIAL_AVATAR_HOST.test(host)) score -= 8;
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
