import { tableWidgetRows } from "../bodies/TableWidget";
import { dataTableChoices, tableDashboardChoices } from "../DataPagePicker";
import { getLaunchpadWidgetSpec } from "../catalog";

jest.mock("@/features/data-tables/service", () => ({ getTableMetadata: jest.fn(), getTablePage: jest.fn() }));
jest.mock("@ai-matrx/records/react", () => ({ useRecordsClient: () => ({}) }));
jest.mock("@/features/unified-data/objectOrganization", () => ({ useObjectOrganization: () => ({ state: "resolving" }) }));
jest.mock("@/features/data-tables/records-ui-host/recordsDataSource", () => ({ useRecordsDataSource: () => ({}) }));
jest.mock("@/features/unified-data/home/dataHomeCorpus", () => ({ createDataHomeCorpus: () => ({ load: async () => [] }) }));

describe("the Start table widget", () => {
  it("is in the catalog with a table picker", () => {
    const spec = getLaunchpadWidgetSpec("table");
    expect(spec?.fields[0]).toMatchObject({ key: "tableId", picker: "dataTable" });
    expect(spec?.describe({})).toMatch(/none chosen/);
  });
  it("shows the first two columns of each row", () => {
    const rows = tableWidgetRows(
      [{ field_name: "name" }, { field_name: "stage" }],
      [{ id: "1", data: { name: "Ana", stage: "Won" } }, { id: "2", data: { name: "", stage: ["a", "b"] } }],
    );
    expect(rows).toEqual([
      { id: "1", title: "Ana", meta: "Won" },
      { id: "2", title: "Untitled row", meta: "a, b" },
    ]);
  });
  it("offers tables only, the person's own first", () => {
    const row = (kind: string, name: string, mine: boolean) => ({ kind, name, mine, itemId: name }) as never;
    expect(dataTableChoices([row("page", "P", true), row("table", "B", false), row("table", "A", true)]).map((c) => c.label)).toEqual(["A", "B"]);
  });
  it("a dashboard widget picks among the table's dashboards, never its Pages or Interfaces", () => {
    const d = (dashboard_id: string, name: string, kind?: string) => ({ dashboard_id, name, presentation: kind ? { kind } : {} });
    expect(tableDashboardChoices([d("a", "Sales"), d("b", "Intake", "interface"), d("c", "Brief", "page"), d("e", "")])).toEqual([
      { value: "a", label: "Sales" },
      { value: "e", label: "Untitled dashboard" },
    ]);
    expect(getLaunchpadWidgetSpec("records_dashboard")?.fields.find((f) => f.key === "dashboardId")?.picker).toBe("tableDashboard");
  });
});
