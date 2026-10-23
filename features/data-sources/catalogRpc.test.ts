/** Seam test: the Data library catalog is read from Supabase (scraper.data_sources_library); only switchable sources are overlaid from GET /data-sources/routed. */
const rpc = jest.fn();
const schema = jest.fn(() => ({ rpc }));
jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({ schema }) }));
const python = jest.fn();
jest.mock("@/lib/python-client", () => ({ getJson: python, requestRaw: python }));
jest.mock("@ai-matrx/api", () => ({ parseMatrxNdjsonResponse: jest.fn() }));

import { getDataSources } from "./server";
import { getLibrary } from "./library/server";

beforeEach(() => { rpc.mockReset(); python.mockReset(); python.mockResolvedValue({ data: { sources: [] } }); schema.mockClear(); });

const answer = {
  groups: [{ name: "Ads", count: 1, featured_count: 0 }],
  sources: [{ key: "k", label: "L", group: "Ads", input: { kind: "url", fields: [] }, verified: true, usd_per_record: 0.0015, points_per_record: 30, records_are: "entity", featured: false }],
  total: 1,
  limits: { max_records_per_fetch: { value: 500, setting: "a.b" }, max_inputs_per_fetch: { value: 10, setting: "a.c" } },
  usd_per_record_default: 0.0015,
  points_per_usd: 20000,
};

it("board catalog goes to the scraper RPC with the organization", async () => {
  rpc.mockResolvedValue({ data: answer, error: null });
  const cat = await getDataSources({ organizationId: "org-1" });
  expect(schema).toHaveBeenCalledWith("scraper");
  expect(rpc).toHaveBeenCalledWith("data_sources_library", { p_organization_id: "org-1" });
  expect(cat.sources[0].key).toBe("k");
  expect(python).toHaveBeenCalledWith("/data-sources/routed", { organizationId: "org-1" });
});

it("library page reads the same RPC", async () => {
  rpc.mockResolvedValue({ data: answer, error: null });
  const lib = await getLibrary({ organizationId: "org-1" });
  expect(lib.sources[0].key).toBe("k");
});

it("a switched source takes the server's shape for the same organization (form = run)", async () => {
  rpc.mockResolvedValue({ data: { ...answer, sources: [...answer.sources, { ...answer.sources[0], key: "zillow_listing", search_filters: [] }] }, error: null });
  python.mockResolvedValue({ data: { sources: [{ ...answer.sources[0], key: "zillow_listing", search_filters: ["price_max", "beds_min"] }] } });
  const lib = await getLibrary({ organizationId: "org-1" });
  const z = lib.sources.find((s) => s.key === "zillow_listing");
  expect(z?.search_filters).toEqual(["price_max", "beds_min"]);
  expect(lib.sources.find((s) => s.key === "k")?.search_filters ?? []).toEqual([]);
});

it("the overlay failing leaves the catalog open and says so", async () => {
  const err = jest.spyOn(console, "error").mockImplementation(() => {});
  rpc.mockResolvedValue({ data: answer, error: null });
  python.mockRejectedValue(new Error("down"));
  const lib = await getLibrary({ organizationId: "org-1" });
  expect(lib.sources[0].key).toBe("k");
  expect(err).toHaveBeenCalled();
  err.mockRestore();
});

it("an RPC error is raised, not swallowed", async () => {
  rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
  await expect(getLibrary({ organizationId: "org-1" })).rejects.toBeTruthy();
});
