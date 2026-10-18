/**
 * 2026-10-17: a person answered 40+ "On the web" results in Enrich and none reached the brand — Enrich held them only
 * in the page's memory and Apply wrote none. Guard: 40 decisions made through the Enrich saver (with re-answers and a
 * cleared-then-given-again answer), flushed as Apply does, are ALL on the brand's rows through the REAL answer path
 * (validate/persist.ts against an in-memory web.discovered_item that enforces the real non-partial dedup index), come
 * back for the same results after a reload, and are all listed by the brand page's "On the web" section.
 */

type Row = Record<string, unknown> & { id: string; deleted_at: string | null };
const tables: Record<string, Row[]> = { discovered_item: [], brand_exclusion: [], site: [] };
let nextId = 1;

function dedupKey(r: Row): string {
  return JSON.stringify([r.brand_id, r.category, r.guessed_kind, r.url, JSON.stringify(r.value)]);
}

function query(table: string, op: "select" | "insert" | "update", payload?: Record<string, unknown>) {
  const filters: ((r: Row) => boolean)[] = [];
  let single: "single" | "maybe" | null = null;
  let limit = Infinity;
  const field = (r: Row, col: string): unknown => {
    if (col.startsWith("context->>")) return ((r.context as Record<string, unknown> | null) ?? {})[col.slice("context->>".length)];
    return r[col];
  };
  const b: Record<string, unknown> = {};
  b.eq = (col: string, val: unknown) => (filters.push((r) => field(r, col) === val), b);
  b.in = (col: string, vals: unknown[]) => (filters.push((r) => vals.includes(field(r, col))), b);
  b.is = (col: string, val: unknown) => (filters.push((r) => (field(r, col) ?? null) === val), b);
  b.not = (col: string, _op: string, val: unknown) => (filters.push((r) => (field(r, col) ?? null) !== val), b);
  b.or = () => b;
  b.order = () => b;
  b.range = () => b;
  b.limit = (n: number) => ((limit = n), b);
  b.select = () => b;
  const run = async (): Promise<{ data: unknown; error: unknown }> => {
    const rows = tables[table];
    if (op === "insert") {
      const row = { id: `${table}-${nextId++}`, deleted_at: null, ...payload } as Row;
      // The live index (discovered_item_dedup / brand_exclusion unique) is NOT partial: a soft-deleted twin still collides.
      const clash = table === "discovered_item" ? rows.some((r) => dedupKey(r) === dedupKey(row)) : rows.some((r) => r.brand_id === row.brand_id && r.match_kind === row.match_kind && r.match_value === row.match_value);
      if (clash) return { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } };
      rows.push(row);
      return { data: single ? { id: row.id } : null, error: null };
    }
    const hit = rows.filter((r) => filters.every((f) => f(r))).slice(0, limit);
    if (op === "update") {
      for (const r of hit) Object.assign(r, payload);
      return { data: single ? (hit[0] ? { id: hit[0].id } : null) : null, error: null };
    }
    const data = hit.map((r) => ({ ...r }));
    return { data: single ? (data[0] ?? null) : data, error: null };
  };
  b.single = () => ((single = "single"), run());
  b.maybeSingle = () => ((single = "maybe"), run());
  b.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) => run().then(resolve, reject);
  return b;
}

jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
jest.mock("@/utils/supabase/webDb", () => ({
  authenticatedWebDb: async () => ({
    from: (table: string) => ({
      select: () => query(table, "select"),
      insert: (p: Record<string, unknown>) => query(table, "insert", p),
      update: (p: Record<string, unknown>) => query(table, "update", p),
    }),
  }),
}));
const promoted: string[] = [];
/** What the server's promotion "creates" on its next call (the test sets it per answer). */
let nextCreated: Record<string, string[]> = {};
const emptyIds = () => ({ competitor: [], person: [], location: [], listing: [], keyword: [], backlink: [], offering: [], industry: [], typed_fact: [] });
jest.mock("../promote", () => ({
  ...jest.requireActual("../promote"),
  promoteSmartAddFindings: jest.fn(async (brandId: string) => {
    promoted.push(brandId);
    const createdIds = { ...emptyIds(), ...nextCreated };
    nextCreated = {};
    return { landed: {}, alreadyHome: {}, keptOnBrand: {}, createdIds, problems: [] };
  }),
  promotedHomes: (r: { createdIds: Record<string, string[]> }) => Object.entries(r.createdIds).flatMap(([t, ids]) => ids.map((id) => `home.${t}:${id}`)),
  undoPromotion: jest.fn(async () => undefined),
}));
jest.mock("@/lib/toast", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
jest.mock("@/features/marketing/data/service", () => ({
  mergeBrandProfile: jest.fn(async (_id: string, edit: (p: Record<string, unknown>) => Record<string, unknown>) => {
    const profile = edit({});
    return { brand: { id: "b1", organization_id: "org-brand", name: "Ritual", version: 4, profile }, before: {} };
  }),
  deleteSite: jest.fn(async () => undefined),
  getBrand: jest.fn(),
}));
jest.mock("../siteOwnership", () => ({ claimSite: jest.fn(async () => ({ kind: "claimed", site: { id: "site-1" } })) }));
jest.mock("../siteOwnershipLive", () => ({ liveSiteClaimDeps: {} }));
jest.mock("@/features/education/kits/systemRuns", () => ({ startSystemRun: jest.fn(async () => ({})) }));
jest.mock("@/features/scopes/service/associationsService", () => ({ associationsService: { remove: jest.fn(async () => ({ ok: true })), add: jest.fn(async () => ({ ok: true })) } }));
jest.mock("@/lib/redux/store-singleton", () => ({ getStoreSingleton: jest.fn(() => ({ getState: () => ({}) })) }));
const linked: string[] = [];
jest.mock("../relations", () => ({
  ...jest.requireActual("../relations"),
  linkPersonToBrand: jest.fn(async (_org: string, _brand: string, name: string) => {
    linked.push(name);
    return { partyId: `party-${name}`, home: `platform.associations:${name}` };
  }),
}));
jest.mock("@ai-matrx/data/db", () => ({
  readAllRows: async (page: (r: { from: number; to: number }) => PromiseLike<{ data: unknown[] | null; error: unknown }>) => {
    const res = await page({ from: 0, to: 999 });
    return res.data ?? [];
  },
}));

import type { BrandRelationKind } from "@/features/marketing/data/service";
import type { MarketingBrand } from "@/features/marketing/types";
import type { EvidenceItem } from "../evidence";
import { persistAnswer } from "../validate/persist";
import { undoPromotion } from "../promote";
import { deleteSite } from "@/features/marketing/data/service";
import type { WebChoice } from "../webKinds";
import {
  answerForWebChoice,
  listBrandWebDecisions,
  matchSavedWebDecisions,
  matchSavedWebMarks,
  webDecisionCounts,
  webDecisionSummary,
  WebDecisionSaver,
  type WebSaveStatus,
} from "../webDecisions";

const kind = (key: string, label: string, over: Partial<BrandRelationKind> = {}): BrandRelationKind => ({
  id: key, key, label, routesTo: null, isKnown: true, stance: "about_us", description: null, hasSentiment: false, usage: "use",
  match: { hosts: [], paths: [], categories: [] }, ...over,
});
const KINDS: BrandRelationKind[] = [
  kind("ours", "Ours", { routesTo: "brand_property", stance: "ours" }),
  kind("backlink", "Backlink"),
  kind("mention", "Mentions us", { hasSentiment: true }),
  kind("press_mention", "Press coverage", { fact: "press_mention" }),
  kind("review_site", "Review site"),
  kind("former_account", "Former", { usage: "match_only", stance: "ours" }),
  kind("broken_link", "Broken link", { usage: "match_only", stance: "ours" }),
  kind("maybe", "Maybe", { usage: "undecided" }),
  kind("competitor", "Competitor", { routesTo: "competitor", stance: "competitor" }),
  kind("founder", "Founder / owner", { routesTo: "owns", stance: "associated" }),
  kind("not_us", "Not us", { routesTo: "exclusion", stance: "not_us" }),
  kind("namesake", "Namesake", { routesTo: "exclusion", stance: "not_us" }),
];

const result = (n: number): EvidenceItem => ({
  key: `web_page:site${n}.example/page-${n}`,
  field: n % 5 === 0 ? "mention" : n % 7 === 0 ? "listing" : "web_page",
  value: `https://site${n}.example/page-${n}`,
  label: `Result ${n}`,
  image_url: null,
  url: `https://site${n}.example/page-${n}`,
  platform: null,
  handle: `site${n}.example`,
  followers: null,
  verified: null,
  profile_id: null,
  source: { node: "web", kind: "web_search", url: null, where: "web search" },
  confidence: 0.6,
});

let brand = { id: "b1", organization_id: "org-brand", name: "Ritual", version: 3, profile: {} } as unknown as MarketingBrand;

function makeSaver(statuses: Record<string, WebSaveStatus>, failures: string[]) {
  return new WebDecisionSaver({
    kinds: () => KINDS,
    suggest: () => ({ foundAccounts: [], ourHandles: [], ourHosts: [], ourAccounts: [], name: "Ritual", place: null }),
    persist: (item, answer, opts) =>
      persistAnswer({ organizationId: brand.organization_id, getBrand: () => brand, setBrand: (b) => void (brand = b), kinds: KINDS }, item, answer, opts),
    retract: async () => undefined,
    onStatus: (key, s) => void (statuses[key] = s),
    onFailed: (item, _label, error) => void failures.push(`${item.key}: ${String((error as Error)?.message ?? error)}`),
  });
}

beforeEach(() => {
  tables.discovered_item.length = 0;
  tables.brand_exclusion.length = 0;
  tables.site.length = 0;
  nextCreated = {};
  (undoPromotion as jest.Mock).mockClear();
  (deleteSite as jest.Mock).mockClear();
  promoted.length = 0;
  linked.length = 0;
});

describe("Enrich web decisions reach the brand", () => {
  it("answerForWebChoice: Ours and Not us are their own answers; everything else is Related with its key", () => {
    expect(answerForWebChoice(KINDS[0])).toEqual({ answer: "ours", relationKey: null });
    expect(answerForWebChoice(KINDS[10])).toEqual({ answer: "not_us", relationKey: null });
    expect(answerForWebChoice(KINDS[1])).toEqual({ answer: "related", relationKey: "backlink" });
    expect(answerForWebChoice(KINDS[11])).toEqual({ answer: "related", relationKey: "namesake" });
  });

  it("40 decisions — re-answered, cleared and given again — are all persisted, survive a reload and are listed on the brand", async () => {
    const statuses: Record<string, WebSaveStatus> = {};
    const failures: string[] = [];
    const saver = makeSaver(statuses, failures);
    const items = Array.from({ length: 40 }, (_, i) => result(i + 1));
    const choices: Record<string, WebChoice> = {};
    // The person answers every result, the way the review row does (one decide per answer, no waiting).
    items.forEach((item, i) => {
      const k = KINDS[i % KINDS.length];
      choices[item.key] = { kind: k.key, sentiment: k.hasSentiment ? "positive" : null };
      void saver.decide(item, choices[item.key]);
    });
    // Second thoughts on six of them: a different answer replaces the first (its exclusion / site is taken back).
    for (const i of [0, 3, 10, 11, 20, 33]) {
      choices[items[i].key] = { kind: "backlink", sentiment: null };
      void saver.decide(items[i], choices[items[i].key]);
    }
    // One cleared, then answered again — the row comes back, never a duplicate-key failure.
    void saver.decide(items[5], null);
    choices[items[5].key] = { kind: "maybe", sentiment: null };
    void saver.decide(items[5], choices[items[5].key]);
    // A Founder page gets its name typed after the answer; Apply's flush makes the person.
    const founderAt = items.findIndex((it) => choices[it.key].kind === "founder");
    const flushed = await saver.flush(items, choices, (key) => (key === items[founderAt].key ? "Jeremy Tooker" : ""));

    expect(failures).toEqual([]);
    expect(flushed.failed).toEqual([]);
    expect(flushed.saved).toHaveLength(40);
    // Every decision is a live row with the person's final answer.
    const live = tables.discovered_item.filter((r) => r.deleted_at === null && r.relation_key);
    expect(live).toHaveLength(40);
    for (const item of items) {
      const row = live.find((r) => (r.context as Record<string, unknown>).evidence_key === item.key);
      const want = answerForWebChoice(KINDS.find((k) => k.key === choices[item.key].kind) as BrandRelationKind);
      expect(row?.relation_key).toBe(want.relationKey ?? want.answer);
    }
    // A mention keeps its tone; the founder is linked once, with the typed name.
    expect(live.some((r) => r.relation_key === "mention" && r.sentiment === "positive")).toBe(true);
    expect(linked).toEqual(["Jeremy Tooker"]);
    // Re-answered Not us / Namesake rows left the NO LIST; the ones still Not us are on it.
    const stillExcluded = items.filter((it) => ["not_us", "namesake"].includes(choices[it.key].kind)).length;
    expect(tables.brand_exclusion.filter((r) => r.deleted_at === null)).toHaveLength(stillExcluded);
    // The server's promotion ran for the answers that land somewhere.
    expect(promoted.length).toBeGreaterThan(0);

    // A reload: the brand's saved rows answer the same results again.
    const saved = await listBrandWebDecisions("b1");
    expect(saved).toHaveLength(40);
    const restored = matchSavedWebDecisions(items, saved);
    expect(Object.keys(restored)).toHaveLength(40);
    for (const item of items) {
      const want = answerForWebChoice(KINDS.find((k) => k.key === choices[item.key].kind) as BrandRelationKind);
      expect(restored[item.key].kind).toBe(want.relationKey ?? want.answer);
    }
    // The enrich summary counts every one.
    expect(webDecisionCounts(Object.values(choices), KINDS).total).toBe(40);
  });

  it("the Apply summary states the true saved total, not only this visit's pages", () => {
    const visit = [{ kind: "ours", sentiment: null }, { kind: "ours", sentiment: null }] as WebChoice[];
    const saved = [
      ...Array.from({ length: 21 }, () => ({ relationKey: "ours", mark: null })),
      { relationKey: "", mark: "later" as const },
      { relationKey: "", mark: "ignored" as const },
    ];
    const s = webDecisionSummary(visit, saved, KINDS);
    expect(s.total).toBe(23);
    expect(s.thisVisit).toBe(2);
    expect(s.tail).toBe("saved on this brand, 2 answered this visit");
    expect(s.parts).toEqual([{ label: "Ours", count: 21 }, { label: "Ask me later", count: 1 }, { label: "Ignored", count: 1 }]);
    // Until the saved rows are read, the visit's own count is shown and says so.
    expect(webDecisionSummary(visit, null, KINDS)).toMatchObject({ total: 2, tail: "decided this visit" });
  });

  it("only Ask me later / Ignore decisions still count: the summary row shows them", () => {
    const onlyMarks = webDecisionSummary([], null, KINDS, 3);
    expect(onlyMarks.total).toBe(3);
    const saved = [{ relationKey: "", mark: "later" as const }, { relationKey: "", mark: "later" as const }, { relationKey: "", mark: "ignored" as const }];
    const s = webDecisionSummary([], saved, KINDS, 3);
    expect(s.total).toBe(3);
    expect(s.thisVisit).toBe(3);
    expect(s.parts).toEqual([{ label: "Ask me later", count: 2 }, { label: "Ignored", count: 1 }]);
  });

  it("a save that fails is reported and retried on flush, never swallowed", async () => {
    const statuses: Record<string, WebSaveStatus> = {};
    const failures: string[] = [];
    let fail = true;
    const saver = new WebDecisionSaver({
      kinds: () => KINDS,
      suggest: () => ({ foundAccounts: [], ourHandles: [], ourHosts: [], ourAccounts: [], name: "Ritual", place: null }),
      persist: async (item, answer, opts) => {
        if (fail) throw new Error("permission denied for table discovered_item");
        return persistAnswer({ organizationId: "org-brand", getBrand: () => brand, setBrand: (b) => void (brand = b), kinds: KINDS }, item, answer, opts);
      },
      retract: async () => undefined,
      onStatus: (key, s) => void (statuses[key] = s),
      onFailed: (item, _label, error) => void failures.push(`${item.key}: ${(error as Error).message}`),
    });
    const item = result(1);
    await saver.decide(item, { kind: "backlink", sentiment: null });
    expect(statuses[item.key]).toEqual({ state: "failed", error: "permission denied for table discovered_item" });
    expect(failures).toHaveLength(1);
    fail = false;
    const flushed = await saver.flush([item], { [item.key]: { kind: "backlink", sentiment: null } }, () => "");
    expect(flushed).toEqual({ saved: [item.key], failed: [] });
    expect(tables.discovered_item.filter((r) => r.relation_key === "backlink")).toHaveLength(1);
  });
});

// ── Gaps closed after the first walk: a changed answer undoes what the old one created; Ask me later / Ignore are saved ──

/** A second visit: a fresh saver (nothing held in memory) that only knows the brand's saved rows. */
function reopenedSaver(statuses: Record<string, WebSaveStatus>, failures: string[]) {
  return makeSaverWithRetract(statuses, failures);
}

function makeSaverWithRetract(statuses: Record<string, WebSaveStatus>, failures: string[]) {
  // The REAL retract (validate/savedAnswers.ts) over the same in-memory rows.
  const { retractSavedAnswer } = jest.requireActual("../validate/savedAnswers") as typeof import("../validate/savedAnswers");
  return new WebDecisionSaver({
    kinds: () => KINDS,
    suggest: () => ({ foundAccounts: [], ourHandles: [], ourHosts: [], ourAccounts: [], name: "Ritual", place: null }),
    persist: (item, answer, opts) =>
      persistAnswer({ organizationId: brand.organization_id, getBrand: () => brand, setBrand: (b) => void (brand = b), kinds: KINDS }, item, answer, opts),
    retract: async (key) => void (await retractSavedAnswer("b1", KINDS, { evidenceKey: key })),
    onStatus: (key, s) => void (statuses[key] = s),
    onFailed: (item, _label, error) => void failures.push(`${item.key}: ${String((error as Error)?.message ?? error)}`),
  });
}

describe("changing an answer takes back what it created", () => {
  it("this visit: Backlink -> Mentions us removes the backlink row the first answer created", async () => {
    const failures: string[] = [];
    const saver = makeSaverWithRetract({}, failures);
    const item = result(2);
    nextCreated = { backlink: ["bl-1"] };
    await saver.decide(item, { kind: "backlink", sentiment: null });
    await saver.decide(item, { kind: "mention", sentiment: "positive" });
    expect(failures).toEqual([]);
    expect((undoPromotion as jest.Mock).mock.calls.some(([ids]) => ids.backlink?.includes("bl-1"))).toBe(true);
  });

  it("a LATER visit: the created ids were kept on the answer's row, so a restored answer changed there undoes them too", async () => {
    const failures: string[] = [];
    const item = result(3);
    // Visit 1: the answer creates a backlink and a competitor row.
    nextCreated = { backlink: ["bl-9"], competitor: ["comp-4"] };
    await makeSaverWithRetract({}, failures).decide(item, { kind: "backlink", sentiment: null });
    const row = tables.discovered_item.find((r) => r.relation_key === "backlink") as Row;
    expect(((row.context as { answer: { promoted: Record<string, string[]> } }).answer.promoted)).toEqual({ backlink: ["bl-9"], competitor: ["comp-4"] });
    (undoPromotion as jest.Mock).mockClear();
    // Visit 2: nothing in memory; the answer comes back from the saved row, and is then changed.
    const saved = await listBrandWebDecisions("b1");
    const saver = reopenedSaver({}, failures);
    saver.markRestored(item.key, { choice: matchSavedWebDecisions([item], saved)[item.key] });
    await saver.decide(item, { kind: "not_us", sentiment: null });
    expect(failures).toEqual([]);
    const undone = (undoPromotion as jest.Mock).mock.calls.map(([ids]) => ids);
    expect(undone.some((ids) => ids.backlink?.includes("bl-9") && ids.competitor?.includes("comp-4"))).toBe(true);
    const after = tables.discovered_item.find((r) => r.relation_key === "not_us") as Row;
    expect(after).toBeTruthy();
    expect((after.context as { answer: { promoted?: unknown } }).answer.promoted).toBeUndefined();
  });

  it("clearing a restored answer undoes it and leaves the finding undecided", async () => {
    const failures: string[] = [];
    const item = result(4);
    nextCreated = { backlink: ["bl-2"] };
    await makeSaverWithRetract({}, failures).decide(item, { kind: "backlink", sentiment: null });
    (undoPromotion as jest.Mock).mockClear();
    const saver = reopenedSaver({}, failures);
    saver.markRestored(item.key, { choice: { kind: "backlink", sentiment: null } });
    await saver.decide(item, null);
    expect((undoPromotion as jest.Mock).mock.calls.some(([ids]) => ids.backlink?.includes("bl-2"))).toBe(true);
    const row = tables.discovered_item.find((r) => (r.context as { evidence_key?: string }).evidence_key === item.key) as Row;
    expect(row.status).toBe("pending");
    expect(row.relation_key).toBeNull();
    expect((await listBrandWebDecisions("b1")).filter((r) => r.relationKey)).toHaveLength(0);
  });

  it("a website the brand already tracked (a person's) is never deleted when the answer is changed; one the answer made is", async () => {
    const failures: string[] = [];
    // The person added item 6's site by hand before; item 7's site did not exist.
    tables.site.push({ id: "site-1", brand_id: "b1", domain: "site6.example", deleted_at: null });
    // A site's own root page is what "Ours" adds as a website.
    const root = (n: number): EvidenceItem => ({ ...result(n), key: `web_page:site${n}.example`, value: `https://site${n}.example`, url: `https://site${n}.example` });
    const mine = root(6);
    const fresh = root(7);
    const saver = makeSaverWithRetract({}, failures);
    await saver.decide(mine, { kind: "ours", sentiment: null });
    await saver.decide(fresh, { kind: "ours", sentiment: null });
    await saver.decide(mine, { kind: "backlink", sentiment: null });
    expect(deleteSite).not.toHaveBeenCalled();
    await saver.decide(fresh, { kind: "backlink", sentiment: null });
    expect(deleteSite).toHaveBeenCalledTimes(1);
    expect(failures).toEqual([]);
  });
});

describe("Ask me later and Ignore are decisions too", () => {
  it("are saved on the finding's row, listed on the brand, restored on reopen, and changeable", async () => {
    const failures: string[] = [];
    const later = result(11);
    const ignored = result(12);
    const answered = result(13);
    const saver = makeSaverWithRetract({}, failures);
    await saver.decide(later, null, "", "later");
    await saver.decide(ignored, null, "", "ignored");
    await saver.decide(answered, { kind: "backlink", sentiment: null });
    expect(failures).toEqual([]);
    const rowOf = (it: EvidenceItem) => tables.discovered_item.find((r) => (r.context as { evidence_key?: string }).evidence_key === it.key) as Row;
    expect(rowOf(later).status).toBe("pending");
    expect((rowOf(later).context as { answer: { answer: string } }).answer.answer).toBe("later");
    expect(rowOf(later).reviewed_at).toBeTruthy();
    expect(rowOf(ignored).status).toBe("dismissed");

    // Listed on the brand's On the web tab beside the answered one.
    const saved = await listBrandWebDecisions("b1");
    expect(saved.map((r) => [r.label, r.mark]).sort()).toEqual([["Result 11", "later"], ["Result 12", "ignored"], ["Result 13", null]]);
    // A reopened review shows them again: marks as marks, the answer as an answer.
    expect(matchSavedWebMarks([later, ignored, answered], saved)).toEqual({ [later.key]: "later", [ignored.key]: "ignored" });
    expect(Object.keys(matchSavedWebDecisions([later, ignored, answered], saved))).toEqual([answered.key]);

    // On the next visit: Ask me later changed to an answer, Ignore cleared.
    const next = reopenedSaver({}, failures);
    next.markRestored(later.key, { mark: "later" });
    next.markRestored(ignored.key, { mark: "ignored" });
    await next.decide(later, { kind: "mention", sentiment: "neutral" });
    await next.decide(ignored, null);
    expect(failures).toEqual([]);
    const after = await listBrandWebDecisions("b1");
    expect(after.find((r) => r.label === "Result 11")).toMatchObject({ relationKey: "mention", mark: null });
    expect(after.find((r) => r.label === "Result 12")).toBeUndefined();
  });

  it("a mark that failed to save is retried by Apply's flush", async () => {
    const failures: string[] = [];
    const item = result(14);
    let fail = true;
    const saver = new WebDecisionSaver({
      kinds: () => KINDS,
      suggest: () => ({ foundAccounts: [], ourHandles: [], ourHosts: [], ourAccounts: [], name: "Ritual", place: null }),
      persist: async (focus, answer, opts) => {
        if (fail) throw new Error("offline");
        return persistAnswer({ organizationId: "org-brand", getBrand: () => brand, setBrand: (b) => void (brand = b), kinds: KINDS }, focus, answer, opts);
      },
      retract: async () => undefined,
      onStatus: () => undefined,
      onFailed: (_i, _l, error) => void failures.push((error as Error).message),
    });
    await saver.decide(item, null, "", "later");
    expect(failures).toEqual(["offline"]);
    fail = false;
    const flushed = await saver.flush([item], {}, () => "", { [item.key]: "later" });
    expect(flushed).toEqual({ saved: [item.key], failed: [] });
    expect(tables.discovered_item).toHaveLength(1);
  });
});
