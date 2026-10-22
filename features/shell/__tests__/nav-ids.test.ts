/**
 * THE PERMANENT-NAV-ID GUARD (project custom-experience, PLAN.md §5.1).
 *
 * Stored custom layouts point at menu nodes by `id`. So every node carries a literal id, no two
 * nodes share one, and an id never silently disappears: `nav-ids.known.json` is every id the menu
 * has ever had, and each one must still be in the menu or have a row in
 * `shell-layout/retired-nav-ids.ts` naming its successor (or null).
 *
 * Added a node? Run `NAV_IDS_WRITE=1 pnpm jest features/shell/__tests__/nav-ids.test.ts` to append
 * its id to the known list. The writer only ever ADDS — a removed id stays listed and keeps failing
 * until it is retired.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  adminNavItems,
  AI_WORK_NAV_GROUP,
  dockItems,
  primaryNavItems,
  settingsItem,
  WORKSPACES_NAV_GROUP,
  type ShellNavChild,
  type ShellNavItem,
} from "../constants/nav-data";
import { RETIRED_NAV_IDS } from "../shell-layout/retired-nav-ids";
import { CATALOG_ADDED_IN, SHELL_CATALOG_VERSION } from "../shell-layout/catalog";
import { TOOLS_GRID_TILES } from "@/features/window-panels/tools-grid/toolsGridTiles";

const KNOWN_PATH = join(__dirname, "nav-ids.known.json");
/** Every menu and Tools-grid tile id when the catalog froze at version 1 (2026-10-19, 7c41321c3). Never edited. */
const CATALOG_V1_PATH = join(__dirname, "nav-ids.catalog-v1.json");
const ID_SHAPE = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;

type Node = ShellNavItem | ShellNavChild;

/** Every node of a tree, all levels, with where it sits. */
function walk(nodes: readonly Node[], path: string, out: { node: Node; at: string }[] = []) {
  nodes.forEach((node, index) => {
    const at = `${path}[${index}] ${JSON.stringify(node.label)}`;
    out.push({ node, at });
    walk(node.children ?? [], `${at} >`, out);
  });
  return out;
}

/** The menu tree: what a stored layout can reference. */
const menu = [
  ...walk(primaryNavItems, "primary"),
  ...walk([settingsItem], "settings"),
  ...walk(adminNavItems, "admin"),
];
const menuIds = new Set(menu.map(({ node }) => node.id));

function readKnown(): string[] {
  return JSON.parse(readFileSync(KNOWN_PATH, "utf8")) as string[];
}

