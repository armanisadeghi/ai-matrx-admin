// TEMPLATE-INSTALL-3 (ADVERSARIAL-5 F8): "Use template" made the tables through the install door and the pages in the browser, so the install
// never knew the pages and Remove left them in the sidebar. The run now tells the install its root page once the tables are in and every page is
// written, so Remove can move the page (and its sub-pages) to Trash and Restore can bring it back. A failure to note it is the run's failure
// (the pages go to Trash and Try again finishes the SAME copy), never a silent half-recorded copy.

jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({}) }));
jest.mock("../../data/install-host", () => ({ runHostSteps: jest.fn(), upgradeCountsText: jest.fn(), noteTemplatePage: jest.fn() }));
jest.mock("../../data/sources", () => ({ registerSampleWorld: jest.fn() }));
jest.mock("@/lib/toast", () => ({ toast: { warning: jest.fn(), success: jest.fn() }, errorSentence: (e: unknown) => String(e) }));

import type { SpaceDoc, SpacesStore } from "../../contract";
import { makeTemplatePages, type PackRun, type PackRunJournal, type SpaceTemplateFull } from "../use-pack";

const template = {
  pack: { pages: ["Home Inventory", "Rooms guide", "Insurance notes"].map((title, i) => ({ key: `p${i}`, title, parent: i ? "p0" : null, blocks: [] })) },
} as unknown as SpaceTemplateFull;

function world(installId: string | null) {
  const docs = new Map<string, SpaceDoc & { trashed?: boolean; parent?: string | null }>();
  let n = 0;
  const make = (title: string, parent: string | null) => {
    const doc = { id: `doc-${++n}`, title, blocks: [], version: 1, parent } as unknown as SpaceDoc & { parent: string | null };
    docs.set(doc.id, doc);
    return doc;
  };
  const store = {
    create: async (input: { parentId: string | null; title?: string }) => make(input.title ?? "", input.parentId),
    get: async (id: string) => docs.get(id) ?? null,
    save: async (doc: SpaceDoc) => {
      const cur = docs.get(doc.id)!;
      const next = { ...cur, ...doc, version: cur.version + 1 };
      docs.set(doc.id, next);
      return next;
    },
    archive: async (id: string) => {
      for (const d of docs.values()) if (d.id === id || d.parent === id) d.trashed = true;
    },
    restore: async (id: string) => {
      for (const d of docs.values()) if (d.id === id || d.parent === id) d.trashed = false;
    },
  } as unknown as SpacesStore;
  let saved: PackRun | null = installId ? { root: "", ids: {}, trashed: false, installId } : null;
  const journal: PackRunJournal = { read: () => saved, write: (run) => { saved = run; } };
  const live = () => [...docs.values()].filter((d) => !d.trashed);
  return { store, journal, live, createRoot: async (title: string) => make(title, null), journalValue: () => saved };
}

describe("Use template tells the install its page", () => {
  it("notes the root page on the install once, with the copy's install id, after every page is written", async () => {
    const w = world("install-1");
    const noted: Array<{ installId: string; root: string; pagesWrittenThen: number }> = [];
    const root = await makeTemplatePages(w.store, w.createRoot, template, {}, undefined, w.journal, {
      notePage: async (installId, r) => {
        noted.push({ installId, root: r.id, pagesWrittenThen: w.live().length });
      },
    });
    expect(noted).toEqual([{ installId: "install-1", root: root.id, pagesWrittenThen: 3 }]);
    expect(w.journalValue()).toBeNull(); // finished: nothing left to resume
  });

  it("a failed note is the run's failure: the pages go to Trash, the journal keeps the copy, and Try again finishes the same pages", async () => {
    const w = world("install-1");
    let healed = false;
    const notePage = async () => {
      if (!healed) throw new Error("We couldn't record the template's page: We could not reach your data.");
    };
    await expect(makeTemplatePages(w.store, w.createRoot, template, {}, undefined, w.journal, { notePage })).rejects.toThrow(
      /^We couldn't record the template's page: We could not reach your data\. The pages made so far are in Trash/,
    );
    expect(w.live()).toEqual([]);
    expect(w.journalValue()).toMatchObject({ trashed: true, installId: "install-1" });
    healed = true;
    const again = await makeTemplatePages(w.store, w.createRoot, template, {}, undefined, w.journal, { notePage });
    expect(w.live().map((d) => d.title).sort()).toEqual(["Home Inventory", "Insurance notes", "Rooms guide"]); // the same three, brought back
    expect(again.title).toBe("Home Inventory");
  });

  it("a copy whose id was not kept is refused by name, never noted under nothing", async () => {
    const w = world(null);
    await expect(makeTemplatePages(w.store, w.createRoot, template, {}, undefined, w.journal, { notePage: async () => undefined })).rejects.toThrow(/Remove would leave the pages behind/);
  });
});
