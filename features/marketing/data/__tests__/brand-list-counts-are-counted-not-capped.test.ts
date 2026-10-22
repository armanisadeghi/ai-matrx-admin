/**
 * THE BRANDS LIST COUNTS ARE COUNTED, NEVER CAPPED. listBrands used to read every pending
 * discovered_item / brand_asset / business_fact ROW for the page's brands and count them in the
 * browser — PostgREST caps a bare select, so a page whose brands held 2,000+ items to review summed
 * to exactly the cap. The counts now come from web.brand_list_counts (count(*) in the database).
 * RED before: listBrands selected `discovered_item` rows; GREEN: it calls the count RPC.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));

describe("brands list counts", () => {
  const source = readFileSync(join(__dirname, "..", "service.ts"), "utf8");
  const listBrands = source.slice(source.indexOf("export async function listBrands("), source.indexOf("export async function getBrand("));

  test("listBrands counts in the database, never by reading rows", () => {
    expect(listBrands).toContain('rpc("brand_list_counts"');
    expect(listBrands).not.toMatch(/from\("(discovered_item|brand_asset|business_fact)"\)/);
  });

  test("bigint counts past any row cap arrive whole", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { brandListCountsByBrand } = require("../service") as typeof import("../service");
    const m = brandListCountsByBrand([{ brand_id: "b1", pending_discovered: "18937", assets: 3, facts: "62" }]);
    expect(m.get("b1")).toEqual({ pending_discovered: 18937, assets: 3, facts: 62 });
  });
});
