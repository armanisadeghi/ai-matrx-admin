/**
 * Convert a public third-party image URL into the same-origin, SSRF-guarded
 * image proxy route. Brand-library rows can outlive a provider's hotlink/CORS
 * policy, so browser-direct loading is not reliable evidence that the asset is
 * renderable. The proxy deliberately remains a rendering fallback rather than
 * pretending the external bytes are an owned `files.files` row.
 */
export function proxiedExternalImageUrl(url: string): string {
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

/**
 * Provider CDNs whose images a browser refuses to draw cross-origin (ERR_BLOCKED_BY_ORB / CORP): YouTube channel
 * avatars (yt3.*), Instagram and Facebook CDNs, TikTok. Their URLs go through our image proxy (2026-10-14: Smart
 * Add's YouTube candidate avatars rendered blank).
 */
const ORB_HOSTS = /(^|\.)(yt3\.ggpht\.com|yt3\.googleusercontent\.com|cdninstagram\.com|fbcdn\.net|tiktokcdn(-us)?\.com|tiktokcdn-eu\.com)$/i;

export function blocksCrossOriginImages(url: string): boolean {
  try {
    return ORB_HOSTS.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** A third-party image URL a browser can draw: absolute http(s) URLs through our proxy, anything else unchanged. */
export function browserImageUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? proxiedExternalImageUrl(url) : url;
}
