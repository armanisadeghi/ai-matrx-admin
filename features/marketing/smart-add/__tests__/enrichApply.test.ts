import type { EnrichChange } from "../enrich/diff";
import type { BrandSnapshot, KnownFact } from "../enrich/known";
import type { EvidenceItem } from "../evidence";
import type { MarketingBrand } from "@/features/marketing/types";

const calls: string[] = [];
const created: Array<Record<string, unknown>> = [];
const persistCtx: Array<{ organizationId: string }> = [];

jest.mock("@/features/marketing/data/service", () => ({
  createBrandAsset: jest.fn(async (input: Record<string, unknown>) => {
    calls.push("createBrandAsset");
    created.push(input);
    return { id: "asset-new" };
  }),
  deleteBrandAsset: jest.fn(async (id: string) => void calls.push(`deleteBrandAsset:${id}`)),
  updateBrandAsset: jest.fn(async (input: { assetId: string; patch: Record<string, unknown> }) => void calls.push(`updateBrandAsset:${input.assetId}:${JSON.stringify(input.patch)}`)),
  updateBrand: jest.fn(async (input: { brandId: string; expectedVersion: number; patch: Record<string, unknown> }) => {
    calls.push(`updateBrand:${JSON.stringify(input.patch)}`);
    return { id: input.brandId, organization_id: "org-brand", version: input.expectedVersion + 1, kind: "company", name: "Ritual", logo_url: "logo_url" in input.patch ? input.patch.logo_url : null };
  }),
}));
jest.mock("@/features/marketing/data/retraction", () => ({
  applyRetraction: jest.fn(async (type: string, id: string) => {
    calls.push(`applyRetraction:${type}:${id}`);
    return { root: { type, id }, applied: true, at: "2026-10-14T00:00:00Z", brand_id: "b1" };
  }),
  restoreRetraction: jest.fn(async () => void calls.push("restoreRetraction")),
}));
jest.mock("../validate/persist", () => ({
  persistAnswer: jest.fn(async (ctx: { organizationId: string }) => {
    calls.push("persistAnswer");
    persistCtx.push({ organizationId: ctx.organizationId });
    return { homes: ["web.property:p9"], undo: async () => void calls.push("persistUndo") };
  }),
}));
jest.mock("../validate/queue", () => ({ focusFromEvidence: jest.fn(() => ({ focus: true })) }));

import { applyEnrichChanges } from "../enrich/apply";

const brand = { id: "b1", organization_id: "org-brand", version: 3, kind: "company", name: "Ritual", logo_url: "https://old/logo.png" } as unknown as MarketingBrand;
const snapshot = {
  brand,
  sites: [],
  properties: [],
  assets: [{ id: "a-old", kind: "logo", is_primary: true, version: 1 }],
  facts: [],
  people: [],
  offerings: [],
  exclusions: [],
  textKeys: {},
} as unknown as BrandSnapshot;

function item(field: EvidenceItem["field"], value: string): EvidenceItem {
  return {
    key: `${field}:${value}`, field, value, label: null, image_url: field === "logo" ? value : null, url: value, platform: null, handle: null,
    followers: null, verified: null, profile_id: null, source: { node: "probe", kind: "website", url: null, where: "home page" }, confidence: 0.9,
  };
}
const change = (over: Partial<EnrichChange>): EnrichChange => ({
  id: "c", kind: "add", group: "basics", label: "x", current: null, next: null, nextDecision: null, slot: null, defaultChoice: "apply", ...over,
});
const logoRemoval = change({
  id: "conflict:logo", kind: "conflict", defaultChoice: "keep",
  current: { id: "logo", ref: { type: "brand", field: "logo" } } as unknown as KnownFact,
});
const newLogo = change({ id: "replace:logo", kind: "replace", slot: "logo", next: item("logo", "https://new/logo.png") });
const newAccount = change({ id: "add:social", kind: "add", group: "accounts", next: item("social", "instagram.com/ritual") });

beforeEach(() => {
  calls.length = 0;
  created.length = 0;
  persistCtx.length = 0;
});

describe("enrich apply", () => {
  it("carries the brand's organization on every write, not the active one", async () => {
    await applyEnrichChanges({
      snapshot, changes: [newLogo, newAccount], choices: {}, kinds: [], onBrand: () => undefined,
    });
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ organizationId: "org-brand", brandId: "b1" });
    expect(persistCtx).toEqual([{ organizationId: "org-brand" }]);
  });

  it("applies removals before everything else and skips unchosen changes", async () => {
    const out = await applyEnrichChanges({
      snapshot,
      changes: [newLogo, newAccount, logoRemoval],
      choices: { "conflict:logo": "apply" },
      kinds: [],
      onBrand: () => undefined,
    });
    expect(out.every((o) => o.ok)).toBe(true);
    expect(calls.indexOf("applyRetraction:logo:b1")).toBe(0);
    expect(calls.indexOf("createBrandAsset")).toBeGreaterThan(0);
    expect(calls.indexOf("persistAnswer")).toBeGreaterThan(calls.indexOf("applyRetraction:logo:b1"));
    // Without choosing it, a conflict is kept: nothing is removed.
    calls.length = 0;
    await applyEnrichChanges({ snapshot, changes: [logoRemoval], choices: {}, kinds: [], onBrand: () => undefined });
    expect(calls).toEqual([]);
  });

  it("undo restores a removal and a replaced logo", async () => {
    const out = await applyEnrichChanges({
      snapshot, changes: [logoRemoval, newLogo], choices: { "conflict:logo": "apply" }, kinds: [], onBrand: () => undefined,
    });
    calls.length = 0;
    const removal = out.find((o) => o.change.id === "conflict:logo");
    const logo = out.find((o) => o.change.id === "replace:logo");
    await removal?.undo?.();
    expect(calls).toEqual(["restoreRetraction"]);
    calls.length = 0;
    await logo?.undo?.();
    expect(calls[0]).toBe("deleteBrandAsset:asset-new");
    expect(calls).toContain('updateBrandAsset:a-old:{"is_primary":true}');
  });

  it("reports a failed change without stopping the rest", async () => {
    const bad = change({ id: "bad", kind: "add", next: null });
    const out = await applyEnrichChanges({ snapshot, changes: [bad, newAccount], choices: {}, kinds: [], onBrand: () => undefined });
    expect(out.map((o) => o.ok)).toEqual([false, true]);
    expect(out[0].error).toBeTruthy();
  });
});
