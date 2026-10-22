/**
 * NEW DESTINATIONS REACH CUSTOMIZED PEOPLE (audit 2026-10-22 #3).
 *   - The three ids added after the catalog froze are offered in What's new to a layout reviewed against
 *     version 1 (before: SHELL_CATALOG_VERSION stayed 1 and CATALOG_ADDED_IN was empty — never fired).
 *   - "Reset to standard" stores a body with NO regions, so the default keeps growing for her (before: the
 *     default trees were written out explicitly and froze her out of every later addition).
 *   - What's new never offers what the person already sees in a default region.
 */
import { SHELL_LAYOUT_SCHEMA_VERSION, type ShellLayoutBody, type ShellNode } from "../contract";
import { defaultSidebarTree, SHELL_CATALOG_VERSION } from "../catalog";
import { resolveShellLayout } from "../resolve";
import { standardPersonBody } from "../editor/regions";
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
