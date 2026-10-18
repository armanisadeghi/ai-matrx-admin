// lib/custom-domains/host-routing.ts — pure host → internal-route decisions for custom domains.
// A business's own host (book.theirbusiness.com) serves ONLY the published things its routes map;
// every other path on that host is a 404 (never the app). Plan: common-docs/systems/data/custom-data/CUSTOM-DOMAINS.md
// No imports: proxy.ts runs this on every matched request.

export type DomainTargetKind = "form" | "booking" | "portal";

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
