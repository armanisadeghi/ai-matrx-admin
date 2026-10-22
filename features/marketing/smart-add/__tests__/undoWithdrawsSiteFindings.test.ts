/**
 * Undoing an "Ours" website takes back what grew from it (2026-10-22, pxdocs.com on brand e641a6d5): the plain Undo
 * soft-deleted the site row alone (`deleteSite`), so its running crawl kept going and every still-pending finding read
 * from its pages (pictures, its YouTube / Instagram) stayed asked on the validation page. Both Undo paths that take a
 * site back — the in-session answer (validate/persist.ts addSite) and an earlier answer (validate/savedAnswers.ts,
 * the brand page's table and a reopened Enrich) — now go through `web.decision_retraction` AS THE ANSWER being undone
 * (root decision, apply on, "Not us" off): it cancels the crawl, the site's findings follow it, and only PENDING
 * findings and UNCONFIRMED facts read from its host are withdrawn, never what a person answered or confirmed
 * (REVIEW5 C1/I1: the database keeps person facts and a site another live answer still names; its self-test
 * `web.__decision_retraction_selftest()` proves both).
 */
const rpc = jest.fn(async (_fn: string, _args: Record<string, unknown>) => ({ data: { applied: true }, error: null }));
const updates: Array<{ table: string; patch: Record<string, unknown> }> = [];

function builder(table: string, op: string, payload?: Record<string, unknown>) {
  const b: Record<string, unknown> = {};
  for (const m of ["eq", "in", "is", "not", "order", "limit", "select"]) b[m] = () => b;
  b.maybeSingle = async () => ({ data: null, error: null });
  b.single = async () => ({ data: { id: "row-1" }, error: null });
  b.then = (resolve: (v: unknown) => void) => {
    if (op === "update") updates.push({ table, patch: payload ?? {} });
    if (table === "discovered_item" && op === "select") {
      return resolve({
        data: [{ id: "dec-1", relation_key: "ours", status: "confirmed", context: { evidence_key: "web:pxdocs.com", answer: { answer: "ours", homes: ["web.site:site-px"] } } }],
        error: null,
      });
    }
    return resolve({ data: [], error: null });
  };
  return b;
}

jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
jest.mock("@/utils/supabase/webDb", () => ({
  signedInPersonId: async () => "person-1",
  authenticatedWebDb: async () => ({
    rpc: (fn: string, args: Record<string, unknown>) => rpc(fn, args),
    from: (table: string) => ({
      select: () => builder(table, "select"),
      insert: (p: Record<string, unknown>) => builder(table, "insert", p),
      update: (p: Record<string, unknown>) => builder(table, "update", p),
    }),
  }),
}));
const deleteSite = jest.fn();
jest.mock("@/features/marketing/data/service", () => ({
  deleteSite: (...a: unknown[]) => deleteSite(...a),
  deleteProperty: jest.fn(),
  deleteBrandAsset: jest.fn(),
  deleteBusinessFact: jest.fn(),
  createProperty: jest.fn(),
  getBrand: jest.fn(),
  updateBrand: jest.fn(),
}));
jest.mock("@/lib/workflows/system-runs", () => ({ startSystemRun: jest.fn(async () => ({})) }));
jest.mock("@/features/scopes/service/associationsService", () => ({
  associationsService: { add: jest.fn(async () => ({ ok: true })), remove: jest.fn(async () => ({ ok: true })) },
}));
jest.mock("@/lib/redux/store-singleton", () => ({ getStoreSingleton: jest.fn(() => null) }));
jest.mock("../siteOwnershipLive", () => ({ liveSiteClaimDeps: {} }));
jest.mock("../siteOwnership", () => ({ claimSite: jest.fn(async () => ({ kind: "claimed", site: { id: "site-px" } })) }));
jest.mock("../promote", () => ({ promoteSmartAddFindings: jest.fn(), promotedHomes: () => [], undoPromotion: jest.fn(async () => undefined), PROMOTED_TYPES: [] }));

import type { PersistContext } from "../validate/persist";
import { persistAnswer } from "../validate/persist";
import { retractSavedAnswer } from "../validate/savedAnswers";
import { focusFromEvidence } from "../validate/queue";
import type { EvidenceItem } from "../evidence";

const ctx = { organizationId: "org-1", getBrand: () => ({ id: "brand-1" }), setBrand: jest.fn(), kinds: [] } as unknown as PersistContext;
const pxdocs = {
  key: "web:pxdocs.com",
  field: "web_page",
  value: "https://pxdocs.com",
  url: "https://pxdocs.com",
  handle: null,
  platform: null,
  label: "PX Docs",
  image_url: null,
  profile_id: null,
  followers: null,
  confidence: 0.9,
  source: { kind: "web_search", where: "web result", url: null, node: "web" },
} as unknown as EvidenceItem;
// Undo acts as exactly the answer being undone (root decision; REVIEW5 I1): the database keeps a site another live
// answer still names and never rewrites that other answer.
const AS_ANSWER = (decisionId: string) => ({ p_root_type: "decision", p_root_id: decisionId, p_apply: true, p_exclude: false });

beforeEach(() => {
  rpc.mockClear();
  deleteSite.mockClear();
  updates.length = 0;
});

it("the in-session Undo of an Ours website withdraws the site through the retraction door, never a bare delete", async () => {
  const focus = focusFromEvidence(pxdocs, [], { ourHosts: [], ourAccounts: [], name: null } as never);
  if (!focus) throw new Error("no card");
  const persisted = await persistAnswer(ctx, focus, "ours", {});
  expect(persisted.homes).toContain("web.site:site-px");
  await persisted.undo();
  expect(rpc).toHaveBeenCalledWith("decision_retraction", AS_ANSWER(persisted.discoveredId as string));
  expect(deleteSite).not.toHaveBeenCalled();
});

it("taking back an earlier Ours website (brand page, reopened Enrich) withdraws it the same way", async () => {
  expect(await retractSavedAnswer("brand-1", [], { evidenceKey: "web:pxdocs.com" })).toBe(true);
  expect(rpc).toHaveBeenCalledWith("decision_retraction", AS_ANSWER("dec-1"));
  expect(deleteSite).not.toHaveBeenCalled();
  // The finding itself goes back to pending afterwards (undoSaved), as before.
  expect(updates.some((u) => u.table === "discovered_item" && u.patch.status === "pending")).toBe(true);
});
