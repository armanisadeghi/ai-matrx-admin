// ADVERSARIAL-6 F1–F4 (2026-10-20): a Space template copy's lifecycle follows its ROOT page (Notion parity).
// F1: Move to Trash on a copy's root removed only the pages and left the tables, rows and assistant `installed`.
// F2: after that, every new link offered "Open it", which ended in "Its pages were not found."
// F3: "Open it" found the root by title ±5 min, so a renamed root could not be opened.
// F4: a failed install said the raw database text plus up to three sentences, with "Try again" twice.
//
// The seams: the real installedCopies / templateCopyOfPage over a fake supabase client that answers
// custom.template_instances and content.document the way the live store does (the install records its pages: template_instances answers root_page_id and pages, and
// template_instance_of_page answers which install a page belongs to; the page itself carries nothing), and the real trash/restore lifecycle over fake ports with a fake install.

type Doc = { id: string; organization_id: string; format: string; title: string; created_at: string; deleted_at: string | null; metadata: Record<string, unknown> };
type Install = { install_id: string; state: string; title: string; version: number; started_at: string; finished_at: string | null; tables: unknown[]; root_page_id: string | null; pages: Array<{ id: string; title: string }> };

const db: { docs: Doc[]; installs: Install[]; asked: number } = { docs: [], installs: [], asked: 0 };

function query(rows: () => Doc[]) {
  const filters: Array<(d: Doc) => boolean> = [];
  const read = (d: Doc, col: string): unknown => {
    const path = col.match(/^metadata->(\w+)->>(\w+)$/);
    if (path) return ((d.metadata[path[1]] ?? {}) as Record<string, unknown>)[path[2]];
    return (d as unknown as Record<string, unknown>)[col];
  };
  const q = {
    select: () => q,
    eq: (col: string, v: unknown) => (filters.push((d) => read(d, col) === v), q),
    is: (col: string, v: unknown) => (filters.push((d) => read(d, col) === v), q),
    in: (col: string, vs: unknown[]) => (filters.push((d) => vs.includes(read(d, col))), q),
    gte: () => q,
    lte: () => q,
    limit: () => q,
    maybeSingle: () => Promise.resolve({ data: rows().filter((d) => filters.every((f) => f(d)))[0] ?? null, error: null }),
    then: (resolve: (v: unknown) => unknown) => resolve({ data: rows().filter((d) => filters.every((f) => f(d))), error: null }),
  };
  return q;
}

jest.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    schema: () => ({
      rpc: async (fn: string, args: Record<string, unknown>) => {
        if (fn === "template_instances") return { data: db.installs.map((i) => ({ ...i, newer_version: null, upgrade: null, instance_no: 2, mode: "fresh", template_id: "tpl" })), error: null };
        if (fn === "template_instance_of_page") {
          db.asked++;
          const i = db.installs.find((x) => x.pages.some((pg) => pg.id === args.p_page_id));
          return { data: i ? { id: i.install_id, catalogue_id: "SP0203", status: i.state, root_page_id: i.root_page_id, template_version: i.version } : null, error: null };
        }
        return { data: null, error: null };
      },
      from: () => query(() => db.docs),
    }),
  }),
}));
jest.mock("../../data/install-host", () => ({ runHostSteps: jest.fn(async () => undefined), upgradeCountsText: jest.fn() }));
jest.mock("../../data/sources", () => ({ registerSampleWorld: jest.fn() }));
jest.mock("@/lib/toast", () => ({ toast: { warning: jest.fn(), success: jest.fn() }, errorSentence: (e: unknown) => String(e) }));

import { TEMPLATE_BUSY_MESSAGE } from "@ai-matrx/records/templates";

import type { SpaceDoc, SpacesStore } from "../../contract";
import { installedCopies, refusalSentence, runUseTemplate, type PackRun, type SpaceTemplateFull } from "../use-pack";
import { forgetTemplateCopyOfPage, removeCopyQuestion, templateCopyOfPageCached, restorePageOrCopy, templateCopyOfPage, templateDoorSentence, trashPageOrCopy, type CopyLifecyclePorts, type TemplateCopy } from "../template-copy";

