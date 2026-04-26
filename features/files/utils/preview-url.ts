/**
 * features/files/utils/preview-url.ts
 *
 * Utility for routing file content fetches through the server-side proxy
 * at /api/files/content so previewers avoid browser CORS restrictions.
 *
 * Browser element tags (<img>, <video>, <audio>) load cross-origin URLs
 * without CORS enforcement and should NOT use this proxy — pass the signed
 * URL directly to their `src` prop as usual.
 *
 * JS fetch() calls DO enforce CORS. Any previewer that calls fetch() to
 * read file content (text, CSV, Markdown, code, Excel) must route through
 * this proxy so the request originates from the Next.js server rather than
 * the browser.
 */

/**
 * Wraps a signed Supabase Storage URL in the server-side content proxy so
 * that fetch() calls are same-origin from the browser's perspective.
 *
 * Returns `null` when `signedUrl` is null/undefined (pass-through guard).
 */
export function toPreviewProxyUrl(
  signedUrl: string | null | undefined,
): string | null {
  if (!signedUrl) return null;
  return `/api/files/content?url=${encodeURIComponent(signedUrl)}`;
}
