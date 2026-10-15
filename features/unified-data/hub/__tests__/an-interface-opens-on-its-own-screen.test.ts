/**
 * AT-INTERFACE — AN INTERFACE IS LISTED WITH THE PAGES AND OPENS ON ITS OWN SCREEN. An Interface is a dashboard
 * record whose presentation says kind "interface" (records-ui `isInterface`); the data home names it an Interface
 * with its published page count and opens it at /data/interfaces/<id>. The host's page address port makes and
 * opens interfaces too, so the table's dashboard area links them.
 */
import { HUB_CAPABILITIES, type HubReadContext } from "../capabilities";
import type { DataHomeItemRow } from "../doors";
import { recordsPageHref } from "../../recordsReferences";

const ORG = "11111111-1111-1111-1111-111111111111";
const TABLE = "22222222-2222-2222-2222-222222222222";

const row = (id: string, presentation: Record<string, unknown>): DataHomeItemRow => ({
  kind: "dashboard",
  organization_id: ORG,
  organization_name: "Harbor & Pine Creative",
  item_id: id,
  table_id: TABLE,
  table_name: "Content",
  item_row: { dashboard_id: id, table_id: TABLE, name: "Agency Ops", block_count: 0, presentation },
});

describe("an interface", () => {
  it("is listed as an Interface with its published pages and opens on /data/interfaces/<id>", async () => {
    const dashboards = HUB_CAPABILITIES.find((c) => c.id === "dashboards")!;
    const pages = [{ id: "a", name: "Overview", blocks: [], charts: [] }, { id: "b", name: "Content board", blocks: [], charts: [] }];
    const ctx = {
      organizationId: null,
      tables: [],
      tableKernelId: null,
      items: { ok: true, rows: [row("i1", { kind: "interface", draft: { pages: [...pages, { id: "c", name: "Draft only" }] }, published: { pages, version: 1 } })] },
    } as unknown as HubReadContext;
    const read = await dashboards.read(ctx);
    expect(read.ok).toBe(true);
    const [only] = read.ok ? read.items : [];
    expect(only).toMatchObject({ id: "i1", kind: "page", title: "Agency Ops", href: "/data/interfaces/i1" });
    expect(only!.facts).toEqual(["Interface", "2 pages"]);
  });

  it("has an address to open one and to make one on a table", () => {
    expect(recordsPageHref({ interfaceId: "i1" })).toBe("/data/interfaces/i1");
    expect(recordsPageHref({ newInterfaceOnTable: TABLE })).toBe(`/data/interfaces/new?table=${TABLE}`);
    expect(recordsPageHref({ pageId: "p1" })).toBe("/data/pages/p1");
  });
});
