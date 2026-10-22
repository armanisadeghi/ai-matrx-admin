/**
 * Create's Yes is person evidence (2026-10-22, brand e641a6d5 "Bare Chiropractic"): the owner said Yes to the website and
 * to Facebook / Instagram / LinkedIn / YouTube at Create, Create wrote the property and site rows, and research still read
 * "0 website, 0 accounts confirmed by a person" — no finding row named a person. Create now records each Yes through
 * the validation page's ONE confirm path (persistAnswer `created`), naming the home Create made and writing no second
 * home. aidream `research/verified_identity.py` person_validated_properties reads exactly these columns.
 */
type Row = Record<string, unknown> & { id: string };
const inserted: Row[] = [];
let nextId = 1;

function builder(op: "select" | "insert", payload?: Record<string, unknown>) {
  const b: Record<string, unknown> = {};
  for (const m of ["eq", "in", "is", "not", "order", "limit"]) b[m] = () => b;
  b.select = () => b;
  b.maybeSingle = async () => ({ data: null, error: null });
  b.single = async () => {
    const row = { id: `row-${nextId++}`, ...(payload ?? {}) };
    inserted.push(row);
    return { data: { id: row.id }, error: null };
  };
  b.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null });
  void op;
  return b;
}

const service = { createProperty: jest.fn(), createSite: jest.fn(), deleteProperty: jest.fn(), deleteSite: jest.fn() };
const startSystemRun = jest.fn();
const promote = jest.fn();
const associationsAdd = jest.fn(async (link: unknown) => ({ ok: true, link }));

jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
jest.mock("@/utils/supabase/webDb", () => ({
  signedInPersonId: async () => "person-1",
  authenticatedWebDb: async () => ({
    from: () => ({
      select: () => builder("select"),
      insert: (p: Record<string, unknown>) => builder("insert", p),
      update: () => builder("select"),
    }),
  }),
}));
jest.mock("@/features/marketing/data/service", () => service);
jest.mock("@/lib/workflows/system-runs", () => ({ startSystemRun: (...a: unknown[]) => startSystemRun(...a) }));
jest.mock("@/features/scopes/service/associationsService", () => ({ associationsService: { add: (a: unknown) => associationsAdd(a) } }));
jest.mock("@/lib/redux/store-singleton", () => ({ getStoreSingleton: jest.fn() }));
jest.mock("../siteOwnershipLive", () => ({ liveSiteClaimDeps: jest.fn() }));
jest.mock("../promote", () => ({
  promoteSmartAddFindings: (...a: unknown[]) => promote(...a),
  promotedHomes: () => [],
  undoPromotion: jest.fn(),
}));

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PersistContext } from "../validate/persist";
import { createdAnswers, recordCreateAnswers, recordedWebKeys } from "../createAnswers";
import type { EvidenceItem } from "../evidence";

const ctx = { organizationId: "org-1", getBrand: () => ({ id: "brand-1" }), setBrand: jest.fn(), kinds: [] } as unknown as PersistContext;
const suggest = { ourHosts: [], ourAccounts: [], name: null };

function ev(over: Partial<EvidenceItem>): EvidenceItem {
  return {
    key: "k",
    field: "social",
    value: "",
    url: null,
    handle: null,
    platform: null,
    label: null,
    image_url: null,
    profile_id: null,
    followers: null,
    confidence: 0.9,
    source: { kind: "web", where: "web result", url: null, node: "web" },
    ...over,
  } as unknown as EvidenceItem;
}

const facebook = ev({ key: "facebook:barechiropractic", field: "social", platform: "facebook", handle: "BareChiropractic", url: "https://www.facebook.com/BareChiropractic", value: "https://www.facebook.com/BareChiropractic" });
const site = ev({ key: "website:barechiropractic.com", field: "website", value: "https://barechiropractic.com/", url: "https://barechiropractic.com/" });

beforeEach(() => {
  inserted.length = 0;
  jest.clearAllMocks();
});

it("lists each Yes Create made a home for: the account's property, the website's site by host", () => {
  const plan = createdAnswers({
    accounts: [{ item: facebook, propertyId: "prop-fb" }],
    sites: [{ url: "https://barechiropractic.com/", siteId: "site-1" }, { url: "https://pxdocs.com/", siteId: "site-web-result" }],
    websites: [site],
  });
  expect(plan).toEqual([
    { item: facebook, created: { propertyId: "prop-fb" } },
    { item: site, created: { siteId: "site-1" } },
  ]);
});

