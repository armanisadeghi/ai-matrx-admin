/**
 * NEW DESTINATIONS REACH CUSTOMIZED PEOPLE (audit 2026-10-22 #3).
 *   - The three ids added after the catalog froze are offered in What's new to a layout reviewed against
 *     version 1 (before: SHELL_CATALOG_VERSION stayed 1 and CATALOG_ADDED_IN was empty — never fired).
 *   - "Reset to standard" stores a body with NO regions, so the default keeps growing for her (before: the
 *     default trees were written out explicitly and froze her out of every later addition).
 *   - What's new never offers what the person already sees in a default region.
 */
import { SHELL_LAYOUT_SCHEMA_VERSION, type ShellLayoutBody, type ShellNode } from "../contract";
import { buildShellCatalog, defaultSidebarTree, SHELL_CATALOG_VERSION } from "../catalog";
import { resolveShellLayout } from "../resolve";
import { resetToStandardPlan, standardPersonBody } from "../editor/regions";
import { primaryNavItems } from "../../constants/nav-data";
import { RETIRED_NAV_IDS } from "../retired-nav-ids";

// Ids added since version 1 that are still in the menu ("web.search-tools" was added, then retired into "web.search").
const ADDED = ["account.authenticator", "data.library", "web.search-tools"].filter((id) => !(id in RETIRED_NAV_IDS));
const asPerson = (person: ShellLayoutBody, organization: ShellLayoutBody | null = null) =>
  resolveShellLayout({ person, organization, standardView: false, isAdmin: false, isGuest: false });

it("a layout reviewed against version 1, with its own sidebar, is offered the ids added since", () => {
  const strip = (nodes: ShellNode[]): ShellNode[] =>
    nodes
      .filter((n) => n.kind !== "nav" || !ADDED.includes(n.ref))
      .map((n) => ((n.kind === "nav" || n.kind === "group") && n.children ? { ...n, children: strip(n.children) } : n));
  const sidebar = strip(defaultSidebarTree());
  expect(JSON.stringify(sidebar)).not.toMatch(/authenticator|data\.library/);
  const offered = asPerson({ schemaVersion: SHELL_LAYOUT_SCHEMA_VERSION, basedOnCatalogVersion: 1, sidebar, dock: [], header: [] }).whatsNew.map((e) => e.id);
  expect(offered.filter((id) => ADDED.includes(id)).sort()).toEqual([...ADDED].sort());
});

it("Reset to standard stores no region, at the current catalog version", () => {
  const reset = standardPersonBody();
  expect(reset).toEqual({ schemaVersion: SHELL_LAYOUT_SCHEMA_VERSION, basedOnCatalogVersion: SHELL_CATALOG_VERSION });
  const org: ShellLayoutBody = { schemaVersion: SHELL_LAYOUT_SCHEMA_VERSION, basedOnCatalogVersion: 1, sidebar: [] };
  const seen = asPerson(reset, org);
  expect(seen.source).toBe("person");
  expect(seen.sidebar).toBe(primaryNavItems); // the live default, which grows with the catalog
  expect(seen.whatsNew).toEqual([]);
});

it("What's new never offers what a default region already shows", () => {
  const seen = asPerson({ schemaVersion: SHELL_LAYOUT_SCHEMA_VERSION, basedOnCatalogVersion: 1 });
  const shownByDefault = new Set(JSON.stringify(defaultSidebarTree()).match(/"ref":"[^"]+"/g)?.map((m) => m.slice(7, -1)));
  expect(seen.whatsNew.filter((e) => shownByDefault.has(e.id))).toEqual([]);
});

it("a new menu is offered as ONE row: entries under an offered entry ride in with it", () => {
  // A sidebar without the Memory menu (version 3 added it under Knowledge: 8 rows and 16 under them).
  const strip = (nodes: ShellNode[]): ShellNode[] =>
    nodes
      .filter((n) => n.kind !== "nav" || !n.ref.startsWith("memory."))
      .map((n) => ((n.kind === "nav" || n.kind === "group") && n.children ? { ...n, children: strip(n.children) } : n));
  const offered = asPerson({ schemaVersion: SHELL_LAYOUT_SCHEMA_VERSION, basedOnCatalogVersion: 2, sidebar: strip(defaultSidebarTree()) }).whatsNew.map((e) => e.id);
  const memory = offered.filter((id) => id.startsWith("memory."));
  // Its eight second-level rows are offered; the sixteen under them come with them (24 rows before).
  expect(memory.length).toBeGreaterThan(0);
  const parent = new Map(buildShellCatalog({ isAdmin: false }).map((e) => [e.id, e.parentId]));
  expect(memory.filter((id) => offered.includes(parent.get(id) ?? ""))).toEqual([]);
  expect(memory.length).toBeLessThan(24);
});

it("Reset to standard never archives a stored layout: it saves the empty body as a new version (History keeps the rest)", () => {
  // Audit round 2 #5: a person without an organization layout was archived, and History went dark.
  expect(resetToStandardPlan({ target: "person", stored: true, organizationHasLayout: false })).toBe("save-empty");
  expect(resetToStandardPlan({ target: "person", stored: true, organizationHasLayout: true })).toBe("save-empty");
  expect(resetToStandardPlan({ target: "organization", stored: true, organizationHasLayout: true })).toBe("save-empty");
  // Nothing stored: only a person under an organization layout needs a body of her own to see the standard.
  expect(resetToStandardPlan({ target: "person", stored: false, organizationHasLayout: true })).toBe("save-empty");
  expect(resetToStandardPlan({ target: "person", stored: false, organizationHasLayout: false })).toBe("nothing");
  expect(resetToStandardPlan({ target: "organization", stored: false, organizationHasLayout: false })).toBe("nothing");
  const src = require("node:fs").readFileSync(require("node:path").join(__dirname, "../editor/ShellLayoutEditor.tsx"), "utf8") as string;
  const reset = src.slice(src.indexOf("const resetToStandard"), src.indexOf("const showChoose"));
  expect(reset).not.toMatch(/store\.clear\(/);
});