const ORG = "org-1";
const at = "2026-10-20T06:00:00.000Z";
const root = (id: string, installId: string, title: string, deleted: boolean): Doc => ({
  id,
  organization_id: ORG,
  format: "spaces",
  title,
  created_at: at,
  deleted_at: deleted ? at : null,
  metadata: {},
});
const install = (id: string, state: string, title = "Personal Goal Tracker"): Install => ({ install_id: id, state, title, version: 6, started_at: at, finished_at: at, tables: [{}, {}, {}], root_page_id: null, pages: [] });
/** The install records `rootId` as its page (template_install_note), as the run does. */
const recorded = (i: Install, rootId: string, title = "Personal Goal Tracker"): Install => ({ ...i, root_page_id: rootId, pages: [{ id: rootId, title }] });

beforeEach(() => {
  db.docs = [];
  db.installs = [];
  db.asked = 0;
  forgetTemplateCopyOfPage();
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
});

describe("F2: 'You already have' offers only a copy that can be opened, or restored", () => {
  it("a copy whose root was trashed by hand while its tables stayed installed is NOT offered (it would end in a dead end)", async () => {
    db.installs = [recorded(install("inst-a", "installed"), "root-a")];
    db.docs = [root("root-a", "inst-a", "Personal Goal Tracker", true)];
    expect(await installedCopies(ORG, "SP0203")).toEqual([]);
  });

  it("a removed copy (install uninstalled, root in Trash) is offered as trashed, so the screen says Restore it", async () => {
    db.installs = [recorded(install("inst-a", "uninstalled"), "root-a")];
    db.docs = [root("root-a", "inst-a", "Personal Goal Tracker", true)];
    expect(await installedCopies(ORG, "SP0203")).toEqual([expect.objectContaining({ installId: "inst-a", root: "root-a", trashed: true })]);
  });

  it("a live copy is offered as live, with its recorded root", async () => {
    db.installs = [recorded(install("inst-a", "installed"), "root-a")];
    db.docs = [root("root-a", "inst-a", "Personal Goal Tracker", false)];
    expect(await installedCopies(ORG, "SP0203")).toEqual([expect.objectContaining({ installId: "inst-a", root: "root-a", trashed: false })]);
  });

  it("a copy with no recorded root page is not offered (never found by title)", async () => {
    db.installs = [install("inst-a", "installed")];
    db.docs = [root("root-a", "inst-a", "Personal Goal Tracker", false)];
    expect(await installedCopies(ORG, "SP0203")).toEqual([]);
  });
});

describe("F3: Open it uses the root the copy recorded", () => {
  it("a renamed root is still the copy's root", async () => {
    db.installs = [recorded(install("inst-a", "installed"), "root-a")];
    db.docs = [root("root-a", "inst-a", "Our goals", false)];
    expect((await installedCopies(ORG, "SP0203"))[0]?.root).toBe("root-a");
  });

  it("the page side reads the same link: a renamed root is the copy's root, a duplicate (not recorded by the install) is not, and neither is a later recorded page", async () => {
    db.installs = [{ ...recorded(install("inst-a", "installed"), "root-a"), pages: [{ id: "root-a", title: "Our goals" }, { id: "sub-a", title: "Goals" }] }];
    db.docs = [root("root-a", "inst-a", "Our goals", false), root("dup", "inst-a", "Our goals", false), root("sub-a", "inst-a", "Goals", false)];
    expect(await templateCopyOfPage("sub-a")).toBeNull();
    expect(await templateCopyOfPage("root-a")).toMatchObject({ installId: "inst-a", rootId: "root-a", state: "installed", tables: 3 });
    expect(await templateCopyOfPage("dup")).toBeNull();
  });
});

