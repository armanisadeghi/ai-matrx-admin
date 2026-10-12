/**
 * Pictures on their way to a Google Doc.
 *
 * A document's markdown points at our own pictures as `matrx-file:<id>#WxH`;
 * Google inserts an inline image only from an address it can fetch. Each of
 * ours gets a short-lived read-only link (one hour: Google fetches once, at
 * insert). A picture we cannot link is left out and NAMED in the result —
 * never dropped silently.
 */
"use client";

import { pythonShareUrl } from "@/features/files/handler/utils/python-base";
import { createShareLink } from "@/utils/permissions/shareLinks";

const IMAGE_RE = /!\[([^\]]*)\]\(([^)\s]+)\)/g;
const OWN_RE = /^matrx-file:([0-9a-f-]+)(?:#\d+x\d+)?$/i;
const LINK_LIFETIME_MS = 60 * 60 * 1000;

export interface GoogleReadyMarkdown {
  markdown: string;
  /** Short sentences for the toast: what did not go to Google. */
  notes: string[];
}

export type ImageLinker = (fileId: string) => Promise<string | null>;

/** The real linker: a one-hour read-only link Google can fetch. */
export const shareLinkImageLinker: ImageLinker = async (fileId) => {
  const link = await createShareLink({
    resourceType: "file",
    resourceId: fileId,
    permissionLevel: "viewer",
    expiresAt: new Date(Date.now() + LINK_LIFETIME_MS).toISOString(),
    label: "Google Docs picture",
  });
  return link.success && link.token ? pythonShareUrl(link.token) : null;
};

/** Pure core (linker injected) — every picture is carried or counted. */
export async function googleReadyMarkdown(
  markdown: string,
  linker: ImageLinker = shareLinkImageLinker,
): Promise<GoogleReadyMarkdown> {
  const found = [...markdown.matchAll(IMAGE_RE)];
  if (found.length === 0) return { markdown, notes: [] };
  const urls = new Map<string, string | null>();
  for (const m of found) {
    const own = m[2].match(OWN_RE);
    if (!own || urls.has(m[2])) continue;
    try {
      urls.set(m[2], await linker(own[1]));
    } catch {
      urls.set(m[2], null);
    }
  }
  let left = 0;
  const out = markdown.replace(IMAGE_RE, (whole, alt: string, src: string) => {
    if (!OWN_RE.test(src)) return /^https?:\/\//i.test(src) ? whole : ((left += 1), "");
    const url = urls.get(src);
    if (!url) {
      left += 1;
      return "";
    }
    return `![${alt}](${url})`;
  });
  return {
    markdown: out,
    notes: left > 0 ? [`${left} picture(s) not sent: no link Google could open.`] : [],
  };
}

/** Pictures that arrived from Google as links (they live in Google, not here). */
export function googleImageNote(markdown: string): string | null {
  const n = [...markdown.matchAll(IMAGE_RE)].filter((m) => !OWN_RE.test(m[2])).length;
  return n > 0 ? `${n} picture(s) from Google kept as links.` : null;
}
