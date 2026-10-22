/**
 * The brand's own accounts and websites no person confirmed get a place to be confirmed (2026-10-22). 70 of 71 brands
 * made through Smart Add held web.property / web.site rows nobody said were theirs (Titanium Success b640e26f: six
 * accounts and its website). The validation page dropped every card whose account or host the brand already knows, so
 * there was NO place to confirm them and research condition 1 ("we know which brand is theirs") could never pass.
 * They are now ordinary cards, answered through the ONE writer (persistAnswer) naming the existing home.
 */
type Row = Record<string, unknown> & { id: string };
const inserted: { table: string; row: Row }[] = [];
let nextId = 1;
let selectRows: Record<string, unknown[]> = {};

function builder(table: string, payload?: Record<string, unknown>) {
  const b: Record<string, unknown> = {};
  for (const m of ["eq", "in", "is", "not", "order", "limit", "neq"]) b[m] = () => b;
  b.select = () => b;
  b.single = async () => {
    const row = { id: `row-${nextId++}`, ...(payload ?? {}) };
    inserted.push({ table, row });
    return { data: { id: row.id }, error: null };
  };
  b.maybeSingle = async () => (payload ? (b.single as () => Promise<unknown>)() : { data: null, error: null });
  b.then = (resolve: (v: unknown) => void) => resolve({ data: selectRows[table] ?? [], error: null });
  return b;
}

const service = {
  createProperty: jest.fn(),
  createSite: jest.fn(),
  deleteProperty: jest.fn(),
  deleteSite: jest.fn(),
  deleteBrandAsset: jest.fn(),
  deleteBusinessFact: jest.fn(),
  getBrand: jest.fn(),
  updateBrand: jest.fn(),
};
const retraction = {
  applyRetraction: jest.fn(async (type: string, id: string) => ({ root: { type, id }, applied: true, at: "t" })),
  restoreRetraction: jest.fn(async () => ({})),
  withdrawSite: jest.fn(),
};
const promote = jest.fn();
const associationsAdd = jest.fn(async (link: unknown) => ({ ok: true, link }));

jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
jest.mock("@/utils/supabase/webDb", () => ({
  signedInPersonId: async () => "person-1",
  authenticatedWebDb: async () => ({
    from: (table: string) => ({
      select: () => builder(table),
      insert: (p: Record<string, unknown>) => builder(table, p),
      update: (p: Record<string, unknown>) => builder(`${table}:update`, p),
    }),
  }),
}));
jest.mock("@/features/marketing/data/service", () => service);
jest.mock("@/features/marketing/data/retraction", () => retraction);
jest.mock("@/lib/workflows/system-runs", () => ({ startSystemRun: jest.fn() }));
jest.mock("@/features/scopes/service/associationsService", () => ({ associationsService: { add: (a: unknown) => associationsAdd(a), remove: jest.fn() } }));
jest.mock("@/lib/redux/store-singleton", () => ({ getStoreSingleton: jest.fn() }));
jest.mock("../siteOwnershipLive", () => ({ liveSiteClaimDeps: jest.fn() }));
jest.mock("../promote", () => ({
  PROMOTED_TYPES: [],
  promoteSmartAddFindings: (...a: unknown[]) => promote(...a),
  promotedHomes: () => [],
  undoPromotion: jest.fn(),
}));

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { persistAnswer, type PersistContext } from "../validate/persist";
import { unconfirmedHomes, type ConfirmedRow } from "../validate/unconfirmed";
import { foldQueue, type KnownOnBrand } from "../validate/fold";
import { focusFromEvidence, type FocusItem } from "../validate/queue";
import { loadSavedAnswers } from "../validate/savedAnswers";
import type { MarketingBrand } from "@/features/marketing/types";

const ctx = { organizationId: "org-1", getBrand: () => ({ id: "brand-1" }), setBrand: jest.fn(), kinds: [] } as unknown as PersistContext;
const suggest = { ourHosts: [], ourAccounts: [], name: null };

