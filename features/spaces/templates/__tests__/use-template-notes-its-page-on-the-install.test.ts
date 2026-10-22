// TEMPLATE-INSTALL-3 (ADVERSARIAL-5 F8): "Use template" made the tables through the install door and the pages in the browser, so the install
// never knew the pages and Remove left them in the sidebar. The run tells the install its root page.
// INSTALL-ATOMIC (ADVERSARIAL-7 F1b): it used to tell it only after every page was written (~3 min under load). SP0579's run never got there,
// so its copy recorded no page: no "Remove template copy", and Move to Trash left its 5 tables live. Now the root is recorded BEFORE it is
// written, under the id the run chose: a run cut off anywhere after the write leaves zero pages its install does not know.

jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({}) }));
jest.mock("../../data/install-host", () => ({ runHostSteps: jest.fn(), upgradeCountsText: jest.fn(), noteTemplatePage: jest.fn() }));
jest.mock("../../data/sources", () => ({ registerSampleWorld: jest.fn() }));
jest.mock("@/lib/toast", () => ({ toast: { warning: jest.fn(), success: jest.fn() }, errorSentence: (e: unknown) => String(e) }));

import type { SpaceDoc, SpacesStore } from "../../contract";
import { makeTemplatePages, type PackRun, type PackRunJournal, type SpaceTemplateFull } from "../use-pack";

const template = {
  pack: { pages: ["Home Inventory", "Rooms guide", "Insurance notes"].map((title, i) => ({ key: `p${i}`, title, parent: i ? "p0" : null, blocks: [] })) },
} as unknown as SpaceTemplateFull;

/** A store and an install in memory. `recorded` is the install's `made` page entries (a Set: recording twice is one record, as in the DB). */
function world(installId: string | null, opts: { crashOnSubPage?: boolean } = {}) {
  const docs = new Map<string, SpaceDoc & { trashed?: boolean; parent?: string | null }>();
  const recorded = new Set<string>();
  let n = 0;
  let crash = !!opts.crashOnSubPage;
  const make = (title: string, parent: string | null, id?: string) => {
    const existing = id ? docs.get(id) : undefined;
    if (existing) return existing; // idempotent by id, like the store
    const doc = { id: id ?? `doc-${++n}`, title, blocks: [], version: 1, parent } as unknown as SpaceDoc & { parent: string | null };
    docs.set(doc.id, doc);
    return doc;
  };
  const store = {
    create: async (input: { id?: string; parentId: string | null; title?: string }) => {
      // The tab dies mid-run: the write fails and so does every later call (the Trash move included).
      if (crash && input.parentId) throw new Error("Failed to fetch");
      return make(input.title ?? "", input.parentId, input.id);
    },
    get: async (id: string) => docs.get(id) ?? null,
    save: async (doc: SpaceDoc) => {
      const cur = docs.get(doc.id)!;
      const next = { ...cur, ...doc, version: cur.version + 1 };
      docs.set(doc.id, next);
      return next;
    },
    archive: async (id: string) => {
      if (crash) throw new Error("Failed to fetch");
      for (const d of docs.values()) if (d.id === id || d.parent === id) d.trashed = true;
    },
    restore: async (id: string) => {
      for (const d of docs.values()) if (d.id === id || d.parent === id) d.trashed = false;
    },
  } as unknown as SpacesStore;
  let saved: PackRun | null = installId ? { root: "", ids: {}, trashed: false, installId } : null;
  const journal: PackRunJournal = { read: () => saved, write: (run) => { saved = run; } };
  const live = () => [...docs.values()].filter((d) => !d.trashed);
  /** Root pages (no parent) the install does not know: what made SP0579 unremovable. */
  const unrecordedRoots = () => [...docs.values()].filter((d) => !d.parent && !recorded.has(d.id)).map((d) => d.id);
  const recordedAtWrite: boolean[] = [];
  return {
    store,
    journal,
    live,
    recorded,
    unrecordedRoots,
    recordedAtWrite,
    heal: () => (crash = false),
    createRoot: async (title: string, id: string) => {
      recordedAtWrite.push(recorded.has(id));
      return make(title, null, id);
    },
    journalValue: () => saved,
    notePage: async (iid: string, root: { id: string }) => {
      expect(iid).toBe("install-1");
      recorded.add(root.id);
    },
  };
}

