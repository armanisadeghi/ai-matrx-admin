// The 2026-10-22 move put every brand page under /marketing/brands/<brand>/…. Every old
// /marketing/<brand>/… address must 308 to the same page at the new address, and no static
// Marketing page may be swallowed by the rule. Run through Next's OWN matcher and destination
// compiler, so a pattern Next reads differently from a regex tester fails here.
import fs from "fs";
import path from "path";

import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";
import { prepareDestination } from "next/dist/shared/lib/router/utils/prepare-destination";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { marketingBrandRedirects, marketingStaticSegments } = require("./marketingBrandRedirects") as {
  marketingBrandRedirects: (dir?: string) => { source: string; destination: string; permanent: boolean }[];
  marketingStaticSegments: (dir?: string) => string[] | null;
};

const MARKETING = path.join(__dirname, "..", "..", "app", "(core)", "marketing");
const BRAND_TREE = path.join(MARKETING, "brands", "[brandId]");

/** Every page under the moved tree as a route pattern relative to the brand ("" = the brand page). */
function brandPagePatterns(dir = BRAND_TREE, prefix: string[] = []): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) out.push(...brandPagePatterns(path.join(dir, entry.name), [...prefix, entry.name]));
    else if (entry.name === "page.tsx") out.push(prefix.join("/"));
  }
  return out;
}

/** A concrete path for a pattern: `[siteId]` → a key, `[...rest]` → two segments. */
function concrete(pattern: string): string {
  return pattern
    .split("/")
    .filter(Boolean)
    .map((seg) => (seg.startsWith("[...") || seg.startsWith("[[...") ? "a/b" : seg.startsWith("[") ? "acme-site" : seg))
    .join("/");
}

const [rule] = marketingBrandRedirects();
const match = getPathMatch(rule.source, { removeUnnamedParams: true, strict: true });

function redirectOf(pathname: string, search = ""): string | null {
  const params = match(pathname);
  if (!params) return null;
  const { parsedDestination } = prepareDestination({
    appendParamsToQuery: false,
    destination: rule.destination,
    params,
    query: Object.fromEntries(new URLSearchParams(search)),
  });
  // Next serializes the merged query onto the Location header the same way.
  const query = new URLSearchParams(parsedDestination.query as Record<string, string>).toString();
  return `${parsedDestination.pathname}${query ? `?${query}` : ""}`;
}

describe("/marketing/<brand>/… → /marketing/brands/<brand>/…", () => {
  it("is one permanent rule", () => {
    expect(marketingBrandRedirects()).toHaveLength(1);
    expect(rule.permanent).toBe(true);
  });

  const pages = brandPagePatterns();

  it("covers the whole moved tree (161 brand pages)", () => {
    expect(pages.length).toBeGreaterThanOrEqual(161);
  });

  it.each(["acme", "acme-co", "3f0f7a52-5b0e-4b7a-9b1a-2a7b1c0e9d11"])(
    "maps every old page address for brand %s to the same page under /marketing/brands",
    (brand) => {
      const misses: string[] = [];
      for (const pattern of pages) {
        if (pattern.startsWith("[...legacy]")) continue; // the legacy door has no pre-move twin
        const rest = concrete(pattern);
        const from = `/marketing/${brand}${rest ? `/${rest}` : ""}`;
        const to = `/marketing/brands/${brand}${rest ? `/${rest}` : ""}`;
        if (redirectOf(from) !== to) misses.push(`${from} → ${redirectOf(from)}`);
      }
      expect(misses).toEqual([]);
    },
  );

  it("keeps the query string", () => {
    expect(redirectOf("/marketing/acme/identity/media", "brief=hello%20world&site=x")).toBe(
      "/marketing/brands/acme/identity/media?brief=hello+world&site=x",
    );
  });

  it("never moves a static Marketing page, at any depth", () => {
    const statics = marketingStaticSegments() ?? [];
    expect(statics).toEqual(expect.arrayContaining(["brands", "reports", "operations", "tools", "topical-maps"]));
    for (const seg of statics) {
      expect(redirectOf(`/marketing/${seg}`)).toBeNull();
      expect(redirectOf(`/marketing/${seg}/x/y`)).toBeNull();
    }
    expect(redirectOf("/marketing")).toBeNull();
    expect(redirectOf("/marketing/brands/acme")).toBeNull();
  });

  it("moves a brand key that only STARTS with a static word", () => {
    expect(redirectOf("/marketing/reports-co/ads")).toBe("/marketing/brands/reports-co/ads");
  });

  it("omits the rule when the marketing tree is not on disk (a parked build profile)", () => {
    expect(marketingBrandRedirects(path.join(MARKETING, "does-not-exist"))).toEqual([]);
  });
});
