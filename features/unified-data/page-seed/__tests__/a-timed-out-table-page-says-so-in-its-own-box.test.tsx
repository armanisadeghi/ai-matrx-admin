/** @jest-environment jsdom */
// A TABLE PAGE WHOSE FIRST READS TIME OUT SAYS SO (lane AT-FIX-G4).
//
// test@test.com opens a table in the 883-table Workspace. The store cancels `table_page_bundle` at its
// statement timeout. Before: the route sat on its skeleton through the store's own retries and then drew
// (or not) with nothing said, because a seed with no bundle was treated as "the page asks for itself".
// Now: the first reads are asked once more automatically; if the store still times out, the shared timeout
// sentence and Try again are drawn INSIDE the skeleton's box (the skeleton stays mounted: zero layout shift),
// and Try again asks afresh and draws the page when the store answers.

import { act } from "react";
import { createRoot } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const roots: Array<ReturnType<typeof createRoot>> = [];
async function render(element: React.ReactElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  roots.push(root);
  await act(async () => root.render(element));
}
const byId = (id: string) => document.querySelector(`[data-testid="${id}"]`);

const asked: string[] = [];
let storeTimesOut = true;

jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({}) }));
jest.mock("@/lib/boot/primaryContent", () => ({ holdPrimaryContent: () => () => {} }));
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: () => "0a54df90-eab8-4d07-ab29-81a45fb41e04" }));
jest.mock("@/lib/redux/selectors/userSelectors", () => ({ selectUserId: () => null }));
jest.mock("@ai-matrx/records-ui/skeleton", () => ({
  TablePageSkeleton: () => <div data-testid="skeleton" className="animate-pulse" />,
  RecordsSkeleton: () => <div data-testid="skeleton" className="animate-pulse" />,
}));
jest.mock("../primeTablePage", () => ({ primeTablePage: () => {} }));
jest.mock("@/features/unified-data/table-page/UnifiedDataTablePage", () => ({ UnifiedDataTablePage: () => <div data-testid="page" /> }));
jest.mock("@/features/unified-data/table-page/UnifiedRecordPage", () => ({ UnifiedRecordPage: () => <div data-testid="record" /> }));
jest.mock("@ai-matrx/records/react", () => ({
  RecordsSeedProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="seeded">{children}</div>,
}));
jest.mock("@ai-matrx/design-system", () => ({
  isTimedOutError: (error: { code?: string } | null | undefined) => error?.code === "57014" || error?.code === "timed_out",
  ErrorNotice: ({ error, onRetry }: { error: { code?: string }; onRetry?: () => void }) => (
    <div role="alert" data-testid="notice">
      <span>{error?.code === "timed_out" ? "That took too long. Nothing was lost; try again." : "Something went wrong."}</span>
      {onRetry ? (
        <button type="button" data-error-retry="" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  ),
}));
jest.mock("@/features/data-tables/records-ui-host/recordsDataSource", () => ({
  useRecordsDataSource: () => ({
    rpc: async (fn: string) => {
      asked.push(fn);
      if (fn === "where_id_opens") {
        return { data: { kind: "table", organization_id: "0a54df90-eab8-4d07-ab29-81a45fb41e04", path: null, live: true }, error: null };
      }
      if (storeTimesOut) return { data: null, error: { code: "57014", message: "canceling statement due to statement timeout" } };
      return { data: { table: {} }, error: null };
    },
  }),
}));
// The package's seed asker: asks the bundle through the data source it is given, as the real one does.
jest.mock("@ai-matrx/records-ui/first-page", () => ({
  askTablePageSeed: async ({ dataSource }: { dataSource: { rpc: (fn: string, args: unknown) => Promise<{ data: unknown; error: unknown }> } }) => {
    const bundle = await dataSource.rpc("table_page_bundle", {});
    return { at: Date.now(), from: "browser", answers: bundle.error ? [] : [{ door: "table_page_bundle", args: {}, data: bundle.data }] };
  },
}));

import { forgetObjectOrganizations } from "../../objectOrganization";
import { PrimedTablePage } from "../PrimedTablePages";
import type { ServerRowsGate } from "../tablePageSeed.server";

const VISITS = "5a1e0000-0000-4000-8000-0000000000bb";
const noServer = () => ({ gate: Promise.resolve<ServerRowsGate>({ on: false, capMs: 1200 }), seed: Promise.resolve(null) });
const bundleAsks = () => asked.filter((fn) => fn === "table_page_bundle").length;

beforeEach(() => {
  document.body.innerHTML = "";
  jest.useFakeTimers();
  asked.length = 0;
  storeTimesOut = true;
  forgetObjectOrganizations();
});
afterEach(() => {
  act(() => roots.splice(0).forEach((root) => root.unmount()));
  jest.useRealTimers();
});

it("a bundle that times out is asked once more by itself, then the page SAYS so in the skeleton's own box", async () => {
  const { gate, seed } = noServer();
  await render(<PrimedTablePage tableId={VISITS} gate={gate} seed={seed} />);
  await act(async () => {
    await jest.advanceTimersByTimeAsync(100);
  });
  expect(bundleAsks()).toBe(1);
  expect(byId("notice")).toBeNull();
  expect(byId("skeleton")).not.toBeNull();
  await act(async () => {
    await jest.advanceTimersByTimeAsync(3000);
  });
  // exactly ONE automatic retry, never a loop
  expect(bundleAsks()).toBe(2);
  expect(byId("notice")?.textContent).toContain("That took too long. Nothing was lost; try again.");
  expect(document.querySelector("[data-error-retry]")?.textContent).toBe("Try again");
  // the page is not drawn on a store that said no, and it never silently looks loaded
  expect(byId("page")).toBeNull();
  // ZERO LAYOUT SHIFT: the skeleton stays mounted inside the same box, still and hidden from assistive tech
  const frame = document.querySelector("[data-table-timed-out]");
  expect(frame).not.toBeNull();
  expect(frame!.contains(byId("skeleton"))).toBe(true);
  expect(byId("skeleton")!.closest("[aria-hidden=true]")).not.toBeNull();
  await act(async () => {
    await jest.advanceTimersByTimeAsync(20000);
  });
  expect(bundleAsks()).toBe(2);
});

it("a timeout the automatic retry gets past is never said: the page draws", async () => {
  const { gate, seed } = noServer();
  await render(<PrimedTablePage tableId={VISITS} gate={gate} seed={seed} />);
  await act(async () => {
    await jest.advanceTimersByTimeAsync(100);
  });
  storeTimesOut = false;
  await act(async () => {
    await jest.advanceTimersByTimeAsync(3000);
  });
  expect(byId("notice")).toBeNull();
  expect(byId("page")).not.toBeNull();
});

it("Try again asks afresh, shows the skeleton in the same box meanwhile, and draws the page once the store answers", async () => {
  const { gate, seed } = noServer();
  await render(<PrimedTablePage tableId={VISITS} gate={gate} seed={seed} />);
  await act(async () => {
    await jest.advanceTimersByTimeAsync(3200);
  });
  expect(byId("notice")).not.toBeNull();
  storeTimesOut = false;
  await act(async () => {
    (document.querySelector("[data-error-retry]") as HTMLButtonElement).click();
  });
  await act(async () => {
    await jest.advanceTimersByTimeAsync(200);
  });
  expect(bundleAsks()).toBe(3);
  expect(byId("notice")).toBeNull();
  expect(byId("page")).not.toBeNull();
});
