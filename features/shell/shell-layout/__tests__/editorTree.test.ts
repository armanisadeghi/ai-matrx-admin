/**
 * The layout editor's pure verbs (custom-experience lane C): tick brings defaults, untick, promote,
 * reorder, depth and Dock limits, and the edited body round-trips through serialize → validate with
 * no problems (the editor refuses to save a body with problems).
 */
import { buildShellCatalog, defaultDockTree, defaultHeaderButtons, defaultSidebarTree } from "../catalog";
import { SHELL_LAYOUT_SCHEMA_VERSION, type ShellNode } from "../contract";
import { parseShellLayoutBody, serializeShellLayoutBody, SHELL_DOCK_MAX_ITEMS } from "../validate";
import {
  addEntryInto,
  addHeaderButton,
  addRow,
  buildCatalogTree,
  containersFor,
  emptyBody,
  filterCatalogTree,
  heightOf,
  locate,
  moveNode,
  nudgeNode,
  placedRefs,
  removeNode,
  tickEntry,
  tickState,
  untickEntry,
  updateNode,
} from "../editor/tree";

const tree = buildCatalogTree(buildShellCatalog({ isAdmin: true }));
// A top item that has children, one of which has children of its own (three levels).
const deep = tree.main.find((n) => n.children.some((c) => c.children.length > 0))!;
const mid = deep.children.find((c) => c.children.length > 0)!;
const leaf = mid.children[0]!;

function roundTrips(sidebar: ShellNode[]) {
  const body = { ...emptyBody(), sidebar };
  const parsed = parseShellLayoutBody(serializeShellLayoutBody(body));
  expect(parsed.problems).toEqual([]);
  expect(parsed.body?.sidebar).toEqual(sidebar);
}

describe("the catalog tree", () => {
  it("splits the default menu from what is hidden by default", () => {
    expect(tree.main.length).toBeGreaterThan(5);
    expect(tree.main.every((n) => n.entry.defaultVisible)).toBe(true);
    expect(tree.tools.length).toBeGreaterThan(0);
    expect(tree.tools.every((n) => !n.entry.defaultVisible)).toBe(true);
  });
  it("search keeps a parent when a descendant matches", () => {
    const hits = filterCatalogTree(tree.main, leaf.entry.label);
    expect(hits.some((n) => n.entry.id === deep.entry.id)).toBe(true);
  });
});

describe("tick and untick", () => {
  it("ticking a top item brings all its default children with it", () => {
    const next = tickEntry([], tree, deep.entry.id, "sidebar");
    expect(next).toHaveLength(1);
    const placed = placedRefs(next);
    expect(placed.has(mid.entry.id)).toBe(true);
    expect(placed.has(leaf.entry.id)).toBe(true);
    roundTrips(next);
  });

  it("each default can be unticked, and the parent then reads partial only when it is gone itself", () => {
    const withDeep = tickEntry([], tree, deep.entry.id, "sidebar");
    const without = untickEntry(withDeep, leaf.entry.id);
    expect(placedRefs(without).has(leaf.entry.id)).toBe(false);
    expect(tickState(tree, placedRefs(without), deep.entry.id)).toBe("on");
    const onlyChild = tickEntry([], tree, mid.entry.id, "sidebar");
    expect(tickState(tree, placedRefs(onlyChild), deep.entry.id)).toBe("partial");
    roundTrips(without);
  });

  it("re-ticking a child goes back under its placed parent, in catalog order", () => {
    const withDeep = tickEntry([], tree, deep.entry.id, "sidebar");
    const without = untickEntry(withDeep, mid.entry.id);
    const back = tickEntry(without, tree, mid.entry.id, "sidebar");
    const at = locate(back, mid.entry.id)!;
    expect(at.parentId).toBe(deep.entry.id);
    expect(back).toEqual(withDeep);
  });

  it("the whole default tree round-trips clean", () => {
    roundTrips(defaultSidebarTree());
  });
});