// Titanium Success, as it is live (property ids shortened).
const properties = [
  { id: "fb", kind: "facebook", url: "https://www.facebook.com/titaniumsuccess", handle: "titaniumsuccess", status: "active" },
  { id: "x", kind: "x", url: "https://twitter.com/titaniumsuccess", handle: "titaniumsuccess", status: "active" },
  { id: "ig", kind: "instagram", url: "https://www.instagram.com/titaniumsuccess", handle: "titaniumsuccess", status: "active" },
  { id: "yt", kind: "youtube", url: "https://www.youtube.com/channel/UCe1MtHokWdU3euNCDvTp9eA", handle: "UCe1MtHokWdU3euNCDvTp9eA", status: "active" },
  { id: "ig2", kind: "instagram", url: "https://www.instagram.com/titanium.success/", handle: "titanium.success", status: "active" },
  { id: "yt2", kind: "youtube", url: "http://www.youtube.com/@Titaniumsuccess", handle: "Titaniumsuccess", status: "active" },
  { id: "web", kind: "website", url: "http://titaniumsuccess.com/", handle: null, status: "active" },
];
const sites = [{ id: "site-1", root_url: "http://titaniumsuccess.com/", domain: "titaniumsuccess.com" }];

beforeEach(() => {
  inserted.length = 0;
  selectRows = {};
  jest.clearAllMocks();
});

describe("which homes are unconfirmed", () => {
  it("every active account and website with no person's answer is one card, keyed as the identify workflow keys it", () => {
    const homes = unconfirmedHomes({ properties, sites, confirmed: [] });
    expect(homes.map((h) => [h.item.key, h.propertyId ?? null, h.siteId ?? null])).toEqual([
      ["website:titaniumsuccess.com", "web", "site-1"],
      ["social:facebook:titaniumsuccess", "fb", null],
      ["social:x:titaniumsuccess", "x", null],
      ["social:instagram:titaniumsuccess", "ig", null],
      ["social:youtube:uce1mthokwdu3euncdvtp9ea", "yt", null],
      ["social:instagram:titanium.success", "ig2", null],
      ["social:youtube:titaniumsuccess", "yt2", null],
    ]);
    // A real question, never a typed value (buildQueue drops `typed`).
    expect(homes.every((h) => h.item.source.kind !== "typed")).toBe(true);
  });

  it("a home a person's answer names is not asked again (the server's person_validated_properties rule)", () => {
    const confirmed: ConfirmedRow[] = [
      { category: "social", guessed_kind: "facebook", url: null, site_id: null, relation_key: "ours", resolved_property_id: "fb", context: {} },
      { category: "link", guessed_kind: "website", url: null, site_id: null, relation_key: "ours", resolved_property_id: null, context: { answer: { homes: ["web.site:site-1"] } } },
      // Not an identity claim: a relation that is not "ours" leaves the account unconfirmed.
      { category: "social", guessed_kind: "x", url: null, site_id: null, relation_key: "fan_page", resolved_property_id: "x", context: {} },
    ];
    const keys = unconfirmedHomes({ properties, sites, confirmed }).map((h) => h.item.key);
    expect(keys).not.toContain("social:facebook:titaniumsuccess");
    expect(keys).not.toContain("website:titaniumsuccess.com");
    expect(keys).toContain("social:x:titaniumsuccess");
  });
});

