// TEMPLATE-INSTALL-3: "Use template" on Fundraising CRM (Oak Street Studio, 2026-10-18 00:13) made three empty
// pages and stopped; a second press made a full new set beside them. The page set is all or nothing: a failure
// part-way moves what was made to Trash and says why, and a run cut off without a failure (closed tab, reload)
// is moved to Trash by the next run before it starts — never two sets.

jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({}) }));
jest.mock("../../data/agency-install", () => ({ runHostSteps: jest.fn(), upgradeCountsText: jest.fn() }));
jest.mock("../../data/sources", () => ({ registerSampleWorld: jest.fn() }));
jest.mock("@/lib/toast", () => ({ toast: { warning: jest.fn(), success: jest.fn() }, errorSentence: (e: unknown) => String(e) }));

import type { SpaceDoc, SpacesStore } from "../../contract";
import { makeTemplatePages, type PackRunJournal, type SpaceTemplateFull } from "../use-pack";

const PAGES = ["Fundraising CRM", "Fundraising guide", "Due-diligence checklist", "Pitch deck outline", "Cap table"];
const template = {
  pack: { pages: PAGES.map((title, i) => ({ key: `p${i}`, title, parent: i ? "p0" : null, blocks: [] })) },
} as unknown as SpaceTemplateFull;

function world(failOn?: string) {
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
  } as unknown as SpacesStore;
  const live = () => [...docs.values()].filter((d) => !d.trashed);
  let saved: string | null = null;
  const journal: PackRunJournal = { read: () => saved, write: (id) => { saved = id; } };
  return { store, live, journal, createRoot: async (title: string) => make(title, null), journalValue: () => saved };
}

describe("Use template pages are all or nothing", () => {
  it("a failure part-way moves the pages made so far to Trash and names the reason", async () => {
    const w = world("Pitch deck outline");
    await expect(makeTemplatePages(w.store, w.createRoot, template, {}, undefined, w.journal)).rejects.toThrow(
      /not finished \(We couldn't create the Space: connection reset\)\. The pages made so far were moved to Trash/,
    );
    expect(w.live()).toEqual([]);
    expect(w.journalValue()).toBeNull();
  });

  it("a run cut off with no failure is moved to Trash by the next run: one set, never two", async () => {
    const w = world();
    const cut = await w.createRoot("Fundraising CRM");
    w.journal.write(cut.id); // the tab reloaded here, after the root was made
    await makeTemplatePages(w.store, w.createRoot, template, {}, undefined, w.journal);
    expect(w.live().map((d) => d.title)).toEqual(PAGES);
    expect(w.journalValue()).toBeNull();
  });
});
