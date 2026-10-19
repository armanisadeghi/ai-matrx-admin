/**
 * Returns the browser-facing origin for the current request.
 *
 * Server Actions receive the browser's `Origin` header. When it is unavailable,
 * reconstruct the origin from proxy/host headers. This keeps OAuth callbacks on
 * the exact localhost port or deployment host where the flow began.
 */
export function requestOrigin(
  headersList: Pick<Headers, "get">,
): string | null {
  const originHeader = headersList.get("origin")?.trim();
  if (originHeader) {
    try {
      const parsed = new URL(originHeader);
      if (
        (parsed.protocol === "http:" || parsed.protocol === "https:") &&
        parsed.origin === originHeader
      ) {
        return parsed.origin;
      }
    } catch {
      // Fall through to the request authority headers.
    }
  }

  const forwardedHost = headersList
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const host = forwardedHost || headersList.get("host")?.trim();
  if (!host || !/^[a-z0-9.-]+(:\d{1,5})?$/i.test(host)) return null;

  const forwardedProtocol = headersList
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
  const protocol =
    forwardedProtocol === "http" || forwardedProtocol === "https"
      ? forwardedProtocol
      : /^(([a-z0-9-]+\.)*localhost|127\.0\.0\.1)(:\d{1,5})?$/i.test(host)
        ? "http"
        : "https";

  return `${protocol}://${host}`;
}

/**
 * The site address the request was served on (x-forwarded-host, else host) — never the `Origin`
 * header, which on an embedded form is the embedding page's site. Payment return URLs use this so a
 * payer who started on book.theirbusiness.com comes back there, never to a configured base or localhost.
 */
export function requestHostOrigin(headersList: Pick<Headers, "get">): string | null {
  return requestOrigin({
    get: (name: string) => (name.toLowerCase() === "origin" ? null : headersList.get(name)),
  });
}
