// ADVERSARIAL-1 #2: "Use template" took ~30 s and then the page jumped when its tables arrived. The page tree is
// now made WHILE the tables install, the root opens the moment its content is written (before its sub-pages),
// a failed install still moves every page made to Trash, and the root's database blocks carry the sizes the
// gallery preview drew them at, so the made page holds them from its first frame at any width.

jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({}) }));
jest.mock("../../data/install-host", () => ({ runHostSteps: jest.fn(), upgradeCountsText: jest.fn() }));
jest.mock("../../data/sources", () => ({ registerSampleWorld: jest.fn() }));
jest.mock("@/lib/toast", () => ({ toast: { warning: jest.fn(), success: jest.fn() }, errorSentence: (e: unknown) => String(e) }));

import type { SpaceBlock, SpaceDoc, SpacesStore } from "../../contract";
import { paintedSizesOf, pickPainted } from "../../editor/database-host";
import { makeTemplatePages, withPreviewSizes, type SpaceTemplateFull } from "../use-pack";

const dbBlock = { type: "database", props: { source: { kind: "template", table: "task" }, views: [{ id: "v", layout: "kanban" }], activeViewId: "v" } };
const template = {
  pack: {
    pages: [
      { key: "home", title: "Home", parent: null, blocks: [{ type: "paragraph", text: [{ text: "Hi" }] }, dbBlock, dbBlock] },
      { key: "a", title: "A", parent: "home", blocks: [] },
      { key: "b", title: "B", parent: "home", blocks: [] },
      { key: "a1", title: "A1", parent: "a", blocks: [] },
      { key: "c1", title: "C1", parent: "b", blocks: [] },
    ],
  },
} as unknown as SpaceTemplateFull;
const TABLES = { task: { tableId: "tbl-1", viewIds: {} } };

function world(log: string[]) {
  const docs = new Map<string, SpaceDoc & { trashed?: boolean; parent?: string | null }>();
  let n = 0;
  const make = (title: string, parent: string | null) => {
    const doc = { id: `doc-${++n}`, title, blocks: [], version: 1, parent } as unknown as SpaceDoc & { parent: string | null };
    docs.set(doc.id, doc);
    return doc;
  };
  const store = {
    create: async (input: { parentId: string | null; title?: string }) => {
      log.push(`create ${input.title}`);
      await new Promise((r) => setTimeout(r, 5));
      return make(input.title ?? "", input.parentId);
    },
    get: async (id: string) => docs.get(id) ?? null,
    save: async (doc: SpaceDoc) => {
      const cur = docs.get(doc.id)!;
      log.push(`write ${cur.title}`);
      const next = { ...cur, ...doc, version: cur.version + 1 };
      docs.set(doc.id, next);
      return next;
    },
    archive: async (id: string) => {
      for (const d of docs.values()) if (d.id === id || d.parent === id || docs.get(d.parent ?? "")?.parent === id) d.trashed = true;
    },
  } as unknown as SpacesStore;
  return { store, docs, live: () => [...docs.values()].filter((d) => !d.trashed), createRoot: async (title: string) => make(title, null) };
}

describe("Use template is fast and holds its sizes", () => {
  it("makes the page tree while the tables install, writes the root first and opens it before the sub-pages", async () => {
    const log: string[] = [];
    const w = world(log);
    let release!: (t: typeof TABLES) => void;
    const tables = new Promise<typeof TABLES>((r) => (release = r));
    const opened: string[] = [];
    const run = makeTemplatePages(w.store, w.createRoot, template, tables, undefined, undefined, {
      onRootReady: (root) => {
        opened.push(root.title);
        log.push("OPEN");
      },
    });
    // The tables have not arrived, yet every sub-page is made.
    await new Promise((r) => setTimeout(r, 80));
    expect(log.filter((l) => l.startsWith("create")).sort()).toEqual(["create A", "create A1", "create B", "create C1"]);
    expect(log.some((l) => l.startsWith("write"))).toBe(false);
    release(TABLES);
    const root = await run;
    expect(opened).toEqual(["Home"]);
    expect(log.indexOf("write Home")).toBeLessThan(log.indexOf("OPEN"));
    expect(log.indexOf("OPEN")).toBeLessThan(log.findIndex((l) => l.startsWith("write A")));
    expect(root.title).toBe("Home");
  });

  it("makes sub-pages under different parents at once, each parent's children in order", async () => {
    const log: string[] = [];
    const w = world(log);
    await makeTemplatePages(w.store, w.createRoot, template, TABLES);
    const creates = log.filter((l) => l.startsWith("create"));
    expect(creates.slice(0, 2)).toEqual(["create A", "create B"]);
    expect(new Set(creates.slice(2))).toEqual(new Set(["create A1", "create C1"]));
  });

  it("a failed install moves every page made to Trash and names the reason", async () => {
    const w = world([]);
    const tables = Promise.reject(new Error("The template's tables were not made: refused"));
    await expect(makeTemplatePages(w.store, w.createRoot, template, tables)).rejects.toThrow(
      /not finished \(The template's tables were not made: refused\)\. The pages made so far were moved to Trash/,
    );
    expect(w.live()).toEqual([]);
  });

  it("the root's database blocks carry the preview's sizes, held at any width", async () => {
    const w = world([]);
    const root = await makeTemplatePages(w.store, w.createRoot, template, TABLES, undefined, undefined, {
      sizes: { page: "home", vw: 1600, blocks: { 2: { w: 640, h: 412 } } },
    });
    const dbs = w.docs.get(root.id)!.blocks.filter((b: SpaceBlock) => b.type === "database");
    expect(paintedSizesOf(dbs[0].props)).toEqual([{ w: 640, h: 412, vw: 1600, nr: 1, any: 1 }]);
    expect(dbs[1].props?.paintedSize).toBeUndefined();
    // A width nobody measured at still holds the seeded size; an ordinary stored size does not.
    expect(pickPainted(paintedSizesOf(dbs[0].props), { width: 900 })?.h).toBe(412);
    expect(pickPainted(paintedSizesOf({ paintedSize: [{ w: 640, h: 412, vw: 1600 }] }), { width: 900 })).toBeNull();
  });

  it("withPreviewSizes matches blocks by their place, nested ones included", () => {
    const blocks = [
      { id: "x1", type: "paragraph" },
      { id: "x2", type: "columns", children: [{ id: "x3", type: "database", props: {} }] },
    ] as unknown as SpaceBlock[];
    const out = withPreviewSizes(blocks, ["x1", "x2", "x3"], { page: "p", vw: 1000, blocks: { 3: { w: 300, h: 200 } } });
    expect((out[1].children![0].props as { paintedSize: unknown }).paintedSize).toEqual([{ w: 300, h: 200, vw: 1000, nr: 1, any: 1 }]);
  });
});
