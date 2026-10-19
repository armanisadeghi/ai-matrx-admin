// ADVERSARIAL-4 N2/N3 (2026-10-19): refreshing /spaces/use-template?template=… made a SECOND copy (Home Inventory
// twice), and a finished install could leave the page offering "Use template" again. One link visit is one install
// attempt (use-attempt.ts): its record keeps the table copy's install id from the door's FIRST answer — before any
// page exists — so a refresh at any point continues that copy (template_install_fresh p_install_id), and a finished
// attempt keeps its root so a revisit opens it instead of installing again.
//
// The seam: the real runUseTemplate + installTemplateTables (real runTemplateDoor) over a fake supabase rpc, the
// attempt journal over an in-memory Storage that survives the "refresh" (a second run with a new journal object).

const rpc = jest.fn();
jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({ schema: () => ({ rpc: (fn: string, args: unknown) => rpc(fn, args) }) }) }));
jest.mock("../../data/install-host", () => ({ runHostSteps: jest.fn(async () => undefined), upgradeCountsText: jest.fn() }));
jest.mock("../../data/sources", () => ({ registerSampleWorld: jest.fn() }));
jest.mock("@/lib/toast", () => ({ toast: { warning: jest.fn(), success: jest.fn() }, errorSentence: (e: unknown) => String(e) }));

import type { SpaceDoc, SpacesStore } from "../../contract";
import { attemptJournal, readAttempt } from "../use-attempt";
import { installTemplateTables, runUseTemplate, type SpaceTemplateFull } from "../use-pack";

const PAGES = ["Home Inventory", "Rooms", "Items"];
const template = {
  id: "tpl-SP0215",
  catalogue_id: "SP0215",
  spec: { tables: [{ token: "room", name: "Rooms", fields: [] }], views: [] },
  pack: { pages: PAGES.map((title, i) => ({ key: `p${i}`, title, parent: i ? "p0" : null, blocks: [] })) },
} as unknown as SpaceTemplateFull;

const REFUSED = { install_id: "inst-1", state: "refused", done: false, next_step: 3, steps: 9, refusal: { step: 3, label: "field_declare", door: "custom.field_declare", code: "55P03", message: "lock timeout" } };
const DONE = { install_id: "inst-1", state: "installed", done: true, made: [{ kind: "table", id: "tbl-1", ref: "tables.room", title: "Rooms · Home Inventory", table_id: null }] };

function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

function world(opts: { rootFails?: boolean } = {}) {
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
      const next = { ...docs.get(doc.id)!, ...doc, version: docs.get(doc.id)!.version + 1 };
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
  const state = { rootFails: !!opts.rootFails };
  const createRoot = async (title: string) => {
    // The root page write is slower than the install door's first answer (it is, live: ~1 s vs the door's first step).
    await new Promise((r) => setTimeout(r, 20));
    if (state.rootFails) throw new Error("The page could not be saved: connection reset");
    return make(title, null);
  };
  return { store, createRoot, state, live: () => [...docs.values()].filter((d) => !d.trashed) };
}

const freshCalls = () => rpc.mock.calls.filter(([fn]) => fn === "template_install_fresh");
const run = (w: ReturnType<typeof world>, storage: ReturnType<typeof memoryStorage>) =>
  runUseTemplate({
    template,
    store: w.store,
    createRoot: w.createRoot,
    install: (onStage, signal, fresh) => installTemplateTables(template, "org-1", jest.fn() as never, onStage, signal, fresh),
    // A refresh builds a new journal object over the same browser storage.
    journal: attemptJournal("attempt-1", template.id, storage),
    onStage: () => undefined,
  });

beforeEach(() => {
  rpc.mockReset();
});

describe("a template link is one copy", () => {
  it("a refresh before the first page exists continues the SAME table copy, never a second", async () => {
    rpc.mockImplementation(async (fn: string) => (fn === "template_install_fresh" ? { data: REFUSED, error: null } : { data: [], error: null }));
    const storage = memoryStorage();
    const w = world({ rootFails: true });
    const first = await run(w, storage);
    expect(first.ok).toBe(false);
    // TEMPLATE-INSTALL-2: the first call already carries the id the page minted, and the attempt holds it from then on.
    const minted = freshCalls()[0][1].p_install_id as string;
    expect(minted).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/);
    // No page was made, but the attempt kept the copy the door started.
    expect(readAttempt("attempt-1", storage)).toMatchObject({ installId: "inst-1", root: null, done: false });

    // The refresh: a new run over the same storage.
    w.state.rootFails = false;
    rpc.mockImplementation(async (fn: string) => (fn === "template_install_fresh" ? { data: DONE, error: null } : { data: [], error: null }));
    const second = await run(w, storage);
    expect(second.ok).toBe(true);
    expect(freshCalls()[1][1]).toMatchObject({ p_install_id: "inst-1" });
  });

  it("a refresh BEFORE the door's first answer resends the id the page minted: one copy, not two", async () => {
    // The first call never answers in time (the page is reloaded while it is in flight): the attempt must already hold the id.
    rpc.mockImplementation(async (fn: string) => (fn === "template_install_fresh" ? new Promise(() => undefined) : { data: [], error: null }));
    const storage = memoryStorage();
    const w = world();
    void run(w, storage);
    await new Promise((r) => setTimeout(r, 60));
    const minted = freshCalls()[0][1].p_install_id as string;
    expect(minted).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/);
    expect(readAttempt("attempt-1", storage)).toMatchObject({ installId: minted, done: false });

    // The refresh: a new run over the same storage sends THE SAME id on its first call.
    rpc.mockReset();
    rpc.mockImplementation(async (fn: string) => (fn === "template_install_fresh" ? { data: { ...DONE, install_id: minted }, error: null } : { data: [], error: null }));
    const second = await run(world(), storage);
    expect(second.ok).toBe(true);
    expect(freshCalls()[0][1]).toMatchObject({ p_install_id: minted });
  });

  it("a finished attempt keeps its root, and a revisit has nothing to resume", async () => {
    rpc.mockImplementation(async (fn: string) => (fn === "template_install_fresh" ? { data: DONE, error: null } : { data: [], error: null }));
    const storage = memoryStorage();
    const w = world();
    const made = await run(w, storage);
    expect(made.ok).toBe(true);
    const root = made.ok ? made.root.id : "";
    expect(readAttempt("attempt-1", storage)).toMatchObject({ done: true, root, installId: "inst-1", templateId: "tpl-SP0215" });
    expect(attemptJournal("attempt-1", template.id, storage).read()).toBeNull();
    expect(w.live().map((d) => d.title).sort()).toEqual([...PAGES].sort());
  });
});