it("records each Yes as the person's confirmed answer naming Create's home, and writes no second home", async () => {
  const problems = await recordCreateAnswers(
    ctx,
    [{ item: facebook, created: { propertyId: "prop-fb" } }, { item: site, created: { siteId: "site-1" } }],
    [],
    suggest,
  );
  expect(problems).toEqual([]);
  expect(inserted).toHaveLength(2);
  const [acct, web] = inserted as unknown as Array<Record<string, unknown> & { context: { answer: Record<string, unknown> } }>;
  // What person_validated_properties reads: confirmed, relation ours, reviewed_by a person, the property linked.
  expect(acct).toMatchObject({ organization_id: "org-1", brand_id: "brand-1", category: "social", status: "confirmed", relation_key: "ours", reviewed_by: "person-1", resolved_property_id: "prop-fb" });
  expect(acct.context.answer).toMatchObject({ answer: "ours", by: "person", from: "smart_add.create", homes: ["web.property:prop-fb"] });
  // The website: a confirmed link finding of kind website whose answer names the site (person_confirmed_site_hosts).
  expect(web).toMatchObject({ category: "link", guessed_kind: "website", url: "https://barechiropractic.com/", status: "confirmed", relation_key: "ours", reviewed_by: "person-1" });
  expect(web.context.answer).toMatchObject({ from: "smart_add.create", homes: ["web.site:site-1"] });
  // The decision caused the site (the retraction reads this edge to take it back on a later undo).
  expect(associationsAdd).toHaveBeenCalledWith(expect.objectContaining({ sourceType: "web_discovered_item", targetType: "web_site", targetId: "site-1", role: "caused" }));
  // Never a second home, a second ingest, or a per-answer promotion: Create made them and promotes once.
  expect(service.createProperty).not.toHaveBeenCalled();
  expect(service.createSite).not.toHaveBeenCalled();
  expect(startSystemRun).not.toHaveBeenCalled();
  expect(promote).not.toHaveBeenCalled();
});

it("Create records its Yes answers (SmartAddBrand wires createdAnswers into recordCreateAnswers)", () => {
  const src = readFileSync(join(__dirname, "..", "SmartAddBrand.tsx"), "utf8");
  const create = src.slice(src.indexOf("const create = async () =>"));
  expect(create).toMatch(/const createPlan = createdAnswers\(\{[^]*?accounts: madeAccounts,[^]*?sites: madeSites,/);
  expect(create).toMatch(/recordCreateAnswers\(\s*\{[^]*?\},\s*createPlan,/);
  expect(create).toMatch(/madeAccounts\.push\(\{ item, propertyId: row\.id \}\)/);
  expect(create).toMatch(/madeSites\.push\(\{ url, siteId: claim\.site\.id \}\)/);
});

// A web result answered "Ours" at Create that became a site (pxdocs.com on e641a6d5) kept only routeWebChoices' row:
// category link, kind web_page, no site named — so its site was never person-validated. It now goes the same path.
const pxdocs = ev({ key: "web:pxdocs.com", field: "web_page", value: "https://pxdocs.com", url: "https://pxdocs.com", label: "PX Docs" });
const pxPage = ev({ key: "web:pxdocs.com/about", field: "web_page", value: "https://pxdocs.com/about", url: "https://pxdocs.com/about" });

it("a web result answered Ours whose site Create claimed is recorded naming that site, and kept out of routeWebChoices", async () => {
  const plan = createdAnswers({
    accounts: [],
    sites: [{ url: "https://pxdocs.com", siteId: "site-px" }],
    websites: [],
    webOurs: [pxdocs, pxPage],
  });
  // Only the site's own root page made the site; a deeper page is not the site (routeWebChoices keeps it).
  expect(plan).toEqual([{ item: pxdocs, created: { siteId: "site-px" } }]);
  expect([...recordedWebKeys(plan, [pxdocs, pxPage])]).toEqual(["web:pxdocs.com"]);
  expect(await recordCreateAnswers(ctx, plan, [], suggest)).toEqual([]);
  const [row] = inserted as unknown as Array<Record<string, unknown> & { context: { answer: Record<string, unknown> } }>;
  // person_confirmed_site_hosts: a confirmed link finding by a person whose answer's homes name the site.
  expect(row).toMatchObject({ category: "link", status: "confirmed", relation_key: "ours", reviewed_by: "person-1" });
  expect(row.context.answer).toMatchObject({ from: "smart_add.create", homes: ["web.site:site-px"] });
  expect(associationsAdd).toHaveBeenCalledWith(expect.objectContaining({ sourceType: "web_discovered_item", targetType: "web_site", targetId: "site-px", role: "caused" }));
  expect(service.createSite).not.toHaveBeenCalled();
});

it("Create passes its web Ours results to the plan and keeps the recorded ones out of routeWebChoices", () => {
  const src = readFileSync(join(__dirname, "..", "SmartAddBrand.tsx"), "utf8");
  const create = src.slice(src.indexOf("const create = async () =>"));
  expect(create).toMatch(/createdAnswers\(\{[^]*?webOurs,\s*\}\)/);
  expect(create).toMatch(/routeWebChoices\(organizationId, brand\.id, webItems\.filter\(\(i\) => !webRecorded\.has\(i\.key\)\)/);
});
