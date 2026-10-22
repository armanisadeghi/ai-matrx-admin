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
  function LocatedTableStandIn(props: { tableId: string }) {
    return <div data-testid="located-table" data-table={props.tableId} />;
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
  RecordPageHeader: ({ record }: { record: { name: string } }) => <h1 data-testid="title">{record.name}</h1>,
}));
jest.mock("@/components/cost/useCostDisplay", () => ({ useCostDisplay: () => ({ rate: null }), useSeesDollars: () => false }));
jest.mock("../hooks", () => ({
  useLibraryOrganizationId: () => "org-1",
  useLibrary: () => ({ isLoading: false, error: null, data: LIBRARY, refetch: jest.fn() }),
  usePriceText: () => () => "40 points",
  libraryKey: (o: string) => ["data-sources", "library", o],
}));
jest.mock("../../hooks", () => ({ limitSettingHref: () => null, fetchedTablesKey: ["data-sources", "fetched-tables"] }));
jest.mock("../../SourceInputFields", () => ({ SourceInputFields: () => <div data-testid="inputs" />, modeOf: () => ({ option: null }) }));
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
jest.mock("../runHistory", () => {
  const actual = jest.requireActual("../runHistory");
  return {
    ...actual,
    useDataFetchJob: (id: string | null) => ({ isLoading: false, data: id ? (jobRows[id] ?? null) : null }),
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
    { key: "google_maps_place", label: "Google Maps place", group: "Places & local business", input: { kind: "url" }, verified_live: true, usd_per_record: 0.002 },
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
