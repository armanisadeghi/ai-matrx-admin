import type { ScraperResult } from "@/features/scraper/hooks/useScraperApi";

export function contentLength(r: ScraperResult): number {
  return r.textContent?.length ?? (r.overview?.char_count as number) ?? 0;
}

export function sortByContent(results: ScraperResult[]): ScraperResult[] {
  return [...results].sort((a, b) => contentLength(b) - contentLength(a));
}

export function formatCharCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return `${count}`;
}

export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    new URL(withProtocol);
    return withProtocol;
  } catch {
    return null;
  }
}
