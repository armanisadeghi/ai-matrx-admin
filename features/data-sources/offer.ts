/**
 * A pasted or typed address that a data source can read ("Trustpilot reviews", "Google Maps places")
 * → the catalog source it belongs to (pure). Every surface OFFERS "Get as data table"; none ever
 * fetches on paste. One address only; the paste itself still lands as usual.
 */

import { matchSourceForUrl, type DataSource } from "./contract";

/** A line that is a web address and nothing else ("hello" is text, not a host). */
export function asWebAddress(line: string): URL | null {
  const raw = line.trim();
  if (!raw || /\s/.test(raw)) return null;
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  return url.hostname.includes(".") || url.hostname === "localhost" ? url : null;
}

export function dataTableOffer(text: string, sources: readonly DataSource[]): { source: DataSource; url: string } | null {
  const lines = text.trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length !== 1) return null;
  const url = asWebAddress(lines[0]);
  if (!url) return null;
  const source = matchSourceForUrl(url.href, sources);
  return source ? { source, url: url.href } : null;
}
