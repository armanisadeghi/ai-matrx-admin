// EVERY CRUMB IS A REAL DOOR (Arman, 2026-10-22, on /marketing/brands/smart-add/validate/<id>:
// "when I click on 'Smart Add brand' it's not taking me there. I don't want fake things!!").
//
// For EVERY page in the route manifest, derive its breadcrumb trail with the real menu and fail on
// any crumb above the current page that has no address, or whose address is not a page the app
// serves (a folder with no page of its own is a 404). Also proves the two other halves of the class:
// a header kept in a LAYOUT links back to its own level (useOwnAddress / resolvePageTrail), and the
// generated pageless table matches the manifest.
import { describe, expect, it } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import { adminNavItems, primaryNavItems } from "@/features/shell/constants/nav-data";
import { routeEntryFor } from "@/lib/route-manifest/match";
import { deriveTrail, type TrailNavNode } from "../derive-trail";
import { isPagelessLevel, pagelessLevelsOf, renderPagelessLevelsModule } from "../pageless-levels";
import { PAGELESS_LEVELS } from "../pageless-levels.generated";
import { ownAddressOf } from "../useOwnAddress";
import { resolvePageTrail } from "@/features/shell/frame-host/framePageHeader";

const ROOT = path.join(__dirname, "../../../..");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "lib/route-manifest/manifest.generated.json"), "utf8")) as {
  routes: { pattern: string; status: string }[];
};
const PATTERNS = manifest.routes.map((r) => r.pattern);
const NAV = [...primaryNavItems, ...adminNavItems] as unknown as TrailNavNode[];
const ID = "b640e26f-50c7-420d-aff0-6c3541a8df6b";

/** A concrete address for a pattern: every `[param]` becomes a uuid, catch-alls one segment. */
const concrete = (pattern: string) =>
  pattern
    .replace(/\/\[\[\.\.\.[^\]]+\]\]$/, "")
    .replace(/\[\.\.\.[^\]]+\]/g, "x")
    .replace(/\[[^\]]+\]/g, ID) || "/";

/**
 * Does this address open a page of its own? Resolving is not answering (match.ts, V-28): Next serves
 * `/marketing/brands/smart-add/validate` with `/marketing/brands/[brandId]/[[...rest]]`, i.e. the
 * brand page for a brand named "smart-add". So a literal segment caught by a `[param]` or a
 * catch-all is a dead door; only the test's own ids (`ID`, `x`) may fill a dynamic segment.
 */