describe("Use template records its page on the install before writing it", () => {
  it("records the root under its chosen id before the root is written, once", async () => {
    const w = world("install-1");
    const root = await makeTemplatePages(w.store, w.createRoot, template, {}, undefined, w.journal, { notePage: w.notePage });
    expect(w.recordedAtWrite).toEqual([true]); // red before INSTALL-ATOMIC: the record came ~3 min after the write
    expect([...w.recorded]).toEqual([root.id]);
    expect(w.unrecordedRoots()).toEqual([]);
    expect(w.journalValue()).toBeNull(); // finished: nothing left to resume
  });

  it("FORCING: a run cut off between the root's write and the end (tab died, Trash move failed too) leaves zero unrecorded pages", async () => {
    const w = world("install-1", { crashOnSubPage: true });
    await expect(makeTemplatePages(w.store, w.createRoot, template, {}, undefined, w.journal, { notePage: w.notePage })).rejects.toThrow();
    expect(w.live().length).toBeGreaterThan(0); // the root is there and live (the SP0579 state)
    expect(w.unrecordedRoots()).toEqual([]); // red before INSTALL-ATOMIC: [the root]
    // Try again resumes the SAME root and records it again: still one record, still one root.
    w.heal();
    const again = await makeTemplatePages(w.store, w.createRoot, template, {}, undefined, w.journal, { notePage: w.notePage });
    expect(w.recorded.size).toBe(1);
    expect(w.recorded.has(again.id)).toBe(true);
    expect(w.live().filter((d) => !d.parent).length).toBe(1);
    expect(w.live().map((d) => d.title).sort()).toEqual(["Home Inventory", "Insurance notes", "Rooms guide"]);
  });

  it("a failed record stops the run before any page is written; Try again writes the root under the same id", async () => {
    const w = world("install-1");
    let healed = false;
    const notePage = async (iid: string, root: { id: string }) => {
      if (!healed) throw new Error("We couldn't record the template's page: We could not reach your data.");
      await w.notePage(iid, root);
    };
    await expect(makeTemplatePages(w.store, w.createRoot, template, {}, undefined, w.journal, { notePage })).rejects.toThrow(
      /^We couldn't record the template's page: We could not reach your data\.$/,
    );
    expect(w.live()).toEqual([]);
    const planned = w.journalValue()?.root;
    healed = true;
    const again = await makeTemplatePages(w.store, w.createRoot, template, {}, undefined, w.journal, { notePage });
    expect(again.id).toBe(planned);
    expect(w.unrecordedRoots()).toEqual([]);
    expect(w.live().map((d) => d.title).sort()).toEqual(["Home Inventory", "Insurance notes", "Rooms guide"]);
  });

  it("waits for the install row (the store's first answer) before recording, and makes no page if the install fails first", async () => {
    const w = world("install-1");
    let fail: (e: unknown) => void = () => undefined;
    const installReady = new Promise<string>((_, reject) => (fail = reject));
    const run = makeTemplatePages(w.store, w.createRoot, template, {}, undefined, w.journal, { notePage: w.notePage, installReady });
    await new Promise((r) => setTimeout(r, 10));
    expect(w.live()).toEqual([]); // nothing written while the install row does not exist
    fail(new Error("The store refused the install."));
    await expect(run).rejects.toThrow("The store refused the install.");
    expect(w.live()).toEqual([]);
    expect(w.recorded.size).toBe(0);
  });

  it("a copy whose id was not kept is refused by name, never noted under nothing", async () => {
    const w = world(null);
    await expect(makeTemplatePages(w.store, w.createRoot, template, {}, undefined, w.journal, { notePage: async () => undefined })).rejects.toThrow(/Remove would leave the pages behind/);
    expect(w.live()).toEqual([]);
  });
});