describe("every nav node has a permanent id", () => {
  if (process.env.NAV_IDS_WRITE === "1") {
    it("appends new ids to the known list (never removes one)", () => {
      const known = new Set(readKnown());
      for (const id of menuIds) known.add(id);
      writeFileSync(KNOWN_PATH, `${JSON.stringify([...known].sort(), null, 2)}\n`);
    });
  }

  it("every node, at every level and in every list, carries a dotted lowercase id", () => {
    const everywhere = [
      ...menu,
      ...walk(AI_WORK_NAV_GROUP.children, "AI_WORK_NAV_GROUP"),
      ...walk(WORKSPACES_NAV_GROUP.children, "WORKSPACES_NAV_GROUP"),
      ...walk(dockItems, "dock"),
    ];
    const bad = everywhere
      .filter(({ node }) => typeof node.id !== "string" || !ID_SHAPE.test(node.id))
      .map(({ node, at }) => `${at}: ${JSON.stringify(node.id)}`);
    expect(bad).toEqual([]);
  });

  it("no two menu nodes share an id, and no id collides with a Tools-grid tile", () => {
    const seen = new Map<string, string>();
    const duplicates: string[] = [];
    for (const { node, at } of menu) {
      const first = seen.get(node.id);
      if (first) duplicates.push(`"${node.id}" at ${at} and ${first}`);
      else seen.set(node.id, at);
    }
    for (const tile of TOOLS_GRID_TILES) {
      if (seen.has(tile.id)) duplicates.push(`"${tile.id}" is a tile id and a menu id`);
    }
    expect(duplicates).toEqual([]);
  });

  it("no known id disappears without a retired-nav-ids row", () => {
    const vanished = readKnown().filter((id) => !menuIds.has(id) && !Object.hasOwn(RETIRED_NAV_IDS, id));
    expect(vanished).toEqual([]);
  });

  it("every menu id is in the known list (run with NAV_IDS_WRITE=1 after adding a node)", () => {
    const known = new Set(readKnown());
    expect(
      [...menuIds]
        .filter((id) => !known.has(id))
        .map((id) => `${id}  // run NAV_IDS_WRITE=1 pnpm jest features/shell/__tests__/nav-ids.test.ts to record it`),
    ).toEqual([]);
  });

  it("a retired id is out of the menu and its successor is in it", () => {
    const wrong = Object.entries(RETIRED_NAV_IDS).flatMap(([id, successor]) => [
      ...(menuIds.has(id) ? [`${id} is retired but still in the menu`] : []),
      ...(successor !== null && !menuIds.has(successor) && !Object.hasOwn(RETIRED_NAV_IDS, successor)
        ? [`${id} → ${successor}, which is not in the menu`]
        : []),
    ]);
    expect(wrong).toEqual([]);
  });

  it("the Dock and the AI Work group reuse ids of the menu nodes they mirror", () => {
    const strays = [
      ...dockItems.filter((item) => !menuIds.has(item.id)).map((item) => `dock ${item.id}`),
      ...AI_WORK_NAV_GROUP.children
        .filter((child) => child.href.startsWith("/work") && !menuIds.has(child.id))
        .map((child) => `ai-work ${child.id}`),
    ];
    expect(strays).toEqual([]);
  });
});

describe("a destination added after the catalog froze is offered in What's new", () => {
  // Without a CATALOG_ADDED_IN row a new id never reaches anyone whose menu is customized: an explicit
  // sidebar does not grow, and What's new compares `addedIn` to the body's `basedOnCatalogVersion`.
  // Three ids shipped that way on 2026-10-19 (audit 2026-10-22 #3).
  const v1 = new Set(JSON.parse(readFileSync(CATALOG_V1_PATH, "utf8")) as string[]);
  const tileIds = TOOLS_GRID_TILES.map((t) => t.id);

  it("every menu or tile id newer than version 1 has a CATALOG_ADDED_IN row", () => {
    const missing = [...menuIds, ...tileIds].filter((id) => !v1.has(id) && !Object.hasOwn(CATALOG_ADDED_IN, id));
    // The fix, spelled out for whoever added the node: paste these rows into CATALOG_ADDED_IN in
    // features/shell/shell-layout/catalog.ts and set SHELL_CATALOG_VERSION to the same number (if this
    // change has not bumped it yet, use SHELL_CATALOG_VERSION + 1).
    const next = SHELL_CATALOG_VERSION + 1;
    expect(
      missing.map((id) => `"${id}": ${next},  // add to CATALOG_ADDED_IN (shell-layout/catalog.ts) and set SHELL_CATALOG_VERSION = ${next}`),
    ).toEqual([]);
  });

  it("every CATALOG_ADDED_IN row names a live id at a version above 1 and no higher than SHELL_CATALOG_VERSION", () => {
    const wrong = Object.entries(CATALOG_ADDED_IN).flatMap(([id, version]) => [
      ...(!menuIds.has(id) && !tileIds.includes(id) && !Object.hasOwn(RETIRED_NAV_IDS, id) ? [`${id} is not in the catalog`] : []),
      ...(v1.has(id) ? [`${id} was already in version 1`] : []),
      ...(!Number.isInteger(version) || version < 2 || version > SHELL_CATALOG_VERSION ? [`${id} → ${version}`] : []),
    ]);
    expect(wrong).toEqual([]);
  });

  it("SHELL_CATALOG_VERSION was bumped to the newest CATALOG_ADDED_IN version", () => {
    expect(SHELL_CATALOG_VERSION).toBe(Math.max(1, ...Object.values(CATALOG_ADDED_IN)));
  });

  it("the version-1 list is frozen (only ever read): 363 menu ids + 87 tiles", () => {
    expect(v1.size).toBe(450);
  });
});
