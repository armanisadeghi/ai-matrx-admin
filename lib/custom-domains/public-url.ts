// lib/custom-domains/public-url.ts — the address a business SHARES for a form, booking page or portal.
// When a live custom domain maps the thing, its link is that domain (https://book.theirbusiness.com),
// never our /f/<id>. Pure helpers here; the read is iam.org_domain_public_urls (members) and, on a
// signed-out page, the host's own iam.org_domain_resolve answer. Plan step 6 of
// common-docs/systems/data/custom-data/CUSTOM-DOMAINS.md.

/** The target id an internal public path points at: /f/<id>, /b/<id> or /portal/<org id>. */
export function publicTargetId(href: string | null | undefined): string | null {
  if (!href) return null;
  const match = /^\/(?:f|b|portal)\/([0-9a-f-]{36})\/?$/i.exec(href);
  return match ? match[1].toLowerCase() : null;
}

/** Swaps each internal public link for the custom-domain address of its target, when one exists. */
export function applyPublicUrls<T extends { publicHref: string | null }>(
  rows: readonly T[],
  urls: Readonly<Record<string, string>>,
): T[] {
  return rows.map((row) => {
    const id = publicTargetId(row.publicHref);
    const url = id ? urls[id] : undefined;
    return url ? { ...row, publicHref: url } : row;
  });
}
