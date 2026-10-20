// USE-TEMPLATE-FAILURES (Accounting Firm Desk, 2026-10-19): the store REFUSED the install (step 13, lock timeout
// 55P03 after 148 s) and the Spaces screen spun on "Making tables… · Pages 5/11" for minutes. The door re-asked the
// transient refusal up to 400 times. Every way the run can end — a refusal, an rpc error, a dropped connection, a
// failed page write while the tables install, a hung install — must end the run within moments with one sentence
// and a Try again that RESUMES the same table copy and the same pages (never a second set).
//
// The seam: the real installTemplateTables (real runTemplateDoor from @ai-matrx/records) over a fake supabase
// client whose template_install_fresh answers what the live store answered, with the real page flow beside it.

const rpc = jest.fn();
jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({ schema: () => ({ rpc: (fn: string, args: unknown) => rpc(fn, args) }) }) }));
jest.mock("../../data/install-host", () => ({ runHostSteps: jest.fn(async () => undefined), upgradeCountsText: jest.fn() }));
jest.mock("../../data/sources", () => ({ registerSampleWorld: jest.fn() }));
jest.mock("@/lib/toast", () => ({ toast: { warning: jest.fn(), success: jest.fn() }, errorSentence: (e: unknown) => String(e) }));

import type { SpaceDoc, SpacesStore } from "../../contract";
import { TEMPLATE_BUSY_MESSAGE } from "@ai-matrx/records/templates";

import { installTemplateTables, makeTemplatePages, runUseTemplate, type PackRun, type PackRunJournal, type SpaceTemplateFull } from "../use-pack";

const PAGES = ["Accounting Firm Desk", "Clients", "Engagements", "Deadlines", "Guide"];
const template = {
  id: "tpl-SP0457",
  catalogue_id: "SP0457",
  spec: { tables: [{ token: "client", name: "Clients", fields: [] }], views: [] },
  pack: { pages: PAGES.map((title, i) => ({ key: `p${i}`, title, parent: i ? "p0" : null, blocks: [] })) },
} as unknown as SpaceTemplateFull;

const REFUSED = {
  install_id: "inst-1",
  state: "refused",
  done: false,
  next_step: 13,
  steps: 70,
  refusal: { step: 13, label: "field_declare", door: "custom.field_declare", code: "55P03", message: "canceling statement due to lock timeout" },
};
const DONE = { install_id: "inst-1", state: "installed", done: true, made: [{ kind: "table", id: "tbl-1", ref: "tables.client", title: "Clients · Accounting Firm Desk", table_id: null }] };