describe("F1: Move to Trash on a copy's root removes the copy; Restore brings it back", () => {
  function ports(state: { install: string; page: "live" | "trashed" }, answer = true) {
    const asked: Array<{ title: string; description: string }> = [];
    const doors: string[] = [];
    const copy = (): TemplateCopy | null =>
      state.install === "none" ? null : { installId: "inst-a", catalogueId: "SP0203", organizationId: ORG, rootId: "root-a", title: "Personal Goal Tracker", state: state.install as TemplateCopy["state"], tables: 3 };
    const p: CopyLifecyclePorts = {
      readCopy: async () => copy(),
      archive: async () => void (state.page = "trashed"),
      restore: async () => void (state.page = "live"),
      confirm: async (c, removeCopy) => (asked.push(removeCopyQuestion(c, removeCopy)), answer),
      // The records doors: uninstall archives the tables and trashes the recorded root; restore brings both back.
      runDoor: async (door) => {
        doors.push(door);
        if (door === "template_uninstall") Object.assign(state, { install: "uninstalled", page: "trashed" });
        else Object.assign(state, { install: "installed", page: "live" });
        return true;
      },
    };
    return { p, asked, doors };
  }

  it("trashing the root leaves no `installed` copy behind, after one line naming the tables", async () => {
    const state = { install: "installed", page: "live" as const };
    const { p, asked, doors } = ports(state);
    expect(await trashPageOrCopy("root-a", p)).toBe("removed");
    expect(state).toEqual({ install: "uninstalled", page: "trashed" });
    expect(doors).toEqual(["template_uninstall"]);
    expect(asked[0].description).toBe("Also removes its 3 tables. You can restore it from Trash.");
  });

  it("'Remove template copy' takes the same path", async () => {
    const state = { install: "installed", page: "live" as const };
    const { p, asked } = ports(state);
    expect(await trashPageOrCopy("root-a", p, { removeCopy: true })).toBe("removed");
    expect(state.install).toBe("uninstalled");
    expect(asked[0].title).toBe("Remove Personal Goal Tracker?");
  });

  it("saying no keeps everything", async () => {
    const state = { install: "installed", page: "live" as const };
    const { p } = ports(state, false);
    expect(await trashPageOrCopy("root-a", p)).toBe("kept");
    expect(state).toEqual({ install: "installed", page: "live" });
  });

  it("restoring the root restores the copy", async () => {
    const state = { install: "uninstalled", page: "trashed" as "live" | "trashed" };
    const { p, doors } = ports(state);
    await restorePageOrCopy("root-a", p);
    expect(state).toEqual({ install: "installed", page: "live" });
    expect(doors).toEqual(["template_restore"]);
  });

  it("an ordinary page goes to Trash with no question and no door", async () => {
    const state = { install: "none", page: "live" as "live" | "trashed" };
    const { p, asked, doors } = ports(state);
    expect(await trashPageOrCopy("page", p)).toBe("trashed");
    expect(state.page).toBe("trashed");
    expect(asked).toEqual([]);
    expect(doors).toEqual([]);
  });

  it("a removal that stopped part way is finished on the next Move to Trash", async () => {
    const state = { install: "uninstalling", page: "trashed" as "live" | "trashed" };
    const { p, doors } = ports(state);
    expect(await trashPageOrCopy("root-a", p)).toBe("removed");
    expect(state.install).toBe("uninstalled");
    expect(doors).toEqual(["template_uninstall"]);
  });
});

describe("F4: a failed install says ONE plain sentence, with no 'Try again' in it", () => {
  const oneSentence = (s: string) => {
    expect(s.split(/(?<=[.!?])\s+/).filter(Boolean)).toHaveLength(1);
    expect(s).not.toMatch(/try again picks up|in Trash|step \d+|canceling statement/i);
  };
  it("a lock timeout reads as the records family's busy sentence", () => {
    const s = refusalSentence({ step: 13, label: "field_declare", code: "55P03", message: "canceling statement due to lock timeout" });
    expect(s).toBe(TEMPLATE_BUSY_MESSAGE);
    oneSentence(s);
  });
  it("the API away reads as the shared mapper's sentence", () => {
    oneSentence(templateDoorSentence(null, { code: "PGRST002", message: "Could not query the database for the schema cache. Retrying." }));
    expect(templateDoorSentence(null, { code: "", message: "Failed to fetch" })).toBe("We could not reach your data.");
  });
  it("a store refusal keeps the store's own first sentence only", () => {
    const s = refusalSentence({ code: "22023", message: "That table name is taken. Pick another one. Then retry." });
    expect(s).toBe("That table name is taken.");
    oneSentence(s);
  });
});

