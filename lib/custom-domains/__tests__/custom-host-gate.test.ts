// Every path class a business's custom host can be asked for, and what it must answer.
// RED before the gate: /auth/*, /app_redirect, /app_callback, /public/*, sitemap/robots/manifests and
// file-shaped route handlers were outside the proxy matcher and served the app on any custom host.
import {
  apiAllowedOnCustomHost,
  customHostPathClass,
  internalPathFor,
  nonPageAllowedOnCustomHost,
  passthroughOnCustomHost,
  type ResolvedDomain,
} from "../host-routing";

const org = "0a54df90-eab8-4d07-ab29-81a45fb41e04";
const booking = "c605f46f-b996-43e5-8767-503a0283932d";
const form = "6eb05c97-547d-4092-bbde-f87ce43492e7";
const withPortal: ResolvedDomain = {
  organization_id: org,
  routes: [
    { path_prefix: "/", target_kind: "booking", target_id: booking },
    { path_prefix: "/intake", target_kind: "form", target_id: form },
    { path_prefix: "/portal", target_kind: "portal", target_id: org },
  ],
};
const formsOnly: ResolvedDomain = { organization_id: org, routes: [withPortal.routes[1]] };

/** What the proxy answers on a custom host: served (rewrite or as-is) or 404. */
function served(path: string, domain: ResolvedDomain): boolean {
  if (customHostPathClass(path) !== "page") return nonPageAllowedOnCustomHost(path, domain);
  return internalPathFor(path, domain) !== null || passthroughOnCustomHost(path, domain);
}

const NEVER_SERVED = [
  // app pages
  "/administration", "/agents", "/chat", "/settings", "/organizations/x/settings", "/data", "/dashboard",
  "/f/00000000-0000-0000-0000-000000000000", "/b/00000000-0000-0000-0000-000000000000",
  // auth flows other than the sign-in landings
  "/auth", "/auth/support-session", "/auth/extension-callback", "/auth/desktop-handoff",
  "/auth/verifying", "/auth/auth-code-error",
  // OAuth app linking
  "/app_redirect", "/app_redirect/x", "/app_callback", "/app_callback/google",
  // the public/ directory route and file-shaped route handlers
  "/public/anything", "/sitemap.xml", "/robots.txt", "/manifest.webmanifest", "/education.webmanifest",
  "/data.json", "/report.pdf", "/export.zip", "/llms.txt", "/feed.xml",
  // private API
  "/api/user/profile", "/api/payments/connect", "/api/payments/returnX", "/api/admin/surfaces/drift-report",
  "/api/organizations/x/domains", "/api",
];

describe("a custom host never serves the app's non-public paths", () => {
  it.each(NEVER_SERVED)("%s → 404", (path) => {
    expect(served(path, withPortal)).toBe(false);
  });
});

describe("a custom host serves what its published pages need", () => {
  it.each([
    "/", "/intake", "/portal", "/login", "/forgot-password", "/b/manage/abc123",
    "/auth/confirm", "/auth/callback",
    "/_next/static/chunks/a.js", "/matrx/favicon-32x32.png", "/fonts/x.woff2", "/blob-sw.js",
    "/api/forms/x/submit", "/api/bookings/x/hold", "/api/portal/s/sign-in", "/api/payments/return",
    "/api/diagnostics/client-error", "/api/set-theme",
  ])("%s → served", (path) => {
    expect(served(path, withPortal)).toBe(true);
  });
  it("serves sign-in landings only when a portal is mapped", () => {
    expect(served("/auth/confirm", formsOnly)).toBe(false);
    expect(served("/auth/callback", formsOnly)).toBe(false);
    expect(served("/login", formsOnly)).toBe(false);
  });
  it("matches /api/payments/return exactly", () => {
    expect(apiAllowedOnCustomHost("/api/payments/return")).toBe(true);
    expect(apiAllowedOnCustomHost("/api/payments/returnX")).toBe(false);
    expect(apiAllowedOnCustomHost("/api/payments/return/x")).toBe(false);
  });
});
