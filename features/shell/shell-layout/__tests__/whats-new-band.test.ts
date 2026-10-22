/**
 * WHAT'S NEW HAS ONE SOURCE AND TWO PLACES (lane AA, PLAN §5.5): the Sidebar slot and the top band of every
 * launchpad render `WhatsNewOffers` (one list, one set of actions), and "Your organization updated its menu"
 * is remembered in the person's own layout body (`reviewedOrgLayouts`), never in this browser's storage.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SHELL_CATALOG_VERSION } from "../catalog";
import { SHELL_LAYOUT_SCHEMA_VERSION, type ShellLayoutBody } from "../contract";
import { addOrgRow, orgMenuAdditions } from "../offers";
import { parseShellLayoutBody, serializeShellLayoutBody } from "../validate";

const root = join(__dirname, "../../../..");
const src = (path: string) => readFileSync(join(root, path), "utf8");

it("every launchpad screen draws the What's new band from the shared offers", () => {
  for (const file of ["features/launchpad/components/UserLaunchpad.tsx", "features/launchpad/components/LaunchpadPage.tsx"]) {
    expect(src(file)).toContain('<WhatsNewOffers placement="band" />');
  }
  expect(src("features/shell/components/sidebar/SidebarLayoutSlots.tsx")).toContain('<WhatsNewOffers placement="sidebar" />');
});

it("the organization-updated offer is never kept in browser storage", () => {
  for (const file of ["features/shell/shell-layout/editor/WhatsNewOffers.tsx", "features/shell/components/sidebar/SidebarLayoutSlots.tsx"]) {
    expect(src(file)).not.toMatch(/localStorage|org-layout-seen/);
  }
});

const base = (extra: Partial<ShellLayoutBody> = {}): ShellLayoutBody => ({ schemaVersion: SHELL_LAYOUT_SCHEMA_VERSION, basedOnCatalogVersion: SHELL_CATALOG_VERSION, ...extra });

it("reviewedOrgLayouts round-trips, and a bad entry is dropped with a problem", () => {
  const body = base({ reviewedOrgLayouts: { "o-1": 4 } });
  expect(parseShellLayoutBody(serializeShellLayoutBody(body)).body?.reviewedOrgLayouts).toEqual({ "o-1": 4 });
  const bad = parseShellLayoutBody(JSON.stringify({ ...body, reviewedOrgLayouts: { "o-1": "x", "o-2": 2 } }));
  expect(bad.body?.reviewedOrgLayouts).toEqual({ "o-2": 2 });
  expect(bad.problems.join(" ")).toContain("reviewedOrgLayouts.o-1");
});

it("the organization's additions are what hers lacks; a row she has is looked inside; Add is idempotent", () => {
  const own = base({ sidebar: [{ kind: "group", id: "g", label: "Team", icon: "Folder", children: [{ kind: "nav", id: "a", ref: "workspace" }] }] });
  const org = base({
    sidebar: [
      { kind: "group", id: "g1", label: "team", icon: "Folder", children: [
        { kind: "nav", id: "w", ref: "workspace" },
        { kind: "link", id: "l", label: "Handbook", icon: "Link2", href: "/p/h" },
      ] },
      { kind: "nav", id: "w2", ref: "workspace" },
    ],
  });
  const additions = orgMenuAdditions(own, org, { isAdmin: false });
  expect(additions.map((a) => a.label)).toEqual(["Handbook"]);
  const once = addOrgRow(own, additions[0]!.node);
  expect(addOrgRow(once, additions[0]!.node)).toBe(once);
  expect(orgMenuAdditions(once, org, { isAdmin: false })).toEqual([]);
});
