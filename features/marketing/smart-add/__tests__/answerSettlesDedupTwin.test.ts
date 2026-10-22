/**
 * An answer whose finding is already saved under ANOTHER key settles that row instead of failing "Not saved"
 * (live 2026-10-22, Four Barrel Coffee: the About card came from the fact finder as `fact:description:…` while Create
 * had saved the same value as `description:<80 chars>`; every Yes hit the dedup index, 23505, and the card came back).
 */
const updates: { id?: string; patch: Record<string, unknown> }[] = [];
let insertCalls = 0;
const twin = { id: "twin-1", status: "pending", relation_key: null, sentiment: null, reviewed_at: null, reviewed_by: null, context: { evidence_key: "description:we're an independent" }, resolved_property_id: null, resolved_fact_id: null, deleted_at: null };

function chain(result: () => unknown, onEq?: (k: string, v: unknown) => void, single?: () => unknown) {
  const b: Record<string, unknown> = {};
  for (const m of ["in", "is", "not", "order", "limit", "neq"]) b[m] = () => b;
  b.eq = (k: string, v: unknown) => { onEq?.(k, v); return b; };
  b.select = () => b;
  b.single = async () => (single ?? result)();
  b.maybeSingle = async () => (single ?? result)();
  b.then = (resolve: (v: unknown) => void) => resolve(result());
  return b;
}

jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
jest.mock("@/utils/supabase/webDb", () => ({
  signedInPersonId: async () => "person-1",
  authenticatedWebDb: async () => ({
    from: () => ({
      // Lookups by evidence_key find nothing; the twin lookup (by value) finds the saved row.
      select: () => {
        let byValue = false;
        return chain(
          () => ({ data: [], error: null }),
          (k) => { if (k === "value") byValue = true; },
          () => ({ data: byValue ? twin : null, error: null }),
        );
      },
      insert: () => { insertCalls++; return chain(() => ({ data: null, error: { code: "23505", message: "duplicate key value violates unique constraint \"discovered_item_dedup\"" } })); },
      update: (patch: Record<string, unknown>) => {
        const u: { id?: string; patch: Record<string, unknown> } = { patch };
        updates.push(u);
        return chain(() => ({ data: null, error: null }), (k, v) => { if (k === "id") u.id = String(v); });
      },
    }),
  }),
}));
jest.mock("@/features/marketing/data/service", () => ({ createBusinessFact: jest.fn(), getBrand: jest.fn(), updateBrand: jest.fn() }));
jest.mock("@/features/marketing/data/retraction", () => ({ applyRetraction: jest.fn(), restoreRetraction: jest.fn(), withdrawSite: jest.fn() }));
jest.mock("@/lib/workflows/system-runs", () => ({ startSystemRun: jest.fn() }));
jest.mock("@/features/scopes/service/associationsService", () => ({ associationsService: { add: jest.fn(), remove: jest.fn() } }));
jest.mock("@/lib/redux/store-singleton", () => ({ getStoreSingleton: jest.fn() }));
jest.mock("../siteOwnershipLive", () => ({ liveSiteClaimDeps: jest.fn() }));
jest.mock("../factRules", () => ({ ...jest.requireActual("../factRules"), loadFactRules: async () => jest.requireActual("../factRules").NO_FACT_RULES }));
jest.mock("../promote", () => ({ PROMOTED_TYPES: [], promoteSmartAddFindings: jest.fn(), promotedHomes: () => [], undoPromotion: jest.fn() }));

import { persistAnswer, type PersistContext } from "../validate/persist";
import { focusFromFact } from "../validate/queue";

const ctx = { organizationId: "org-1", getBrand: () => ({ id: "brand-1" }), setBrand: jest.fn(), kinds: [] } as unknown as PersistContext;

it("settles the saved twin row when the insert hits the dedup index", async () => {
  const item = focusFromFact({
    key: "fact:description:we're an independent, locally owned coffee roastery",
    field: "description",
    field_label: "About",
    value: "We're an independent, locally owned coffee roastery.",
    certainty: "high",
    reason: "",
    evidence_urls: [],
    known_field: null,
  });
  const out = await persistAnswer(ctx, item, "wrong");
  expect(insertCalls).toBe(1);
  const settled = updates.find((u) => u.id === "twin-1");
  expect(settled?.patch.status).toBe("dismissed");
  expect(settled?.patch.reviewed_by).toBe("person-1");
  expect(out).toBeDefined();
});
