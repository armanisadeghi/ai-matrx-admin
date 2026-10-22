/**
 * MKT-151: Yes on a Name card right after Create read "Not saved" and was lost on reload. The page held the brand as
 * Create wrote it (version 1); the setup run then saved the logo in the background (version 2), so the answer's
 * guarded brand write missed its version and the whole answer was undone. A version moved by a write to OTHER fields
 * is not a conflict: the answer must land, on the brand and on its finding.
 *
 * Runs the real persistAnswer → updateBrand / mergeBrandProfile → guardedUpdate chain over an in-memory web schema.
 */
type Row = Record<string, unknown> & { id: string };
const tables: Record<string, Row[]> = { brand: [], discovered_item: [] };

function query(table: string) {
  const filters: ((r: Row) => boolean)[] = [];
  let op: "select" | "update" | "insert" = "select";
  let payload: Record<string, unknown> = {};
  const q: Record<string, unknown> = {};
  const rows = () => tables[table].filter((r) => filters.every((f) => f(r)));
  const field = (r: Row, col: string) => {
    const m = /^(\w+)->>(\w+)$/.exec(col);
    return m ? (r[m[1]] as Record<string, unknown> | null)?.[m[2]] : r[col];
  };
  Object.assign(q, {
    select: () => q,
    update: (p: Record<string, unknown>) => ((op = "update"), (payload = p), q),
    insert: (p: Record<string, unknown>) => ((op = "insert"), (payload = p), q),
    eq: (c: string, v: unknown) => (filters.push((r) => field(r, c) === v), q),
    in: (c: string, v: unknown[]) => (filters.push((r) => v.includes(field(r, c))), q),
    is: (c: string, v: unknown) => (filters.push((r) => (field(r, c) ?? null) === v), q),
    not: () => q,
    limit: () => q,
    order: () => q,
    abortSignal: () => q,
    run: () => {
      if (op === "insert") {
        const row = { id: `${table}-${tables[table].length + 1}`, ...payload } as Row;
        tables[table].push(row);
        return [row];
      }
      const hit = rows();
      if (op === "update") for (const r of hit) Object.assign(r, payload);
      return hit.map((r) => ({ ...r }));
    },
  });
  const run = q.run as () => Row[];
  q.maybeSingle = async () => ({ data: run()[0] ?? null, error: null });
  q.single = async () => ({ data: run()[0], error: null });
  q.then = (resolve: (v: unknown) => void) => resolve({ data: run(), error: null });
  return q;
}

jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
jest.mock("@/utils/supabase/webDb", () => ({ signedInPersonId: async () => "person-1", authenticatedWebDb: async () => ({ from: (t: string) => query(t) }) }));
jest.mock("@/lib/workflows/system-runs", () => ({ startSystemRun: jest.fn() }));
jest.mock("@/features/scopes/service/associationsService", () => ({ associationsService: {} }));
jest.mock("@/lib/redux/store-singleton", () => ({ getStoreSingleton: jest.fn() }));
jest.mock("../siteOwnershipLive", () => ({ liveSiteClaimDeps: jest.fn() }));

import { persistAnswer, type PersistContext } from "../validate/persist";
import type { FocusItem } from "../validate/queue";
import type { MarketingBrand } from "@/features/marketing/types";

const created = { id: "b1", name: "The Mossy Beard Care Company", logo_url: null, profile: {}, version: 1, deleted_at: null, kind: "company" } as unknown as MarketingBrand;

function seed() {
  // What the server holds after the setup run saved the logo: the version moved, the name did not.
  tables.brand = [{ ...(created as unknown as Row), logo_url: "https://cdn.example/logo.png", profile: { expertise_areas: ["beards"] }, version: 2 }];
  tables.discovered_item = [
    { id: "d1", brand_id: "b1", source: "smart_add", status: "pending", deleted_at: null, context: { evidence_key: "name:mossy beard care company" } },
  ];
}

function pageCtx(): PersistContext {
  let brand = created; // the page's copy, as Create returned it
  return { organizationId: "o1", getBrand: () => brand, setBrand: (b) => (brand = b), kinds: [] };
}

const nameCard = {
  key: "name:mossy beard care company",
  kind: "name",
  label: "Name",
  value: "Mossy Beard Care Company",
  title: null,
  twins: [],
  openUrl: null,
  evidence: null,
  fact: null,
  suggestion: null,
} as unknown as FocusItem;

it("Yes on a Name card lands when a background write moved the brand's version", async () => {
  seed();
  await persistAnswer(pageCtx(), nameCard, "preferred");
  expect(tables.brand[0].name).toBe("Mossy Beard Care Company");
  expect(tables.brand[0].logo_url).toBe("https://cdn.example/logo.png");
  expect(tables.discovered_item[0].status).toBe("confirmed");
});

it("Another name we use lands on the profile the server holds now, keeping its other keys", async () => {
  seed();
  await persistAnswer(pageCtx(), nameCard, "alias");
  expect(tables.brand[0].profile).toEqual({ expertise_areas: ["beards"], brand_aliases: ["Mossy Beard Care Company"] });
  expect(tables.discovered_item[0].status).toBe("confirmed");
});

it("a real conflict (someone renamed the brand meanwhile) is still refused", async () => {
  seed();
  tables.brand[0].name = "Renamed elsewhere";
  await expect(persistAnswer(pageCtx(), nameCard, "preferred")).rejects.toThrow(/changed in another session/);
  expect(tables.discovered_item[0].status).toBe("pending");
});