const answers = (href: string) => {
  const bare = href.split(/[?#]/, 1)[0]!;
  if (/^https?:/.test(bare)) return true;
  const entry = routeEntryFor(bare);
  if (!entry) return false;
  const segs = bare.split("/").filter(Boolean);
  const pat = entry.pattern.split("/").filter(Boolean);
  return segs.every((seg, i) => {
    const p = pat[Math.min(i, pat.length - 1)]!;
    // A catch-all page owns every address under it (the settings tabs); a single [param] does not.
    if (p.includes("...")) return true;
    return !p.startsWith("[") || seg === ID;
  });
};

/** Every dead crumb in the trail of every manifest page: `<page> → "<label>" (<why>)`. */
function deadCrumbs(isPageless?: (href: string) => boolean): string[] {
  const dead: string[] = [];
  for (const pattern of PATTERNS) {
    const pathname = concrete(pattern);
    if (!routeEntryFor(pathname)) continue; // a catch-all page we cannot name concretely
    const trail = deriveTrail({ pathname, nav: NAV, ...(isPageless ? { isPageless } : {}) });
    trail.slice(0, -1).forEach((c) => {
      if (!c.href) dead.push(`${pathname} → "${c.label}" (no address)`);
      else if (!answers(c.href)) dead.push(`${pathname} → "${c.label}" (${c.href} is no page)`);
    });
  }
  return dead;
}

describe("every crumb is a real door", () => {
  it("RED witness: without the pageless table, the derivation links levels that are no page", () => {
    const before = deadCrumbs(() => false);
    // eslint-disable-next-line no-console -- the census printed once, for the report
    console.log(`dead crumbs without the table: ${before.length}\n${before.filter((d) => d.includes("smart-add")).join("\n")}`);
    // Arman's page: the level between Smart Add and the brand linked to a folder with no page.
    expect(before.some((d) => d.startsWith(`/marketing/brands/smart-add/validate/${ID} → `) && d.includes("(/marketing/brands/smart-add/validate is no page)"))).toBe(true);
    expect(before.length).toBeGreaterThan(50);
  });

  it("GREEN: every crumb above the page, on every page in the manifest, opens a real page", () => {
    expect(deadCrumbs()).toEqual([]);
  });

  it("the generated pageless table is the manifest's (pnpm route-manifest:generate)", () => {
    const table = pagelessLevelsOf(PATTERNS);
    expect(PAGELESS_LEVELS).toEqual(table);
    const file = fs.readFileSync(path.join(__dirname, "../pageless-levels.generated.ts"), "utf8");
    expect(file).toBe(renderPagelessLevelsModule(table));
  });

  it("a static sibling with a page is never taken for a pageless [param] level", () => {
    const table = pagelessLevelsOf(["/lib", "/lib/curate", "/lib/[id]/edit"]);
    expect(table.levels).toEqual(["/lib/[id]"]);
    expect(isPagelessLevel("/lib/curate", table)).toBe(false);
    expect(isPagelessLevel(`/lib/${ID}`, table)).toBe(true);
  });
});

describe("a header kept in a layout links back to its own level", () => {
  it("its own address is the pathname minus the segments below the layout", () => {
    const here = `/marketing/brands/smart-add/validate/${ID}`;
    expect(ownAddressOf(here, ["validate", ID])).toBe("/marketing/brands/smart-add");
    expect(ownAddressOf(here, ["(group)", "validate", ID, "__PAGE__?{}"])).toBe("/marketing/brands/smart-add");
    expect(ownAddressOf("/marketing/brands/smart-add", [])).toBe("/marketing/brands/smart-add");
    expect(ownAddressOf("/x", null)).toBe("/x");
  });

  it("Smart Add brand is a link, the levels above and below come from the address", () => {
    const here = `/marketing/brands/smart-add/validate/${ID}`;
    const derived = deriveTrail({ pathname: here, nav: NAV });
    const trail = resolvePageTrail([{ label: "Smart Add brand", href: "/marketing/brands/smart-add" }], derived, here);
    const smartAdd = trail.find((c) => c.label === "Smart Add brand");
    expect(smartAdd?.href).toBe("/marketing/brands/smart-add");
    expect(trail[trail.length - 1]!.at).toBe(here);
    trail.slice(0, -1).forEach((c) => expect(c.href && answers(c.href)).toBeTruthy());
    expect(trail.map((c) => c.label)).toContain("Brands");
  });

  it("on its own page the template's level is the current page (no link) — unchanged", () => {
    const here = "/marketing/brands/smart-add";
    const trail = resolvePageTrail([{ label: "Smart Add brand", href: here }], deriveTrail({ pathname: here, nav: NAV }), here);
    expect(trail[trail.length - 1]).toMatchObject({ label: "Smart Add brand", href: undefined });
  });

  it("an ancestor declared without an address borrows the derived one, else is not drawn", () => {
    const derived = [
      { label: "Marketing", href: "/marketing", at: "/marketing" },
      { label: "Brands", href: "/marketing/brands", at: "/marketing/brands" },
      { label: "Acme", at: `/marketing/brands/${ID}` },
    ];
    const trail = resolvePageTrail([{ label: "Brands" }, { label: "Nowhere" }, { label: "Acme" }], derived, `/marketing/brands/${ID}`);
    expect(trail.map((c) => [c.label, c.href])).toEqual([
      ["Brands", "/marketing/brands"],
      ["Acme", undefined],
    ]);
  });
});
