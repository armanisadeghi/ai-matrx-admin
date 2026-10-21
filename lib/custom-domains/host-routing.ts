// lib/custom-domains/host-routing.ts — pure host → internal-route decisions for custom domains.
// A business's own host (book.theirbusiness.com) serves ONLY the published things its routes map;
// every other path on that host is a 404 (never the app). Plan: common-docs/systems/data/custom-data/CUSTOM-DOMAINS.md
// No imports: proxy.ts runs this on every matched request.

/** "space": a Spaces page published to the web (content.space_public_view), served at /site/<id>. */
export type DomainTargetKind = "form" | "booking" | "portal" | "space";

export interface DomainRoute {
  path_prefix: string;
  target_kind: DomainTargetKind;
  target_id: string;
}

export interface ResolvedDomain {
  organization_id: string;
  routes: DomainRoute[];
}

/** Suffixes that are always ours: never looked up, never a customer host. */
const PLATFORM_SUFFIXES = ["aimatrx.com", "appmatrx.com", "matrxserver.com", "vercel.app"];

function bareHost(host: string): string {
  return host.trim().toLowerCase().replace(/:\d+$/, "");
}

function endsWithDomain(host: string, suffix: string): boolean {
  return host === suffix || host.endsWith(`.${suffix}`);
}

/**
 * How the proxy treats a request host:
 * - "platform": ours — the normal app.
 * - "dev": a `*.localhost` preview host — look it up, fall back to the app on a miss.
 * - "custom": anything else — look it up; a miss is a 404 (dangling DNS never serves the app).
 */
export function hostClass(rawHost: string | null, ownHosts: readonly (string | null | undefined)[]): "platform" | "dev" | "custom" {
  if (!rawHost) return "platform";
  const host = bareHost(rawHost);
  if (ownHosts.some((own) => own && bareHost(own) === host)) return "platform";
  if (host === "localhost" || host === "[::1]" || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return "platform";
  if (PLATFORM_SUFFIXES.some((suffix) => endsWithDomain(host, suffix))) return "platform";
  if (host.endsWith(".localhost")) return "dev";
  return "custom";
}

export function normalizeHost(rawHost: string): string {
  return bareHost(rawHost);
}

function basePath(route: DomainRoute, organizationId: string): string {
  switch (route.target_kind) {
    case "form":
      return `/f/${route.target_id}`;
    case "booking":
      return `/b/${route.target_id}`;
    case "portal":
      return `/portal/${organizationId}`;
    case "space":
      return `/site/${route.target_id}`;
  }
}

/**
 * The internal path a custom-host request is rewritten to, or null (404).
 * Longest prefix wins; `/book/x` under prefix `/book` keeps `/x` after the target.
 */
export function internalPathFor(pathname: string, domain: ResolvedDomain): string | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  const routes = [...domain.routes].sort((a, b) => b.path_prefix.length - a.path_prefix.length);
  for (const route of routes) {
    const prefix = route.path_prefix === "/" ? "" : route.path_prefix.replace(/\/+$/, "");
    if (prefix && path !== prefix && !path.startsWith(`${prefix}/`)) continue;
    const rest = path.slice(prefix.length);
    if (route.path_prefix === "/" && rest !== "/" && rest !== "") {
      // The root route serves only "/" — sub-paths of a root target are not published things.
      continue;
    }
    const tail = rest === "/" ? "" : rest;
    return basePath(route, domain.organization_id) + tail;
  }
  return null;
}

/**
 * API endpoints the published pages themselves call (forms, booking pages, the client portal sign-in,
 * the Stripe return, client error capture, theme). On a custom host every other /api path is a 404:
 * the host is a business's public face, never a door into the app's API.
 */
const PUBLIC_API_PREFIXES = [
  "/api/forms/",
  "/api/bookings/",
  "/api/portal/",
  "/api/payments/return",
  "/api/diagnostics/client-error",
  "/api/set-theme",
];

export function apiAllowedOnCustomHost(pathname: string): boolean {
  // An entry ending in "/" is a family (/api/forms/<id>/submit); any other entry is that exact path.
  return PUBLIC_API_PREFIXES.some((entry) => (entry.endsWith("/") ? pathname.startsWith(entry) : pathname === entry));
}

