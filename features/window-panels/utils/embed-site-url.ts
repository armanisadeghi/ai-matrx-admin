/**
 * Normalize user-typed URLs for iframe navigation (https default, trim).
 */
export function normalizeUserUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    if (/^https?:\/\//i.test(t)) {
      return new URL(t).toString();
    }
    return new URL(`https://${t}`).toString();
  } catch {
    return null;
  }
}

export function shortUrlLabel(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "") || url;
  } catch {
    return url.slice(0, 32);
  }
}
