/**
 * Catalog, validator and resolver for custom layouts (project custom-experience).
 * The load-bearing promise: with no layout, and with a layout equal to today's default, the menu
 * renders exactly as it does today.
 */
import {
  adminNavItems,
  dockItems,
  expandNavChildren,
  primaryNavItems,
  type ShellNavItem,
} from "../../constants/nav-data";
import { TOOLS_GRID_TILES } from "@/features/window-panels/tools-grid/toolsGridTiles";
import {
  SHELL_LAYOUT_SCHEMA_VERSION,
  type ShellLayoutBody,
  type ShellNode,
} from "../contract";
import {
  buildShellCatalog,
  defaultHeaderButtons,
  defaultSidebarTree,
  getCatalogEntry,
  SHELL_CATALOG_VERSION,
} from "../catalog";
import { parseShellLayoutBody, serializeShellLayoutBody, SHELL_DOCK_MAX_ITEMS } from "../validate";
import { launchpadHref, resolveShellLayout, shellLandingHref, type ResolvedNavChild } from "../resolve";

const body = (extra: Partial<ShellLayoutBody> = {}): ShellLayoutBody => ({
  schemaVersion: SHELL_LAYOUT_SCHEMA_VERSION,
  basedOnCatalogVersion: SHELL_CATALOG_VERSION,
  ...extra,
});

const asPerson = (b: ShellLayoutBody, opts: { isAdmin?: boolean } = {}) =>
  resolveShellLayout({ person: b, organization: null, standardView: false, isAdmin: opts.isAdmin ?? false, isGuest: false });

function countNodes(items: readonly { children?: readonly unknown[] }[]): number {
  return items.reduce(
    (sum, item) => sum + 1 + countNodes((item.children ?? []) as { children?: readonly unknown[] }[]),
    0,
  );
}

