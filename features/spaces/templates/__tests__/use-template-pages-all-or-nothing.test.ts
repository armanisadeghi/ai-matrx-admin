// TEMPLATE-INSTALL-3: "Use template" on Fundraising CRM (Oak Street Studio, 2026-10-18 00:13) made three empty
// pages and stopped; a second press made a full new set beside them. The page set is never doubled: a failure
// part-way moves what was made to Trash and says why, and the next run (Try again, or a run cut off by a reload)
// REUSES that set (USE-TEMPLATE-FAILURES) — one set, never two.

jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({}) }));
jest.mock("../../data/install-host", () => ({ runHostSteps: jest.fn(), upgradeCountsText: jest.fn() }));
jest.mock("../../data/sources", () => ({ registerSampleWorld: jest.fn() }));
jest.mock("@/lib/toast", () => ({ toast: { warning: jest.fn(), success: jest.fn() }, errorSentence: (e: unknown) => String(e) }));

import type { SpaceDoc, SpacesStore } from "../../contract";
import { makeTemplatePages, type PackRun, type PackRunJournal, type SpaceTemplateFull } from "../use-pack";

const PAGES = ["Fundraising CRM", "Fundraising guide", "Due-diligence checklist", "Pitch deck outline", "Cap table"];
const template = {
  pack: { pages: PAGES.map((title, i) => ({ key: `p${i}`, title, parent: i ? "p0" : null, blocks: [] })) },
} as unknown as SpaceTemplateFull;

function world(failOnAt?: string) {
  let failOn = failOnAt;
  const docs = new Map<string, SpaceDoc & { trashed?: boolean; parent?: string | null }>();
  let n = 0;
  const make = (title: string, parent: string | null) => {
    const doc = { id: `doc-${++n}`, title, blocks: [], version: 1, parent } as unknown as SpaceDoc & { parent: string | null };
    docs.set(doc.id, doc);
    return doc;
  };
  const store = {
    create: async (input: { parentId: string | null; title?: string }) => {
      if (input.title === failOn) throw new Error("We couldn't create the Space: connection reset");
      return make(input.title ?? "", input.parentId);
    },
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
  const live = () => [...docs.values()].filter((d) => !d.trashed);
  let saved: PackRun | null = null;
  const journal: PackRunJournal = { read: () => saved, write: (run) => { saved = run; } };
  return { store, live, journal, createRoot: async (title: string) => make(title, null), journalValue: () => saved, all: () => [...docs.values()], heal: () => { failOn = undefined; } };
}

describe("Use template pages are all or nothing", () => {
  it("a failure part-way moves the pages made so far to Trash, names the reason, and Try again finishes the SAME pages", async () => {
    const w = world("Pitch deck outline");
    await expect(makeTemplatePages(w.store, w.createRoot, template, {}, undefined, w.journal)).rejects.toThrow(
      /^We couldn't create the Space: connection reset The pages made so far are in Trash; Try again brings them back/,
    );
    expect(w.live()).toEqual([]);
    expect(w.journalValue()).toMatchObject({ trashed: true });
    const madeBefore = w.all().length;
    w.heal();
    await makeTemplatePages(w.store, w.createRoot, template, {}, undefined, w.journal);
    expect(w.live().map((d) => d.title)).toEqual(PAGES);
    // Only the two pages the failed run never made were made now.
    expect(w.all().length).toBe(madeBefore + 2);
    expect(w.journalValue()).toBeNull();
  });

  it("a run cut off with no failure is REUSED by the next run: one set, never two", async () => {
    const w = world();
    const cut = await w.createRoot("Fundraising CRM");
    w.journal.write({ root: cut.id, ids: {}, trashed: false }); // the tab reloaded here, after the root was made
    const root = await makeTemplatePages(w.store, w.createRoot, template, {}, undefined, w.journal);
    expect(root.id).toBe(cut.id);
    expect(w.live().map((d) => d.title)).toEqual(PAGES);
    expect(w.journalValue()).toBeNull();
  });
});
