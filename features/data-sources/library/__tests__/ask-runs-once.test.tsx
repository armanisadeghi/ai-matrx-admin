/** @jest-environment jsdom */
//
// Review C-1 + I-3 (2026-10-22). The plain-language box's auto-run fires at most ONCE per ask, keyed by a one-time
// ask id spent on first sight: Back and reopening the source (a re-mount with the same ask) never bills a second
// fetch. And an ask that dropped a filter never auto-runs: it says what was not applied and offers Run anyway.

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
  function LocatedTableStandIn(props: { tableId: string; filter?: unknown; readOnly?: boolean }) {
    return (
      <div
        data-testid="located-table"
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
const mockStartRun = jest.fn();
jest.mock("../../runs", () => ({
  useRun: () => runNow,
  runState: () => runNow,
  clearRun: jest.fn(),
  startRun: (...a: unknown[]) => mockStartRun(...a),
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

import { SourceDetail, type SourceAsk } from "../SourceDetail";
import { newAsk } from "../askRun";
import { parseLibrary } from "../catalog";

const LIBRARY = parseLibrary({
  sources: [
    { key: "google_maps_place", label: "Google Maps place", group: "Places & local business", input: { kind: "url" }, verified_live: true, usd_per_record: 0.002 },
  ],
});

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
const mount = async (ask: SourceAsk) => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root.render(
      <QueryClientProvider client={new QueryClient()}>
        <SourceDetail sourceKey="google_maps_place" ask={ask} />
      </QueryClientProvider>,
    );
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 5));
  });
};
const unmount = () => {
  act(() => root.unmount());
  host.remove();
};
const values = { url: "https://www.google.com/maps/place/Joe" };
const asked = (run: boolean, over: Partial<SourceAsk> = {}): SourceAsk => ({ nonce: newAsk(run), values, option: null, run, unapplied: [], ...over });

beforeEach(() => {
  mockStartRun.mockClear();
  runNow = { status: "idle" };
});

test("an ask runs once; Back and reopening the source with the same ask never runs it again", async () => {
  const ask = asked(true);
  await mount(ask);
  expect(mockStartRun).toHaveBeenCalledTimes(1);
  // the run finished, the person pressed Back (unmount), then opened the card again (same ask, re-mount)
  runNow = { status: "done", result: { job_id: "", table_id: "", columns: [], records_billed: 1, cost_usd: 0, values_as_text: 0, limit_applied: null, rows_created: 0, rows_updated: 0 } };
  unmount();
  await mount(ask);
  unmount();
  await mount(ask);
  expect(mockStartRun).toHaveBeenCalledTimes(1);
  unmount();
});

test("a new ask is a new ticket and runs once", async () => {
  await mount(asked(true));
  unmount();
  await mount(asked(true));
  unmount();
  expect(mockStartRun).toHaveBeenCalledTimes(2);
});

test("an ask that dropped a filter stops, says what, and runs only on Run anyway", async () => {
  await mount(asked(false, { unapplied: ["Under $600k"], canRunAnyway: true, alternative: { key: "realtor", label: "Realtor homes" } }));
  expect(mockStartRun).not.toHaveBeenCalled();
  const line = host.querySelector("[data-ask-unapplied]");
  expect(line?.textContent).toContain("Not applied here: Under $600k");
  expect(host.querySelector('[data-ask-switch="realtor"]')).toBeNull(); // no switch handler given: no dead button
  const anyway = host.querySelector("[data-ask-run-anyway]") as HTMLButtonElement;
  expect(anyway).not.toBeNull();
  act(() => anyway.click());
  expect(mockStartRun).toHaveBeenCalledTimes(1);
  unmount();
});
