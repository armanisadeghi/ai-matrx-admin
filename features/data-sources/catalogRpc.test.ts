/** Seam test: the Data library catalog is read from Supabase (scraper.data_sources_library), not GET /data-sources. */
const rpc = jest.fn();
const schema = jest.fn(() => ({ rpc }));
jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({ schema }) }));
const python = jest.fn();
jest.mock("@/lib/python-client", () => ({ getJson: python, requestRaw: python }));
jest.mock("@ai-matrx/api", () => ({ parseMatrxNdjsonResponse: jest.fn() }));

import { getDataSources } from "./server";
import { getLibrary } from "./library/server";

beforeEach(() => { rpc.mockReset(); python.mockReset(); schema.mockClear(); });

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
  expect(python).not.toHaveBeenCalled();
});

it("library page reads the same RPC", async () => {
  rpc.mockResolvedValue({ data: answer, error: null });
  const lib = await getLibrary({ organizationId: "org-1" });
  expect(lib.sources[0].key).toBe("k");
  expect(python).not.toHaveBeenCalled();
});

it("an RPC error is raised, not swallowed", async () => {
  rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
  await expect(getLibrary({ organizationId: "org-1" })).rejects.toBeTruthy();
});
