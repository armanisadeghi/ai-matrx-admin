/**
 * MKT-175: the person pressed Yes on an About line at Create (the brand's description, `confirmed.what_you_do`), and
 * the validate page asked about What you do again: the other About candidates Create kept (pending) folded into one
 * About card that nothing marked as settled. Reads the brand's saved rows the way the page does (loadSavedFindings),
 * then folds them (foldQueue).
 */
const pending = [
  ["description", "Mossy Beard is dedicated to helping you grow the awesome beard you deserve."],
  ["description", "Healthy beard care products that help your beard grow."],
  ["name", "Beard Balm by Mossy Beard"],
].map(([kind, text], i) => ({
  id: `d${i}`,
  category: "identity",
  guessed_kind: kind,
  url: null,
  value: { text },
  context: { evidence_key: `${kind}:${i}`, step: "first_data", where: "website" },
  confidence: 0.6,
}));

function q(data: unknown[]) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "is", "not", "order", "limit"]) b[m] = () => b;
  b.then = (resolve: (v: unknown) => void) => resolve({ data, error: null });
  return b;
}
jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
jest.mock("@/utils/supabase/webDb", () => ({
  authenticatedWebDb: async () => ({ from: (t: string) => q(t === "discovered_item" ? pending : []) }),
}));

import { loadSavedFindings } from "../validate/fromSaved";
import { foldQueue } from "../validate/fold";
import { buildQueue } from "../validate/queue";
import type { MarketingBrand } from "@/features/marketing/types";

const brand = (confirmed: boolean) =>
  ({
    id: "b1",
    name: "The Mossy Beard Care Company",
    description: "Mossy Beard offers reviews of beard balm, beard oil, beard tools and other topics.",
    website_url: "https://mossybeard.com",
    profile: {},
    metadata: { smart_add: { confirmed: { name: true, ...(confirmed ? { what_you_do: true } : {}) } } },
  }) as unknown as MarketingBrand;

async function cards(b: MarketingBrand) {
  const saved = await loadSavedFindings(b);
  const raw = buildQueue({ items: saved.items, facts: saved.facts, decisions: {}, webChoices: {}, answered: new Set(), later: [], kinds: [], ctx: { ourHosts: [], ourAccounts: [], name: b.name } });
  return foldQueue({ queue: raw, known: saved.known, later: [] });
}

it("an About line confirmed at Create is not asked again on validate", async () => {
  const stage = await cards(brand(true));
  expect(stage.map((c) => c.value)).toEqual(["Beard Balm by Mossy Beard"]);
});

it("with no About settled at Create, the About candidates are still one card", async () => {
  const stage = await cards(brand(false));
  expect(stage).toHaveLength(2);
});