describe("F5: the progress counter counts pages and never freezes beside the table step", () => {
  it("while the tables install after the pages are made, only the table step's own progress shows", async () => {
    const PAGES = ["Goals", "Habits", "Reviews"];
    const template = {
      id: "tpl",
      catalogue_id: "SP0203",
      spec: { tables: [], views: [] },
      pack: { pages: PAGES.map((title, i) => ({ key: `p${i}`, title, parent: i ? "p0" : null, blocks: [] })) },
    } as unknown as SpaceTemplateFull;
    const docs = new Map<string, SpaceDoc>();
    const make = (id: string, title: string) => {
      const d = { id, title, blocks: [], version: 1 } as unknown as SpaceDoc;
      docs.set(id, d);
      return d;
    };
    const store = {
      create: async (input: { id?: string; title?: string }) => make(input.id ?? `doc-${docs.size}`, input.title ?? ""),
      get: async (id: string) => docs.get(id) ?? null,
      save: async (doc: SpaceDoc) => make(doc.id, doc.title),
      archive: async () => undefined,
      restore: async () => undefined,
    } as unknown as SpacesStore;
    let saved: PackRun | null = null;
    let treeDone: () => void = () => undefined;
    const treeMade = new Promise<void>((r) => (treeDone = r));
    const stages: string[] = [];
    const result = await runUseTemplate({
      template,
      store,
      createRoot: async (title, id) => make(id, title),
      journal: { read: () => saved, write: (run) => void (saved = run) },
      onStage: (st) => {
        if (st) stages.push(st);
        // The last sub-page is being made: let the tree finish, then the tables report their late step.
        if (st?.includes(`Pages ${PAGES.length - 1}/${PAGES.length}`)) setTimeout(treeDone, 30);
      },
      install: async (onStage) => {
        onStage("Making tables 1/40…");
        await treeMade;
        await new Promise((r) => setTimeout(r, 10));
        onStage("Making tables 39/40…");
        return {};
      },
    });
    expect(result.ok).toBe(true);
    // Every page count is out of the number of PAGES (3), never the number of writes (5).
    for (const st of stages) for (const m of st.matchAll(/(\d+)\/(\d+)/g)) if (!st.startsWith("Making tables")) expect(m[2]).toBe(String(PAGES.length));
    // The table step's late progress is shown on its own, never beside a frozen "Pages x/y".
    const late = stages.find((st) => st.includes("Making tables 39/40"));
    expect(late).toBe("Making tables 39/40…");
  });
});

describe("ADVERSARIAL-7 F7: the copy is looked up when the page opens, once per page", () => {
  it("every later ask for the same page re-uses the first answer (one read), and a forgotten page is read again", async () => {
    db.installs = [recorded(install("inst-a", "installed"), "root-a")];
    db.docs = [root("root-a", "inst-a", "Personal Goal Tracker", false)];
    const [a, b] = await Promise.all([templateCopyOfPageCached("root-a"), templateCopyOfPageCached("root-a")]);
    expect(a).toEqual(expect.objectContaining({ installId: "inst-a", tables: 3 }));
    expect(b).toBe(a);
    await templateCopyOfPageCached("root-a");
    expect(db.asked).toBe(1);
    forgetTemplateCopyOfPage("root-a");
    await templateCopyOfPageCached("root-a");
    expect(db.asked).toBe(2);
  });

  it("a read that failed is not kept: the next ask tries again", async () => {
    db.docs = [];
    await expect(templateCopyOfPageCached("nope")).resolves.toBeNull(); // no such page: an answer, kept
    expect(await templateCopyOfPageCached("nope")).toBeNull();
    expect(db.asked).toBe(0);
  });

  it("Move to Trash on the root still names the tables (the cached read changes nothing in the question)", () => {
    expect(removeCopyQuestion({ title: "Personal Goal Tracker", tables: 3 }, false).description).toBe("Also removes its 3 tables. You can restore it from Trash.");
  });
});