describe("the validate page asks them", () => {
  const known: KnownOnBrand = {
    names: ["Titanium Success"],
    hosts: ["http://titaniumsuccess.com/", "titaniumsuccess.com"],
    urls: properties.map((p) => p.url as string),
    values: [],
    accounts: properties.filter((p) => p.handle).map((p) => `${p.kind}:${p.handle}`),
  };
  const cards = () =>
    unconfirmedHomes({ properties, sites, confirmed: [] })
      .map((h) => focusFromEvidence(h.item, [], suggest))
      .filter((f): f is FocusItem => Boolean(f));

  it("drops what the brand knows, but never an unconfirmed home of its own", () => {
    const q = cards();
    expect(foldQueue({ queue: q, known, later: [] })).toHaveLength(0);
    const asked = foldQueue({ queue: q, known, later: [], unconfirmed: new Set(q.map((c) => c.key)) });
    expect(asked.map((c) => c.kind).sort()).toEqual(["account", "account", "account", "account", "account", "account", "website"]);
  });

  it("the page loads them and answers them naming the existing home", () => {
    const page = readFileSync(join(__dirname, "..", "validate", "SmartAddValidate.tsx"), "utf8");
    expect(page).toMatch(/foldQueue\(\{[^}]*unconfirmed: new Set\(homeOf\.keys\(\)\)/);
    expect(page).toMatch(/created: \{ propertyId: home\.propertyId, siteId: home\.siteId, existing: true \}/);
    const saved = readFileSync(join(__dirname, "..", "validate", "fromSaved.ts"), "utf8");
    expect(saved).toMatch(/unconfirmedHomes\(\{/);
  });
});

describe("answering one", () => {
  const [website, facebook] = unconfirmedHomes({ properties, sites, confirmed: [] });
  const fbCard = focusFromEvidence(facebook.item, [], suggest) as FocusItem;
  const webCard = focusFromEvidence(website.item, [], suggest) as FocusItem;

  it("Yes is the person's answer naming the existing account (person evidence), and Undo never takes the account", async () => {
    const saved = await persistAnswer(ctx, fbCard, "ours", { created: { propertyId: "fb", existing: true } });
    const row = inserted.find((i) => i.table === "discovered_item")?.row as Row & { context: { answer: Record<string, unknown> } };
    expect(row).toMatchObject({ status: "confirmed", relation_key: "ours", reviewed_by: "person-1", resolved_property_id: "fb", category: "social" });
    expect(row.context.answer).toMatchObject({ answer: "ours", from: "smart_add.validate", homes: ["web.property:fb"], kept: ["web.property:fb"] });
    expect(service.createProperty).not.toHaveBeenCalled();
    expect(promote).not.toHaveBeenCalled();
    // A home that predates the answer is never retracted by its Undo.
    expect(saved.retraction).toBeUndefined();
    await saved.undo();
    expect(service.deleteProperty).not.toHaveBeenCalled();
    expect(retraction.withdrawSite).not.toHaveBeenCalled();
  });

  it("Yes on the website names its existing site (what person_confirmed_site_hosts reads)", async () => {
    const saved = await persistAnswer(ctx, webCard, "ours", { created: { propertyId: "web", siteId: "site-1", existing: true } });
    const row = inserted.find((i) => i.table === "discovered_item")?.row as Row & { context: { answer: Record<string, unknown> } };
    expect(row).toMatchObject({ category: "link", guessed_kind: "website", status: "confirmed", reviewed_by: "person-1" });
    expect(row.context.answer).toMatchObject({ homes: ["web.site:site-1"], kept: ["web.site:site-1"] });
    expect(service.createSite).not.toHaveBeenCalled();
    expect(saved.retraction).toBeUndefined();
  });

  it("Not us withdraws the existing home through the retraction, and Undo restores exactly that", async () => {
    const saved = await persistAnswer(ctx, webCard, "not_us", { created: { propertyId: "web", siteId: "site-1", existing: true } });
    expect(retraction.applyRetraction).toHaveBeenCalledWith("site", "site-1", false);
    expect(retraction.applyRetraction).toHaveBeenCalledWith("property", "web", false);
    const row = inserted.find((i) => i.table === "discovered_item")?.row as Row & { context: { answer: { before: { retractions: unknown[] } } } };
    expect(row).toMatchObject({ status: "dismissed", relation_key: "not_us", reviewed_by: "person-1" });
    expect(row.context.answer.before.retractions).toHaveLength(2);
    expect(inserted.some((i) => i.table === "brand_exclusion")).toBe(true);
    await saved.undo();
    expect(retraction.restoreRetraction).toHaveBeenCalledTimes(2);
  });

  it("a later visit's Undo keeps the home too (savedAnswers reads context.answer.kept)", async () => {
    selectRows.discovered_item = [
      {
        id: "d1",
        category: "social",
        guessed_kind: "facebook",
        url: "https://www.facebook.com/titaniumsuccess",
        value: { text: "https://www.facebook.com/titaniumsuccess", handle: "titaniumsuccess" },
        context: { evidence_key: "social:facebook:titaniumsuccess", answer: { answer: "ours", from: "smart_add.validate", homes: ["web.property:fb"], kept: ["web.property:fb"], before: {} } },
        confidence: 1,
        status: "confirmed",
        relation_key: "ours",
        reviewed_at: "t",
        resolved_property_id: "fb",
      },
    ];
    const past = await loadSavedAnswers({ id: "brand-1" } as MarketingBrand, [], suggest);
    expect(past.entries).toHaveLength(1);
    expect(past.entries[0].persisted.retraction).toBeUndefined();
    await past.entries[0].persisted.undo();
    expect(service.deleteProperty).not.toHaveBeenCalled();
  });
});
