/** @jest-environment node */
// CD-PAY-11 / CD-PAY-02: a business's own domain 404s every /api path it does not list
// (host-routing PUBLIC_API_PREFIXES). A published page served there (form, booking page, portal,
// Spaces page) that calls an /api path missing from that list breaks ONLY on the custom host —
// "Pay again" posted to /api/payments/retry and got Not found on ridge-pages.kidsmatrx.com
// (2026-10-22). The class: every /api path the published-page code names must be open there.

import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { apiAllowedOnCustomHost } from "@/lib/custom-domains/host-routing";

const ROOT = join(__dirname, "..", "..", "..");
// The code a custom host serves: the public form/booking/Spaces routes, the portal, and the
// feature components those pages render.
const DIRS = [
  "app/(link)/f",
  "app/(link)/b",
  "app/(link)/site",
  "app/(portal)",
  "features/portals",
  "features/payments",
  "features/booking",
  "features/spaces/public",
  "components/public-link",
  "features/continued-access",
];

function files(dir: string): string[] {
  let entries: string[] = [];
  try { entries = readdirSync(dir); } catch { return []; }
  return entries.flatMap((name) => {
    const p = join(dir, name);
    if (name === "__tests__" || name === "node_modules") return [];
    if (statSync(p).isDirectory()) return files(p);
    return /\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}

function apiPathsIn(source: string): string[] {
  const out: string[] = [];
  for (const m of source.matchAll(/["'`](\/api\/[^"'`\s?#]*)/g)) {
    // A template segment (${form.form_id}) stands for one path segment.
    out.push(m[1].replace(/\$\{[^}]*\}/g, "x"));
  }
  return out;
}

describe("every /api path a published page calls is open on its custom host", () => {
  const used = DIRS.flatMap((d) => files(join(ROOT, d))).flatMap((f) =>
    apiPathsIn(readFileSync(f, "utf8")).map((path) => ({ file: f.slice(ROOT.length + 1), path })),
  );

  it("finds the published pages' API calls (the scan is not empty)", () => {
    expect(used.some((u) => u.path.startsWith("/api/forms/"))).toBe(true);
    expect(used.some((u) => u.path.startsWith("/api/payments/"))).toBe(true);
  });

  it("each one is allowed on a custom host", () => {
    const closed = used.filter((u) => !apiAllowedOnCustomHost(u.path)).map((u) => `${u.file}: ${u.path}`);
    expect(closed).toEqual([]);
  });

  it("still 404s the app's private API on a custom host", () => {
    for (const p of ["/api/payments/connect", "/api/payments/retryX", "/api/user/profile", "/api/admin/users"]) {
      expect(apiAllowedOnCustomHost(p)).toBe(false);
    }
  });
});