function world(opts: { failOn?: string; createMs?: number } = {}) {
  const docs = new Map<string, SpaceDoc & { trashed?: boolean; parent?: string | null }>();
  let n = 0;
  let failOn = opts.failOn;
  const make = (title: string, parent: string | null) => {
    const doc = { id: `doc-${++n}`, title, blocks: [], version: 1, parent } as unknown as SpaceDoc & { parent: string | null };
    docs.set(doc.id, doc);
    return doc;
  };
  const store = {
    create: async (input: { parentId: string | null; title?: string }) => {
      await new Promise((r) => setTimeout(r, opts.createMs ?? 2));
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
  let saved: PackRun | null = null;
  const journal: PackRunJournal = { read: () => saved, write: (run) => void (saved = run) };
  return {
    store,
    journal,
    journalValue: () => saved,
    createRoot: async (title: string) => make(title, null),
    live: () => [...docs.values()].filter((d) => !d.trashed),
    all: () => [...docs.values()],
    heal: () => void (failOn = undefined),
  };
}

const installCalls = () => rpc.mock.calls.filter(([fn]) => fn === "template_install_fresh" || fn === "template_install");

function use(w: ReturnType<typeof world>, extra: Partial<Parameters<typeof runUseTemplate>[0]> = {}) {
  const stages: Array<string | null> = [];
  const run = runUseTemplate({
    template,
    store: w.store,
    createRoot: w.createRoot,
    install: (onStage, signal, fresh) => installTemplateTables(template, "org-1", jest.fn() as never, onStage, signal, fresh),
    journal: w.journal,
    onStage: (s) => stages.push(s),
    ...extra,
  });
  return { run, stages };
}

beforeEach(() => {
  rpc.mockReset();
  rpc.mockImplementation(async () => ({ data: [], error: null }));
});

describe("Use template failures reach the person, and Try again resumes", () => {
  it("a refused install (55P03) ends at once with the store's sentence — asked ONCE, never in a loop", async () => {
    rpc.mockImplementation(async (fn: string) => (fn === "template_install" ? { data: REFUSED, error: null } : { data: [], error: null }));
    const w = world();
    const t0 = Date.now();
    // ADVERSARIAL-6 F4: ONE plain sentence (the records family's busy words); the step and raw text are the console's.
    await expect(makeTemplatePages(w.store, w.createRoot, template, installTemplateTables(template, "org-1", jest.fn() as never), undefined, w.journal)).rejects.toThrow(
      new RegExp(`^${TEMPLATE_BUSY_MESSAGE.replace(/[.;]/g, "\\$&")}$`),
    );
    expect(installCalls()).toHaveLength(1);
    expect(Date.now() - t0).toBeLessThan(2000);
    expect(w.live()).toEqual([]);
  });

  it("refused during the concurrent page flow → the refusal with Try again; Try again resumes the SAME copy and the SAME pages", async () => {
    rpc.mockImplementation(async (fn: string) => (fn === "template_install_fresh" ? { data: REFUSED, error: null } : { data: [], error: null }));
    const w = world({ createMs: 5 });
    const first = use(w);
    const r1 = await first.run;
    expect(r1).toMatchObject({ ok: false, stopped: false });
    expect(r1.ok ? "" : r1.message).toBe(TEMPLATE_BUSY_MESSAGE);
    // No stage text outlives the failure.
    expect(first.stages.at(-1)).toBeNull();
    expect(installCalls()).toHaveLength(1);
    expect(installCalls()[0][1]).toMatchObject({ p_template_id: "tpl-SP0457", p_title: "Accounting Firm Desk", p_install_id: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-/) });
    expect(w.journalValue()).toMatchObject({ installId: "inst-1", trashed: true });
    const madeBefore = w.all().length;

    // Try again: the store resumes the install from its step; the pages come back from Trash and are finished.
    rpc.mockImplementation(async (fn: string) => (fn === "template_install_fresh" ? { data: DONE, error: null } : { data: [], error: null }));
    const again = use(w);
    const r2 = await again.run;
    expect(r2.ok).toBe(true);
    expect(installCalls()[1][1]).toMatchObject({ p_install_id: "inst-1" });
    expect(w.live().map((d) => d.title).sort()).toEqual([...PAGES].sort());
    // Only the pages the first run never made were made now: one set, never two.
    expect(w.all().length).toBe(madeBefore + (PAGES.length - madeBefore));
    expect(w.all().length).toBe(PAGES.length);
    expect(w.journalValue()).toBeNull();
    expect(again.stages.at(-1)).toBeNull();
  });

  it("an rpc error ends the run with the store's words", async () => {
    rpc.mockImplementation(async (fn: string) => (fn === "template_install_fresh" ? { data: null, error: { code: "42501", message: "permission denied for table template_install" } } : { data: [], error: null }));
    const w = world();
    const r = await use(w).run;
    expect(r.ok ? "" : r.message).toBe("Permission denied for table template_install.");
  });

  it("a dropped connection ends the run with its reason", async () => {
    rpc.mockImplementation(async (fn: string) => {
      if (fn === "template_install_fresh") throw new TypeError("Failed to fetch");
      return { data: [], error: null };
    });
    const w = world();
    const r = await use(w).run;
    expect(r.ok ? "" : r.message).toBe("We could not reach your data.");
  });

  it("a page write that fails while the tables still install ends the run at once and stops the install", async () => {
    let installSignalled = false;
    rpc.mockImplementation((fn: string) => (fn === "template_install_fresh" ? new Promise(() => undefined) : Promise.resolve({ data: [], error: null })));
    const w = world({ failOn: "Deadlines" });
    const t0 = Date.now();
    const r = await use(w, {
      install: (onStage, signal, fresh) => {
        signal.addEventListener("abort", () => void (installSignalled = true));
        return installTemplateTables(template, "org-1", jest.fn() as never, onStage, signal, fresh);
      },
    }).run;
    expect(Date.now() - t0).toBeLessThan(2000);
    expect(r.ok ? "" : r.message).toBe("We couldn't create the Space: connection reset");
    expect(installSignalled).toBe(true);
    expect(w.live()).toEqual([]);
  });

  it("a hung install says it is still working, offers Cancel, and Cancel ends the run with what it leaves behind", async () => {
    rpc.mockImplementation((fn: string) => (fn === "template_install_fresh" ? new Promise(() => undefined) : Promise.resolve({ data: [], error: null })));
    const w = world();
    const stalls: Array<(() => void) | null> = [];
    const { run, stages } = use(w, {
      stallMs: 120,
      onStalled: (cancel) => {
        stalls.push(cancel);
        cancel?.();
      },
    });
    const r = await run;
    expect(stages.some((s) => s?.startsWith("Still working · Making tables…"))).toBe(true);
    expect(stalls[0]).toEqual(expect.any(Function));
    expect(stalls.at(-1)).toBeNull();
    expect(r).toMatchObject({ ok: false, stopped: true });
    expect(r.ok ? "" : r.message).toBe("Stopped; the tables made so far are kept.");
    expect(stages.at(-1)).toBeNull();
    expect(w.journalValue()).toMatchObject({ trashed: true });
  });
});