describe("promote, nest and reorder", () => {
  const start = tickEntry([], tree, deep.entry.id, "sidebar");

  it("promotes a third-level row to the top level", () => {
    const next = moveNode(start, leaf.entry.id, { kind: "top" }, "sidebar")!;
    expect(locate(next, leaf.entry.id)).toMatchObject({ parentId: null, depth: 1 });
    roundTrips(next);
  });

  it("moves a row before another at any level and into a group", () => {
    const withGroup = addRow(start, { kind: "group", label: "Mine" }, "sidebar");
    const groupId = withGroup[withGroup.length - 1]!.id;
    const into = moveNode(withGroup, leaf.entry.id, { kind: "inside", id: groupId }, "sidebar")!;
    expect(locate(into, leaf.entry.id)?.parentId).toBe(groupId);
    const before = moveNode(into, groupId, { kind: "before", id: deep.entry.id }, "sidebar")!;
    expect(before[0]!.id).toBe(groupId);
    roundTrips(before);
  });

  it("refuses a move that would go deeper than three levels or into itself", () => {
    expect(heightOf(start[0]!)).toBe(3);
    const withGroup = addRow(start, { kind: "group", label: "Mine" }, "sidebar");
    const groupId = withGroup[withGroup.length - 1]!.id;
    expect(moveNode(withGroup, deep.entry.id, { kind: "inside", id: groupId }, "sidebar")).toBeNull();
    expect(moveNode(start, deep.entry.id, { kind: "inside", id: mid.entry.id }, "sidebar")).toBeNull();
    expect(containersFor(withGroup, deep.entry.id, "sidebar").some((c) => c.id === groupId)).toBe(false);
    expect(containersFor(withGroup, leaf.entry.id, "sidebar").some((c) => c.id === groupId)).toBe(true);
  });

  it("nudges a row among its siblings", () => {
    const two = tickEntry(start, tree, tree.main.find((n) => n.entry.id !== deep.entry.id)!.entry.id, "sidebar");
    const firstId = two[0]!.id;
    const moved = nudgeNode(two, firstId, 1, "sidebar");
    expect(moved[1]!.id).toBe(firstId);
  });
});

describe("own rows", () => {
  it("adds links, records and launchpads; renames and re-icons; removes", () => {
    let rows = addRow([], { kind: "link", label: "Docs", href: "https://example.com" }, "sidebar");
    rows = addRow(rows, { kind: "record", label: "Acme agent", token: "agent", recordId: "a1", href: "/agents/a1" }, "sidebar");
    rows = addRow(rows, { kind: "launchpad", key: "sales", label: "Sales" }, "sidebar");
    rows = addEntryInto(rows, tree, leaf.entry.id, "sidebar", null);
    const link = rows[0]!;
    rows = updateNode(rows, link.id, { label: "Handbook", icon: "BookOpen" });
    expect(rows[0]).toMatchObject({ label: "Handbook", icon: "BookOpen" });
    const navId = rows[3]!.id;
    rows = updateNode(rows, navId, { label: "Renamed" });
    expect(rows[3]).toMatchObject({ label: "Renamed" });
    rows = updateNode(rows, navId, { label: "" });
    expect(rows[3]).not.toHaveProperty("label");
    roundTrips(rows);
    expect(removeNode(rows, link.id)).toHaveLength(3);
  });
});

describe("the Dock", () => {
  it("is flat and holds at most the Dock limit", () => {
    let dock = defaultDockTree();
    for (const node of tree.main) dock = tickEntry(dock, tree, node.entry.id, "dock");
    expect(dock.length).toBe(SHELL_DOCK_MAX_ITEMS);
    expect(dock.every((n) => n.kind !== "group" && !("children" in n && n.children))).toBe(true);
    expect(moveNode(dock, dock[1]!.id, { kind: "inside", id: dock[0]!.id }, "dock")).toBeNull();
    const parsed = parseShellLayoutBody(serializeShellLayoutBody({ ...emptyBody(), dock }));
    expect(parsed.problems).toEqual([]);
  });
});

describe("the Header", () => {
  it("adds a destination, a link and an AI job; the body validates", () => {
    let header = defaultHeaderButtons();
    header = addHeaderButton(header, { kind: "nav", ref: leaf.entry.id });
    header = addHeaderButton(header, { kind: "nav", ref: leaf.entry.id });
    header = addHeaderButton(header, { kind: "link", label: "Docs", href: "/docs" });
    header = addHeaderButton(header, { kind: "mandate", label: "Draft", mandateKey: "some.job" });
    expect(header.filter((b) => b.kind === "nav")).toHaveLength(1);
    const parsed = parseShellLayoutBody(serializeShellLayoutBody({ schemaVersion: SHELL_LAYOUT_SCHEMA_VERSION, basedOnCatalogVersion: 1, header }));
    expect(parsed.problems).toEqual([]);
    expect(parsed.body?.header).toEqual(header);
  });
});
