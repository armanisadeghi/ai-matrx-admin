/** @jest-environment jsdom */
//
// Owner, 2026-10-22: a library search must "give you a result on the page" — not a window panel
// that sends you to a table. Running a source on /data/library?source=<key> draws the person's own
// custom table INLINE under the search (the one table mount, `LocatedTableViewer`), while it fills
// and when it is done; the run rides the address (`&job=`) so a reload re-attaches; earlier runs
// are listed on the page and reopen inline. Before this lane `?source=` opened the window and the
// page drew no results at all, so every test here fails on the old flow.

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

let search = "";
const pushed: string[] = [];
const replaced: string[] = [];
// The fetched table's own fields (the grid opens on the source's plain set: `../openingColumns`).
const TABLE_FIELDS = ["name", "rating", "reviews_count", "category", "address", "phone_number", "open_website", "cid", "timestamp", "input"].map((k) => ({ key: k, name: k, label: k }));
jest.mock("@ai-matrx/records/react", () => ({
  ...jest.requireActual("@ai-matrx/records/react"),
  useFields: () => ({ data: TABLE_FIELDS, isLoading: false }),
}));
jest.mock("next/navigation", () => ({
  usePathname: () => "/data/library",
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(search),
}));
jest.mock("@/lib/url-state/addressWithoutNavigating", () => ({
  pushAddressWithoutNavigating: (href: string) => pushed.push(href),
  replaceAddressWithoutNavigating: (href: string) => replaced.push(href),
}));
// The heavy grid: stands in as a marker carrying the table id it was asked to draw.
jest.mock("next/dynamic", () => () =>
  function LocatedTableStandIn(props: { tableId: string; filter?: unknown; readOnly?: boolean; viewAddress?: { hidden?: string[] } }) {
    return (
      <div
        data-testid="located-table"
        data-hidden={props.viewAddress?.hidden?.join(",") ?? ""}
        data-table={props.tableId}
        data-read-only={props.readOnly ? "yes" : ""}
        data-filter={props.filter ? JSON.stringify(props.filter) : ""}
      />
    );
  },
);
jest.mock("@ai-matrx/design-system/data-table", () => ({
  MatrxDataTable: ({ data, onRowOpen }: { data: { id: string }[]; onRowOpen: (r: { id: string }) => void }) => (
    <ul data-testid="past-runs">
      {data.map((r) => (
        <li key={r.id}>
          <button type="button" data-past-run={r.id} onClick={() => onRowOpen(r)} />
        </li>
      ))}
    </ul>
  ),
}));
jest.mock("@ai-matrx/chat/agents/identity/tool-search", () => ({
  useOwnToolSearch: () => ({ status: "ready", known: {}, hits: [] }),
}));
jest.mock("@/features/shell/components/header/templates/RecordPageHeader", () => ({
  RecordPageHeader: ({ record, level }: { record?: { name: string }; level?: { name: string } }) => <h1 data-testid="title">{(record ?? level)?.name}</h1>,
}));
jest.mock("@/components/cost/useCostDisplay", () => ({ useCostDisplay: () => ({ rate: null }), useSeesDollars: () => false }));
jest.mock("@/components/cost/CostDoor", () => ({ CostDoor: () => <span data-testid="cost-door" /> }));
jest.mock("../hooks", () => ({
  useLibraryOrganizationId: () => "org-1",
  useLibrary: () => ({ isLoading: false, error: null, data: LIBRARY, refetch: jest.fn() }),
  usePriceText: () => () => "40 points",
  sourceCostRow: (_s: unknown, _n: number, label: string) => ({ label, points: 40 }),
  libraryKey: (o: string) => ["data-sources", "library", o],
}));
jest.mock("../../hooks", () => ({ limitSettingHref: () => null, fetchedTablesKey: ["data-sources", "fetched-tables"] }));
const mockSourceInputValues: Record<string, string>[] = [];
jest.mock("../../SourceInputFields", () => ({
  SourceInputFields: ({ values }: { values: Record<string, string> }) => {
    mockSourceInputValues.push(values);
    return <div data-testid="inputs" />;
  },
  modeOf: () => ({ option: null }),
}));
jest.mock("../../AddToBoard", () => ({ AddToBoard: () => <button type="button">Add to a board</button> }));
jest.mock("../../RefusalView", () => ({ RefusalView: () => <div role="alert" /> }));
jest.mock("../../server", () => ({ fetchData: jest.fn(), getJob: jest.fn() }));
let runNow: unknown = { status: "idle" };
jest.mock("../../runs", () => ({
  useRun: () => runNow,
  runState: () => runNow,
  clearRun: jest.fn(),
  startRun: jest.fn(),
  resumeRun: jest.fn(() => () => {}),
}));
const jobRows: Record<string, unknown> = {};
// The keys of each run (the server's side table), read for the run on view only.
const runKeys: Record<string, string[]> = {};
let keysLoading = false;
jest.mock("../runHistory", () => {
  const actual = jest.requireActual("../runHistory");
  return {
    ...actual,
    useDataFetchJob: (id: string | null) => ({ isLoading: false, data: id ? (jobRows[id] ?? null) : null }),
    useRunRowKeys: (job: { id: string } | null) => ({ isLoading: keysLoading, data: job ? (runKeys[job.id] ?? []) : null }),
    useOpenJob: () => ({ data: null }),
    usePastRuns: () => ({ isLoading: false, data: Object.values(jobRows) }),
  };
});
jest.mock("../tools/ToolsHome", () => ({ ToolsHome: () => <div data-testid="tools-home" /> }));
jest.mock("../tools/ToolPage", () => ({ ToolPage: () => <div data-testid="tool-page" /> }));
jest.mock("../tools/GiveToAgentDialog", () => ({ GiveToAgentDialog: () => null }));

