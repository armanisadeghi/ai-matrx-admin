// Audit #11 (custom-experience, 2026-10-22): at 1440px with the sidebar open, "Browse AI Matrx" drew six area
// tiles a row by WINDOW breakpoint (xl:grid-cols-6); each tile also carries two buttons, so its name was cut
// to one letter ("A…"). The area grids now fill by the width the page has, with a floor per tile.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = readFileSync(join(__dirname, "../components/UserLaunchpad.tsx"), "utf8");

/** The minimum column width (rem) an auto-fill grid class names. */
function minRem(cls: string): number {
  const m = /repeat\(auto-fill,minmax\(min\(100%,([\d.]+)rem\),1fr\)\)/.exec(cls);
  return m ? Number(m[1]) : 0;
}

describe("the launcher's area grids", () => {
  it("fill by the page's own width, with room for the name beside two buttons", () => {
    const app = /APP_TILE_GRID = "([^"]+)"/.exec(src)?.[1] ?? "";
    const folder = /FOLDER_CARD_GRID = "([^"]+)"/.exec(src)?.[1] ?? "";
    // Icon 32 + two 28px buttons + gaps and padding ≈ 120px: 15rem leaves the name about 120px.
    expect(minRem(app)).toBeGreaterThanOrEqual(15);
    expect(minRem(folder)).toBeGreaterThanOrEqual(20);
    expect(minRem(/RESULT_CARD_GRID = "([^"]+)"/.exec(src)?.[1] ?? "")).toBeGreaterThanOrEqual(17);
  });

  it("never sets an area grid's column count by window breakpoint", () => {
    const browseAndSearch = src.slice(src.indexOf("function BrowseSection"), src.indexOf("function LaunchpadFolderCard"));
    expect(browseAndSearch).not.toMatch(/\b(sm|md|lg|xl|2xl):grid-cols-\d/);
    expect(browseAndSearch).toContain("APP_TILE_GRID");
    expect(browseAndSearch).toContain("FOLDER_CARD_GRID");
  });
});
