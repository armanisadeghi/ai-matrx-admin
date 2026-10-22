/**
 * Indexability verdict — ONE deterministic answer to "will Google index this
 * URL, and if not, why". Mirror of `matrx_scraper/audit_metrics.py`
 * `evaluate_indexability` (logic, URL normalization, and issue strings
 * byte-identical).
 */

import type { AuditIssue } from "./types";

export type IndexabilityVerdict = "indexable" | "check" | "blocked";

export interface RedirectHopInput {
  url: string;
  status: number | null;
}

export interface IndexabilityInput {
  httpStatus: number | null;
  metaRobots: string | null;
  canonicalUrl: string | null;
  redirectChain: RedirectHopInput[];
  finalUrl: string | null;
  /** The URL that was requested, when it differs from `finalUrl`. */
  requestedUrl?: string | null;
}

export interface IndexabilityEvaluation {
  /** verdict === "indexable". */
  ok: boolean;
  verdict: IndexabilityVerdict;
  httpStatus: number | null;
  noindex: boolean;
  nofollow: boolean;
  canonicalUrl: string | null;
  /** null when no canonical tag is present. */
  canonicalMatches: boolean | null;
  redirectHops: number;
  finalUrl: string | null;
  issues: AuditIssue[];
}

/**
 * Normalize a URL for canonical comparison: lowercase scheme+host, drop
 * default ports and fragments, strip ONE trailing slash from the path.
 * Mirrors Python `_normalize_url_for_comparison`.
 */
export function normalizeUrlForComparison(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return url.trim();
  }
  const protocol = parsed.protocol.toLowerCase();
  const host = parsed.hostname.toLowerCase();
  const port =
    parsed.port &&
    !(
      (protocol === "https:" && parsed.port === "443") ||
      (protocol === "http:" && parsed.port === "80")
    )
      ? `:${parsed.port}`
      : "";
  let path = parsed.pathname;
  if (path.endsWith("/")) path = path.slice(0, -1);
  return `${protocol}//${host}${port}${path}${parsed.search}`;
}

/**
 * A canonical href resolved against the page it was declared on. Mirror of
 * Python `resolve_canonical_url` — the ONE resolver every canonical comparison
 * uses (`href="/p"` and `href="//host/p"` are self-canonicals on https://host/p).
 */
export function resolveCanonicalUrl(canonicalUrl: string, pageUrl: string | null): string {
  const href = canonicalUrl.trim();
  if (!pageUrl) return href;
  try {
    return new URL(href, pageUrl).href;
  } catch {
    return href;
  }
}

/**
 * Whether a canonical names one of the addresses this page was reached by
 * (resolved against each, then normalized). Mirror of Python
 * `canonical_is_self`; null = no canonical or no known address.
 */
export function canonicalIsSelf(
  canonicalUrl: string | null,
  ...pageUrls: (string | null | undefined)[]
): boolean | null {
  if (!canonicalUrl || !canonicalUrl.trim()) return null;
  const known = pageUrls.filter((url): url is string => typeof url === "string" && url !== "");
  if (known.length === 0) return null;
  const normalized = new Set(known.map((url) => normalizeUrlForComparison(url)));
  return known.some((base) =>
    normalized.has(normalizeUrlForComparison(resolveCanonicalUrl(canonicalUrl, base))),
  );
}

/** Parse a robots directive string into lowercase tokens. */
function robotsTokens(metaRobots: string | null): string[] {
  if (!metaRobots) return [];
  return metaRobots
    .toLowerCase()
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
}

/**
 * The addresses that ARE this page, for "is the canonical self?". Mirror of
 * Python `self_canonical_urls`: the final URL (stored, and the redirect chain's
 * last hop) plus the requested URL only when the request did not redirect.
 */
export function selfCanonicalUrls(
  finalUrl: string | null,
  redirectChain: ReadonlyArray<{ url?: string | null } | null | undefined> | null | undefined,
  requestedUrl: string | null = null,
): string[] {
  const hops = (redirectChain ?? [])
    .map((hop) => hop?.url)
    .filter((url): url is string => typeof url === "string" && url !== "");
  const known: string[] = finalUrl ? [finalUrl] : [];
  if (hops.length > 0) known.push(hops[hops.length - 1]);
  if (requestedUrl && hops.length <= 1) known.push(requestedUrl);
  return known;
}

export function evaluateIndexability(
  input: IndexabilityInput,
): IndexabilityEvaluation {
  const tokens = robotsTokens(input.metaRobots);
  const noindex = tokens.includes("noindex") || tokens.includes("none");
  const nofollow = tokens.includes("nofollow") || tokens.includes("none");
  const redirectHops = Math.max(0, input.redirectChain.length - 1);
  // Self = the final URL (stored, or the chain's last hop), or the requested
  // URL when nothing redirected. Any other chain URL — the start URL included —
  // is a redirect (Python `self_canonical_urls`, same rule).
  const canonicalMatches =
    input.canonicalUrl && input.finalUrl
      ? Boolean(
          canonicalIsSelf(
            input.canonicalUrl,
            ...selfCanonicalUrls(
              input.finalUrl,
              input.redirectChain,
              input.requestedUrl ?? null,
            ),
          ),
        )
      : null;

  const issues: AuditIssue[] = [];
  if (input.httpStatus !== null && input.httpStatus >= 400)
    issues.push({
      severity: "error",
      message: `Page returns HTTP ${input.httpStatus}`,
    });
  if (noindex)
    issues.push({
      severity: "error",
      message:
        "Meta robots contains noindex — Google is told not to index this page",
    });
  if (nofollow)
    issues.push({
      severity: "warning",
      message:
        "Meta robots contains nofollow — links on this page pass no equity",
    });
  if (canonicalMatches === false)
    issues.push({
      severity: "warning",
      message: `Canonical points elsewhere (${input.canonicalUrl}) — Google may index that URL instead`,
    });
  if (redirectHops > 0)
    issues.push({
      severity: "warning",
      message: `URL redirects through ${redirectHops} hop(s) before resolving`,
    });
  if (input.httpStatus === null)
    issues.push({
      severity: "warning",
      message: "HTTP status was not captured",
    });

  const hasError = issues.some((issue) => issue.severity === "error");
  const verdict: IndexabilityVerdict = hasError
    ? "blocked"
    : issues.length > 0
      ? "check"
      : "indexable";

  return {
    ok: verdict === "indexable",
    verdict,
    httpStatus: input.httpStatus,
    noindex,
    nofollow,
    canonicalUrl: input.canonicalUrl,
    canonicalMatches,
    redirectHops,
    finalUrl: input.finalUrl,
    issues,
  };
}