import { parseLibrary } from "../catalog";
import { DataLibraryPage } from "../DataLibraryPage";

const LIBRARY = parseLibrary({
  sources: [
    { key: "google_maps_place", label: "Google Maps place", group: "Places & local business", input: { kind: "url" }, verified_live: true, usd_per_record: 0.002,
      output_fields: ["name", "rating", "reviews_count", "category", "address", "phone_number", "open_website", "cid", "timestamp", "input"] },
  ],
});

const job = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  source_key: "google_maps_place",
  status: "done",
  table_id: `table-${id}`,
  table_name: `Places ${id}`,
  rows_created: 3,
  rows_updated: 0,
  inputs: [{ keyword: "plumbers", location: "Austin, TX" }],
  max_records: 10,
  error: null,
  created_at: "2026-10-21T10:00:00Z",
  finished_at: "2026-10-21T10:01:00Z",
  ...over,
});

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
const render = () =>
  act(() =>
    root.render(
      <QueryClientProvider client={new QueryClient()}>
        <DataLibraryPage />
      </QueryClientProvider>,
    ),
  );
beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  pushed.length = 0;
  replaced.length = 0;
  for (const k of Object.keys(jobRows)) delete jobRows[k];
  for (const k of Object.keys(runKeys)) delete runKeys[k];
  keysLoading = false;
  runNow = { status: "idle" };
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const inline = () => host.querySelector("[data-inline-results]");

test("?source= opens the source ON the page: the search, no results until a run", () => {
  search = "source=google_maps_place";
  render();
  expect(host.querySelector('[data-source-page="google_maps_place"]')).not.toBeNull();
  expect(host.querySelector('[data-source-detail="google_maps_place"]')).not.toBeNull();
  expect(inline()).toBeNull();
});

test("a finished run draws its table inline under the search, with Open as table as a secondary door", () => {
  search = "source=google_maps_place";
  runNow = { status: "done", result: { ...job("J1"), job_id: "J1", columns: [], records_billed: 3, cost_usd: 0, values_as_text: 0, limit_applied: null } };
  render();
  expect(inline()?.getAttribute("data-inline-results")).toBe("table-J1");
  expect(host.querySelector('[data-testid="located-table"]')?.getAttribute("data-table")).toBe("table-J1");
  expect(host.querySelector("[data-open-table]")?.textContent).toBe("Open as table");
  // The run names itself in the address (replace, not a new step) so a reload re-attaches.
  expect(replaced.some((h) => h.includes("job=J1"))).toBe(true);
  // Results are doing, not deciding: no price beside them (law 14).
  expect(host.querySelector('[data-results="live"]')?.textContent).not.toMatch(/points/);
});

test("the inline grid opens on the source's plain columns (the one column registry); the rest are one click away", () => {
  search = "source=google_maps_place";
  jobRows.J1 = job("J1");
  runNow = { status: "done", result: { ...job("J1"), job_id: "J1", columns: [], records_billed: 3, cost_usd: 0, values_as_text: 0, limit_applied: null } };
  render();
  const hidden = (host.querySelector('[data-testid="located-table"]')?.getAttribute("data-hidden") ?? "").split(",");
  // shown: Name, Rating, Reviews, Category, Address, Phone, Website; hidden: everything else
  expect(hidden.sort()).toEqual(["cid", "input", "timestamp"]);
});

test("a running run fills the same inline table as soon as the server names it", () => {
  search = "source=google_maps_place&job=J2";
  jobRows.J2 = job("J2", { status: "storing" });
  runNow = { status: "running", progress: { label: "Saving", current: 2, total: 10, jobId: "J2" }, startedAt: Date.now() };
  render();
  expect(host.querySelector('[data-fetch-progress="row"]')).not.toBeNull();
  expect(inline()?.getAttribute("data-inline-results")).toBe("table-J2");
});

test("a past run listed on the page reopens inline (address &job=), and a reload shows it", () => {
  search = "source=google_maps_place";
  jobRows.J3 = job("J3");
  render();
  const row = host.querySelector('[data-past-run="J3"]') as HTMLButtonElement;
  expect(row).not.toBeNull();
  act(() => row.click());
  expect(pushed.some((h) => h.includes("job=J3"))).toBe(true);

  search = "source=google_maps_place&job=J3";
  render();
  expect(inline()?.getAttribute("data-inline-results")).toBe("table-J3");
});