/** Files a published page loads beside its HTML (images, fonts, scripts, styles, media). */
const ASSET_EXTENSION = /\.(?:js|mjs|css|svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|eot|mp3|mp4|webm|wasm)$/i;

/** The magic-link / OAuth landings a portal sign-in completes through on the business's host. */
const SIGN_IN_AUTH_PATHS = ["/auth/confirm", "/auth/callback"];

/**
 * What a custom host does with a path BEFORE page routing (proxy.ts `customHostGate`):
 * - "api":    an /api path — served only if `apiAllowedOnCustomHost`;
 * - "asset":  a file a published page loads (and Next's own /_next files) — served;
 * - "auth":   a sign-in landing — served only when the domain maps a portal;
 * - "blocked": every other non-page path the app answers (/auth/*, /app_redirect, /app_callback,
 *             /public/*, sitemap/robots/manifests, .json/.txt/.xml/.pdf/... route handlers) — 404;
 * - "page":   everything else — decided by the domain's routes (`internalPathFor` / passthrough).
 */
export type CustomHostPathClass = "api" | "asset" | "auth" | "blocked" | "page";

export function customHostPathClass(pathname: string): CustomHostPathClass {
  const path = pathname.toLowerCase();
  if (path.startsWith("/api/") || path === "/api") return "api";
  if (path.startsWith("/_next/")) return "asset";
  if (SIGN_IN_AUTH_PATHS.some((p) => path === p || path === `${p}/`)) return "auth";
  if (/^\/(auth|app_redirect|app_callback|public)(\/|$)/.test(path)) return "blocked";
  if (ASSET_EXTENSION.test(path)) return "asset";
  // Any other file-shaped path (sitemap.xml, robots.txt, *.webmanifest, *.json, *.pdf ...) is ours, not theirs.
  if (/\.[a-z0-9]+$/.test(path.split("/").pop() ?? "")) return "blocked";
  return "page";
}

/** The gate's verdict for a non-page path on a mapped custom host. */
export function nonPageAllowedOnCustomHost(pathname: string, domain: ResolvedDomain): boolean {
  switch (customHostPathClass(pathname)) {
    case "api":
      return apiAllowedOnCustomHost(pathname);
    case "asset":
      return true;
    case "auth":
      return domain.routes.some((route) => route.target_kind === "portal");
    case "blocked":
      return false;
    case "page":
      return true;
  }
}

/** Sign-in pages a portal visitor needs on the business's own host (session cookies are per host). */
const SIGN_IN_PATHS = ["/login", "/forgot-password", "/reset-password", "/check-email", "/sign-out"];

/**
 * Paths a mapped custom host serves AS-IS (no rewrite), beside its routes:
 * - the sign-in pages, when the domain maps a portal (a signed-out portal visitor signs in here);
 * - /b/manage/<ref> (the "change or cancel" link of a booking), when the domain maps a booking page;
 * - /site/<link> (a published page's sub-page links), when the domain maps a Spaces page. Only pages on
 *   the web answer there (content.space_public_view); anything else is that page's own not-found.
 */
export function passthroughOnCustomHost(pathname: string, domain: ResolvedDomain): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  const kinds = new Set(domain.routes.map((route) => route.target_kind));
  if (kinds.has("portal") && SIGN_IN_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) return true;
  if (kinds.has("booking") && path.startsWith("/b/manage/")) return true;
  if (kinds.has("space") && /^\/site\/[^/]+$/.test(path)) return true;
  return false;
}

/**
 * The inverse of internalPathFor: the path THIS host shows an internal target at (/f/<id> → "/intake"),
 * or null when the host does not map it. Used to build links a visitor follows on the host they are on.
 */
export function publicPathFor(internalPath: string, domain: ResolvedDomain): string | null {
  const routes = [...domain.routes].sort((a, b) => a.path_prefix.length - b.path_prefix.length);
  for (const route of routes) {
    if (basePath(route, domain.organization_id) === internalPath) return route.path_prefix;
  }
  return null;
}