describe("catalog", () => {
  it("lists every primary node at every level, with parent and depth", () => {
    const catalog = buildShellCatalog({ isAdmin: false });
    const primary = catalog.filter((e) => e.source === "primary");
    expect(primary).toHaveLength(countNodes(primaryNavItems));
    const tables = getCatalogEntry("data.tables");
    expect(tables).toMatchObject({ parentId: "data", depth: 2, kind: "destination", defaultVisible: true, href: "/data" });
    const kits = getCatalogEntry("industries.education.kits");
    expect(kits).toMatchObject({ parentId: "industries.education", depth: 3 });
    expect(getCatalogEntry("data")).toMatchObject({ depth: 1, parentId: null, kind: "group" });
    expect(getCatalogEntry("workspace.new-project")?.kind).toBe("action");
    expect(primary.every((e) => e.depth <= 3)).toBe(true);
  });

  it("includes admin rows only for admins", () => {
    const adminId = adminNavItems[0]?.id ?? "";
    expect(buildShellCatalog({ isAdmin: false }).some((e) => e.id === adminId)).toBe(false);
    expect(buildShellCatalog({ isAdmin: true }).some((e) => e.id === adminId)).toBe(true);
    expect(getCatalogEntry(adminId)).toBeUndefined();
    expect(getCatalogEntry(adminId, { isAdmin: true })?.defaultVisible).toBe(false);
  });

  it("offers every Tools-grid tile as a hidden-by-default window launcher", () => {
    const catalog = buildShellCatalog({ isAdmin: true });
    for (const tile of TOOLS_GRID_TILES) {
      expect(catalog.find((e) => e.id === tile.id)).toMatchObject({
        kind: "action",
        defaultVisible: false,
        href: null,
        tileId: tile.id,
      });
    }
    const ids = catalog.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("the default tree is today's menu, node for node", () => {
    const tree = defaultSidebarTree();
    expect(tree.map((n) => (n.kind === "nav" ? n.ref : null))).toEqual(primaryNavItems.map((i) => i.id));
    expect(countNodes(tree as { children?: readonly unknown[] }[])).toBe(countNodes(primaryNavItems));
  });
});

describe("resolver", () => {
  it("no layout renders today's menu, dock and header", () => {
    const out = resolveShellLayout({ person: null, organization: null, standardView: false, isAdmin: false, isGuest: false });
    expect(out.source).toBe("default");
    expect(out.sidebar).toBe(primaryNavItems);
    expect(out.dock).toBe(dockItems);
    expect(out.header.map((b) => (b.kind === "control" ? b.control : b.kind))).toEqual([
      "search",
      "intelligence",
      "messages",
      "notifications",
      "canvas",
    ]);
    expect(out.problems).toEqual([]);
  });

  it("a stored copy of the default tree round-trips to today's nav exactly", () => {
    const stored = serializeShellLayoutBody(body({ sidebar: defaultSidebarTree(), header: defaultHeaderButtons() }));
    const parsed = parseShellLayoutBody(stored);
    expect(parsed.problems).toEqual([]);
    const out = asPerson(parsed.body as ShellLayoutBody);
    expect(out.source).toBe("person");
    expect(out.sidebar).toEqual(primaryNavItems);
    expect(out.problems).toEqual([]);
  });

  it("promotes a level-3 node to the top level", () => {
    const out = asPerson(body({ sidebar: [{ kind: "nav", id: "kits", ref: "industries.education.kits" }] }));
    const [row] = out.sidebar;
    expect(row).toMatchObject({ id: "kits", section: "primary", href: "/education/kits" });
    expect(row && "group" in row).toBe(false);
  });

  it("a nav row with no children listed has no submenu; listed children are exactly those", () => {
    const out = asPerson(
      body({
        sidebar: [
          { kind: "nav", id: "data", ref: "data" },
          {
            kind: "nav",
            id: "files",
            ref: "files",
            label: "My files",
            children: [
              { kind: "nav", id: "files.starred", ref: "files.starred" },
              { kind: "nav", id: "moved-tables", ref: "data.tables" },
            ],
          },
        ],
      }),
    );
    expect(out.sidebar[0]?.children).toBeUndefined();
    expect(out.sidebar[1]?.label).toBe("My files");
    const children = out.sidebar[1]?.children as ResolvedNavChild[];
    expect(children.map((c) => c.href)).toEqual(["/files/starred", "/data"]);
  });

  it("renders a custom link, a record, a launchpad and a person's group", () => {
    const sidebar: ShellNode[] = [
      { kind: "link", id: "l1", label: "Docs", icon: "BookOpen", href: "https://example.com/docs" },
      { kind: "link", id: "l2", label: "Mine", icon: "Star", href: "/notes", newTab: true },
      { kind: "record", id: "r1", label: "Acme deal", token: "crm.deal", recordId: "abc", href: "/crm/deals/abc" },
      { kind: "launchpad", id: "p1", key: "morning", label: "Morning" },
      {
        kind: "group",
        id: "g1",
        label: "Daily",
        icon: "Folder",
        children: [
          { kind: "nav", id: "g1.tasks", ref: "workspace.tasks" },
          { kind: "link", id: "g1.l", label: "Status", icon: "Link2", href: "/status" },
        ],
      },
    ];
    const out = asPerson(body({ sidebar }));
    expect(out.problems).toEqual([]);
    const [link, newTab, record, pad, group] = out.sidebar as ShellNavItem[];
    expect(link).toMatchObject({ href: "https://example.com/docs", external: true, section: "primary" });
    expect(newTab).toMatchObject({ href: "/notes", openInNewTab: true });
    expect(record).toMatchObject({ href: "/crm/deals/abc", iconName: "FileText" });
    expect(pad).toMatchObject({ href: launchpadHref("morning") });
    expect(group).toMatchObject({ label: "Daily", href: "/tasks", iconName: "Folder" });
    expect(group?.children?.map((c) => c.href)).toEqual(["/tasks", "/status"]);
    // A row moved under a person's group drops its old flyout subheading.
    expect(expandNavChildren(group?.children).every((c) => c.group === undefined)).toBe(true);
  });

  it("an empty group the person made still shows, with its label and an Add pages row (never vanishes)", () => {
    const sidebar: ShellNode[] = [
      { kind: "nav", id: "chat", ref: "chat" },
      { kind: "group", id: "qa", label: "QA Group", icon: "Folder", children: [] },
    ];
    const out = asPerson(body({ sidebar }));
    expect(out.problems).toEqual([]);
    const group = (out.sidebar as ShellNavItem[])[1];
    expect(group).toMatchObject({ id: "qa", label: "QA Group", iconName: "Folder", section: "primary" });
    expect(group?.children).toEqual([expect.objectContaining({ label: "Add pages…", action: "edit-sidebar" })]);
  });

  it("person wins whole over organization; organization applies when the person has none", () => {
    const org = body({ sidebar: [{ kind: "nav", id: "o", ref: "chat" }] });
    const person = body({ dock: [{ kind: "nav", id: "d", ref: "files" }] });
    const both = resolveShellLayout({ person, organization: org, standardView: false, isAdmin: false, isGuest: false });
    expect(both.source).toBe("person");
    // The person's body has no sidebar → that region is the default, never the organization's.
    expect(both.sidebar).toBe(primaryNavItems);
    expect(both.dock.map((d) => d.id)).toEqual(["d"]);
    const orgOnly = resolveShellLayout({ person: null, organization: org, standardView: false, isAdmin: false, isGuest: false });
    expect(orgOnly.source).toBe("organization");
    expect(orgOnly.sidebar.map((s) => s.id)).toEqual(["o"]);
  });

  it("an organization that locks customizing (personAllowed false) shows its own layout to every member", () => {
    const org = body({ sidebar: [{ kind: "nav", id: "o", ref: "chat" }] });
    const person = body({ sidebar: [{ kind: "nav", id: "p", ref: "files" }] });
    const locked = resolveShellLayout({ person, organization: org, standardView: false, isAdmin: false, isGuest: false, personAllowed: false });
    expect(locked.source).toBe("organization");
    expect(locked.sidebar.map((s) => s.id)).toEqual(["o"]);
    const lockedNoOrg = resolveShellLayout({ person, organization: null, standardView: false, isAdmin: false, isGuest: false, personAllowed: false });
    expect(lockedNoOrg.source).toBe("default");
    const open = resolveShellLayout({ person, organization: org, standardView: false, isAdmin: false, isGuest: false, personAllowed: true });
    expect(open.source).toBe("person");
  });

  it("standard view and guests always get the default", () => {
    const person = body({ sidebar: [{ kind: "nav", id: "o", ref: "chat" }] });
    const standard = resolveShellLayout({ person, organization: null, standardView: true, isAdmin: false, isGuest: false });
    expect(standard.source).toBe("standard-view");
    expect(standard.sidebar).toBe(primaryNavItems);
    const guest = resolveShellLayout({ person, organization: person, standardView: false, isAdmin: false, isGuest: true });
    expect(guest.source).toBe("default");
    expect(guest.sidebar).toBe(primaryNavItems);
  });

  it("drops unknown and admin-only refs from render and names them", () => {
    const adminId = adminNavItems[0]?.id ?? "";
    const b = body({
      sidebar: [
        { kind: "nav", id: "a", ref: "no.such.place" },
        { kind: "nav", id: "b", ref: adminId },
        { kind: "nav", id: "c", ref: "chat" },
      ],
    });
    const out = asPerson(b);
    expect(out.sidebar.map((s) => s.id)).toEqual(["c"]);
    expect(out.problems).toHaveLength(2);
    expect(asPerson(b, { isAdmin: true }).sidebar.map((s) => s.id)).toEqual(["b", "c"]);
  });

  it("places a Tools-grid tile as a row that names its tile", () => {
    const tile = TOOLS_GRID_TILES[0];
    if (!tile) throw new Error("no tiles");
    const out = asPerson(body({ sidebar: [{ kind: "nav", id: "t", ref: tile.id }] }), { isAdmin: true });
    expect(out.sidebar[0]).toMatchObject({ id: "t", tileId: tile.id, href: `#${tile.id}` });
  });

  it("offers newer catalog entries in What's new, never in the tree", () => {
    const out = asPerson(body({ basedOnCatalogVersion: 0 as number, sidebar: [{ kind: "nav", id: "c", ref: "chat" }] }));
    // Every entry is version 1, so a body reviewed against version 0 is offered all but what it placed and dismissed.
    expect(out.whatsNew.some((e) => e.id === "chat")).toBe(false);
    expect(out.whatsNew.some((e) => e.id === "data")).toBe(true);
    expect(out.sidebar.map((s) => s.id)).toEqual(["c"]);
    const current = asPerson(body({ sidebar: [] }));
    expect(current.whatsNew).toEqual([]);
  });

  it("resolves header buttons and the landing", () => {
    const out = asPerson(
      body({
        header: [
          { kind: "control", id: "s", control: "search" },
          { kind: "nav", id: "n", ref: "data.tables" },
          { kind: "mandate", id: "m", label: "Tidy", icon: "Zap", mandateKey: "notes.tidy" },
          { kind: "control", id: "x", control: "notifications" },
        ],
        landing: { kind: "launchpad", key: "morning" },
      }),
    );
    expect(out.header[1]).toMatchObject({ kind: "destination", href: "/data", label: "Tables" });
    expect(out.header[2]).toMatchObject({ kind: "mandate", mandateKey: "notes.tidy" });
    expect(shellLandingHref(out.landing)).toBe(launchpadHref("morning"));
  });
});

describe("validator", () => {
  it("falls back with a problem on bad JSON and a wrong schemaVersion, never throwing", () => {
    expect(parseShellLayoutBody("{nope")).toMatchObject({ body: null });
    expect(parseShellLayoutBody("{nope").problems).toHaveLength(1);
    expect(parseShellLayoutBody(JSON.stringify({ schemaVersion: 2 })).body).toBeNull();
    expect(parseShellLayoutBody("[]").body).toBeNull();
    const bad = parseShellLayoutBody("{nope");
    const out = resolveShellLayout({ person: bad.body, organization: null, standardView: false, isAdmin: false, isGuest: false });
    expect(out.sidebar).toBe(primaryNavItems);
  });

  it("refuses nodes deeper than three levels and duplicate ids, and names each", () => {
    const deep = {
      schemaVersion: 1,
      basedOnCatalogVersion: 1,
      sidebar: [
        {
          kind: "group",
          id: "g",
          label: "G",
          icon: "Folder",
          children: [
            {
              kind: "group",
              id: "g2",
              label: "G2",
              icon: "Folder",
              children: [{ kind: "nav", id: "n3", ref: "chat", children: [{ kind: "nav", id: "n4", ref: "data" }] }],
            },
          ],
        },
        { kind: "nav", id: "g", ref: "chat" },
      ],
    };
    const { body: parsed, problems } = parseShellLayoutBody(JSON.stringify(deep));
    expect(problems.some((p) => p.includes("deeper than 3"))).toBe(true);
    expect(problems.some((p) => p.includes('duplicate id "g"'))).toBe(true);
    expect(parsed?.sidebar).toHaveLength(1);
    const n3 = (parsed?.sidebar?.[0] as { children: { children: ShellNode[] }[] }).children[0]?.children[0];
    expect(n3 && "children" in n3).toBe(false);
  });

  it("keeps an unknown ref but flags it", () => {
    const { body: parsed, problems } = parseShellLayoutBody(
      JSON.stringify(body({ sidebar: [{ kind: "nav", id: "a", ref: "gone.away" }] })),
    );
    expect(parsed?.sidebar?.[0]).toMatchObject({ ref: "gone.away" });
    expect(problems).toEqual(['sidebar[0]: unknown destination "gone.away"']);
  });

  it("puts removed reserved header controls back in their default places", () => {
    const { body: parsed, problems } = parseShellLayoutBody(
      JSON.stringify(body({ header: [{ kind: "control", id: "m", control: "messages" }] })),
    );
    expect(parsed?.header?.map((b) => (b.kind === "control" ? b.control : b.kind))).toEqual([
      "search",
      "messages",
      "notifications",
    ]);
    expect(problems).toHaveLength(2);
  });

  it("cuts a Dock longer than the limit and refuses submenus in it", () => {
    const dock = Array.from({ length: SHELL_DOCK_MAX_ITEMS + 2 }, (_, i) => ({ kind: "nav", id: `d${i}`, ref: "chat" }));
    dock[0] = { ...dock[0], children: [{ kind: "nav", id: "x", ref: "data" }] } as (typeof dock)[number];
    const { body: parsed, problems } = parseShellLayoutBody(JSON.stringify(body({ dock: dock as ShellNode[] })));
    expect(parsed?.dock).toHaveLength(SHELL_DOCK_MAX_ITEMS);
    expect(parsed?.dock?.[0] && "children" in parsed.dock[0]).toBe(false);
    expect(problems).toHaveLength(2);
  });

  it("serializes in contract order and parses back unchanged", () => {
    const b = body({ landing: { kind: "href", href: "/notes" }, dock: [{ kind: "nav", id: "d", ref: "chat" }] });
    const text = serializeShellLayoutBody(b);
    expect(Object.keys(JSON.parse(text) as object)).toEqual(["schemaVersion", "basedOnCatalogVersion", "dock", "landing"]);
    expect(parseShellLayoutBody(text)).toEqual({ body: b, problems: [] });
  });
});