test("a reload onto a run refills the form with what that run asked", () => {
  search = "source=google_maps_place&job=J4";
  jobRows.J4 = job("J4", { inputs: [{ url: "https://maps.example/place/1" }] });
  render();
  const seen = mockSourceInputValues.at(-1);
  expect(seen).toEqual({ url: "https://maps.example/place/1" });
});

test("the grid shows only the rows of the run on view, though runs share one table", () => {
  // Two runs of one source wrote the same table; each job carries the keys of its own rows.
  jobRows.A = job("A", { table_id: "shared", key_column: "Place Id", row_key_field: "place_id" });
  jobRows.B = job("B", { table_id: "shared", key_column: "Place Id", row_key_field: "place_id" });
  runKeys.A = ["p1", "p2", "p3"];
  runKeys.B = ["p9"];
  const filterOf = () => (host.querySelector('[data-testid="located-table"]') as HTMLElement).getAttribute("data-filter");

  search = "source=google_maps_place&job=A";
  render();
  expect(JSON.parse(filterOf() ?? "")).toEqual({ place_id: ["p1", "p2", "p3"] });

  // Switching to the other past run switches the filter.
  act(() => root.unmount());
  root = createRoot(host);
  search = "source=google_maps_place&job=B";
  render();
  expect(JSON.parse(filterOf() ?? "")).toEqual({ place_id: ["p9"] });
});

test("a run still filling with no stored rows yet holds the skeleton, never the whole shared table", () => {
  jobRows.C = job("C", { status: "fetching", table_id: "shared", key_column: "Place Id", row_key_field: null });
  search = "source=google_maps_place&job=C";
  render();
  expect(host.querySelector('[data-testid="located-table"]')).toBeNull();
  expect(host.querySelector("[data-results-coming]")).not.toBeNull();
});


test("a run whose keys cannot be told says so in one line, with a door to the full table (review I8)", () => {
  // An older run: no key field, no keys. The grid used to show the whole shared table with no word.
  jobRows.D = job("D", { table_id: "shared", key_column: "Place Id", row_key_field: null });
  search = "source=google_maps_place&job=D";
  render();
  expect(host.querySelector("[data-all-rows-notice]")?.textContent).toContain("Showing all saved rows: this run predates per-run results.");
  expect(host.querySelector("[data-all-rows-notice] [data-open-table]")).not.toBeNull();
  expect(host.querySelector("[data-run-scope]")?.getAttribute("data-run-scope")).toBe("all-rows");
});

test("a narrowed run needs no notice, and the run view never offers a record that would vanish (review I8)", () => {
  jobRows.E = job("E", { table_id: "shared", key_column: "Place Id", row_key_field: "place_id" });
  runKeys.E = ["p1"];
  search = "source=google_maps_place&job=E";
  render();
  expect(host.querySelector("[data-all-rows-notice]")).toBeNull();
  // Read-only: a record added here would carry no run key and disappear at once.
  expect(host.querySelector('[data-testid="located-table"]')?.getAttribute("data-read-only")).toBe("yes");
});

test("while a finished run's keys load, the skeleton holds the place, never the whole table", () => {
  jobRows.F = job("F", { table_id: "shared", key_column: "Place Id", row_key_field: "place_id" });
  keysLoading = true;
  search = "source=google_maps_place&job=F";
  render();
  expect(host.querySelector('[data-testid="located-table"]')).toBeNull();
  expect(host.querySelector("[data-all-rows-notice]")).toBeNull();
});

test("a reload mid-run refills the form with exactly what the run asked, not a made-up link", () => {
  // The run is re-attached (running, in memory) AND named in the address: the form still refills.
  search = "source=google_maps_place&job=G";
  jobRows.G = job("G", { status: "fetching", table_id: null, inputs: [{ keyword: "dental office in Mobile AL", country: "US" }] });
  runNow = { status: "running", progress: { label: "Working", current: null, total: null, jobId: "G" }, startedAt: Date.now() };
  render();
  expect(mockSourceInputValues.at(-1)).toEqual({ keyword: "dental office in Mobile AL", country: "US" });
});

test("a run whose worker lease lapsed is shown to the server so it can finish or close it", () => {
  const { getJob } = jest.requireMock("../../server") as { getJob: jest.Mock };
  getJob.mockReset().mockResolvedValue({});
  search = "source=google_maps_place&job=H";
  jobRows.H = job("H", { status: "waiting_for_provider", table_id: null, lease_until: "2000-01-01T00:00:00Z" });
  render();
  expect(getJob).toHaveBeenCalledWith("H", expect.objectContaining({ organizationId: "org-1" }));
});

test("a run with a live lease is left alone", () => {
  const { getJob } = jest.requireMock("../../server") as { getJob: jest.Mock };
  getJob.mockReset().mockResolvedValue({});
  search = "source=google_maps_place&job=I";
  jobRows.I = job("I", { status: "fetching", table_id: null, lease_until: new Date(Date.now() + 60_000).toISOString() });
  render();
  expect(getJob).not.toHaveBeenCalled();
});
