/**
 * The sidebar's "Search menu" palette: every destination in the real nav tree
 * is findable, results rank by how well the LABEL matches (not just any hit),
 * and the breadcrumb trail is searchable too.
 */
import { navItemsForViewer, primaryNavItems, settingsItem, expandNavChildren } from "../constants/nav-data";
import {
  buildMenuSearchIndex,
  highlightMenuMatch,
  rankMenuSearch,
  type MenuSearchEntry,
} from "./menu-search";

const index = buildMenuSearchIndex([...primaryNavItems, settingsItem]);

function entry(label: string, trail: string[] = [], extra: Partial<MenuSearchEntry> = {}): MenuSearchEntry {
  return { id: `${label}-${trail.join("/")}`, label, trail, href: `/${label.toLowerCase()}`, iconName: "Star", iconSource: "shell", ...extra };
}

describe("menu search index", () => {
  it("indexes every top-level item and every child at every level", () => {
    const labels = new Set(index.map((e) => e.label));
    for (const item of primaryNavItems) {
      expect(labels.has(item.label)).toBe(true);
      for (const child of expandNavChildren(item.children)) {
        expect(labels.has(child.label)).toBe(true);
      }
    }
  });

  it("carries the breadcrumb trail for nested rows", () => {
    const nested = index.find((e) => e.trail.length >= 2);
    expect(nested).toBeDefined();
  });

  it("finds every indexed label by its own name", () => {
    for (const e of index) {
      const hits = rankMenuSearch(index, e.label, 500);
      expect(hits.some((hit) => hit.label === e.label)).toBe(true);
    }
  });

  it("guest index drops guest-hidden rows", () => {
    const guest = buildMenuSearchIndex(navItemsForViewer(primaryNavItems, false));
    expect(guest.length).toBeLessThanOrEqual(index.length);
  });
});

describe("menu search ranking", () => {
  const entries = [
    entry("Note templates", ["Workspace"]),
    entry("Notes", ["Workspace"]),
    entry("Tables", ["Data"]),
    entry("Keynotes", ["Media"]),
    entry("New table", ["Data"], { isCreate: true, action: "create-project" }),
  ];

  it("puts the exact label first", () => {
    expect(rankMenuSearch(entries, "notes")[0].label).toBe("Notes");
  });

  it("ranks label-prefix over mid-word hits", () => {
    const labels = rankMenuSearch(entries, "note").map((e) => e.label);
    expect(labels.indexOf("Notes")).toBeLessThan(labels.indexOf("Keynotes"));
  });

  it("requires every word, and matches words against the trail", () => {
    expect(rankMenuSearch(entries, "data tables").map((e) => e.label)).toEqual(["Tables"]);
    expect(rankMenuSearch(entries, "data zebra")).toEqual([]);
  });

  it("places beat create actions on a tie", () => {
    expect(rankMenuSearch(entries, "table")[0].label).toBe("Tables");
  });

  it("falls back to in-order letters when nothing matches strictly", () => {
    expect(rankMenuSearch(entries, "tbls")[0]?.label).toBe("Tables");
  });

  it("empty query returns nothing", () => {
    expect(rankMenuSearch(entries, "   ")).toEqual([]);
  });
});

describe("highlightMenuMatch", () => {
  it("marks every matched run", () => {
    expect(highlightMenuMatch("Note templates", "temp note")).toEqual([
      { text: "Note", match: true },
      { text: " ", match: false },
      { text: "temp", match: true },
      { text: "lates", match: false },
    ]);
  });
});
