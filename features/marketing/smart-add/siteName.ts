/**
 * The name of the business behind a web result (pure; no I/O, no AI). A result's title is a page title
 * ("Staffing Solutions | Stone Bridge Personnel | Tyler, Fort Worth ..."), never the business's name, so a
 * competitor saved from it must not carry it (MKT-041). Order: the site's own name when the result has one
 * (`og:site_name`), else the title segment that is the brand segment (the one that reads like the site's
 * domain), else the domain.
 */

const SEPARATOR = /\s+[|\-–—:·•»]\s+|\s*\|\s*/;

const squeeze = (text: string): string =>
  text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/** The registrable-ish name part of a host: `www.stonebridgepersonnel.com` → `stonebridgepersonnel`. */
function hostLabel(host: string): string {
  const parts = host.toLowerCase().replace(/^www\./, "").split(".");
  const tld2 = parts.length > 2 && parts[parts.length - 1].length === 2 && parts[parts.length - 2].length <= 3;
  return parts.slice(0, tld2 ? -2 : -1).pop() ?? "";
}

/** The business name for a result: `siteName` (og:site_name) when present, else the title's brand segment, else `host`. */
export function siteNameOf(input: { title?: string | null; siteName?: string | null; host: string }): string {
  const site = (input.siteName ?? "").trim();
  if (site) return site;
  const label = squeeze(hostLabel(input.host));
  const segments = (input.title ?? "")
    .split(SEPARATOR)
    .map((s) => s.trim())
    .filter(Boolean);
  if (label.length >= 3) {
    // The segment the domain spells out ("Stone Bridge Personnel" ↔ stonebridgepersonnel.com) is the brand.
    const hit = segments.find((s) => {
      const q = squeeze(s);
      return q.length >= 3 && (q === label || label.includes(q) || q.includes(label));
    });
    if (hit) return hit.replace(/\s*[.…]+$/, "").trim();
  }
  return input.host.replace(/^www\./, "");
}
