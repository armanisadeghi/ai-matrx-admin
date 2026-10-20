/** @jest-environment node */
// A SERVER SEED SLOWER THAN THE CAP NEVER DELAYS FIRST PAINT, AND IS NEVER THROWN AWAY (lane SERVER-ROWS-2).
//
// Dr. Patel opens "Visits" on a cold morning: the server's first reads take 1.6 s, past the old
// 1.2 s cap. Before this, the cap answered "no seed" at 1.2 s, the server's HTML streamed the
// skeleton for good, the seed that landed at 1.6 s was dropped, and the browser asked every door
// again from hydration — so a miss made the page slower than the knob off (2 of 12 live pairs,
// SERVER-ROWS 2026-10-20). Now:
//  1. the shell and the skeleton flush at once (first paint never waits for the seed);
//  2. the rows stream into the SAME server render when the seed lands, however late;
//  3. the browser's own read of the first page takes the server's late answer when it lands first.
// RED before: (2) the stream ended at 1.2 s with the skeleton only; (3) the server seed was null.

jest.mock("server-only", () => ({}), { virtual: true });

const SERVER_DELAY_MS = 1600; // past the old 1.2 s cap
const ORG = "0a54df90-eab8-4d07-ab29-81a45fb41e04";
const VISITS = "5a1e0000-0000-4000-8000-0000000000aa";
const PAGE_ARGS = { p_table_id: VISITS, p_limit: 100 };

jest.mock("@/utils/supabase/server", () => ({
  createClient: async () => ({
    schema: () => ({
      rpc: (fn: string) =>
        new Promise((resolve) =>
          setTimeout(
            () => resolve(fn === "where_id_opens" ? { data: { kind: "table", organization_id: ORG }, error: null } : { data: null, error: { message: fn } }),
            SERVER_DELAY_MS - 200,
          ),
        ),
    }),
  }),
}));
jest.mock("@/utils/supabase/claimsUser", () => ({
  getClaimsUser: async () => ({ data: { user: { id: "87a6e699-3622-4869-8843-d0867456c0dd" } } }),
}));
jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({}) }));
jest.mock("@/lib/boot/primaryContent", () => ({ holdPrimaryContent: () => () => {} }));
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: () => null }));
jest.mock("@/lib/redux/selectors/userSelectors", () => ({ selectUserId: () => null }));
jest.mock("@ai-matrx/records-ui/skeleton", () => ({
  TablePageSkeleton: () => <div data-testid="skeleton" />,
  RecordsSkeleton: () => <div data-testid="skeleton" />,
}));
jest.mock("../primeTablePage", () => ({ primeTablePage: () => {} }));
jest.mock("@/features/unified-data/table-page/UnifiedDataTablePage", () => ({
  UnifiedDataTablePage: () => <div data-testid="page" />,
}));
jest.mock("@/features/unified-data/table-page/UnifiedRecordPage", () => ({ UnifiedRecordPage: () => <div data-testid="record" /> }));
jest.mock("@ai-matrx/records/react", () => ({
  RecordsSeedProvider: ({ seed, children }: { seed: { from?: string } | null; children: React.ReactNode }) => (
    <div data-testid="seeded" data-from={seed?.from ?? "none"}>
      {children}
    </div>
  ),
}));
jest.mock("@/features/data-tables/records-ui-host/recordsDataSource", () => ({ useRecordsDataSource: () => ({ rpc: async () => ({ data: null, error: null }) }) }));
jest.mock("@ai-matrx/records-ui/first-page", () => ({
  serverRowsOf: () => ({ on: true, capMs: 1200 }),
  // The server's chain (where already answered): bundle, then the first page — 200 ms more.
  // The browser's: the same doors through its racing data source.
  askTablePageSeed: async ({ dataSource, rows }: { dataSource: { rpc?: (fn: string, args: unknown, o: unknown) => Promise<{ data: unknown }> }; rows: boolean | ((asked: unknown) => boolean) }) => {
    if (typeof rows === "function") {
      const asked = { at: Date.now(), answers: [{ door: "table_page_bundle", args: {}, data: {} }] };
      if (!rows(asked)) return asked;
      await new Promise((resolve) => setTimeout(resolve, 200));
      return { at: Date.now(), from: "server", answers: [...asked.answers, { door: "read_records_page", args: PAGE_ARGS, data: { from: "server" } }] };
    }
    const page = await dataSource.rpc!("read_records_page", PAGE_ARGS, { schema: "custom" });
    return { at: Date.now(), from: "browser", answers: [{ door: "read_records_page", args: PAGE_ARGS, data: page.data }] };
  },
}));

import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";

import { PrimedTablePage } from "../PrimedTablePages";
import { askClientTableSeed } from "../clientTableSeed";
import { readTablePage } from "../tablePageSeed.server";
import { forgetObjectOrganizations } from "../../objectOrganization";

function streamed(element: React.ReactElement): Promise<Array<{ at: number; html: string }>> {
  const t0 = Date.now();
  const chunks: Array<{ at: number; html: string }> = [];
  return new Promise((resolve, reject) => {
    const sink = new PassThrough();
    sink.on("data", (b: Buffer) => chunks.push({ at: Date.now() - t0, html: b.toString() }));
    sink.on("end", () => resolve(chunks));
    const { pipe } = renderToPipeableStream(element, { onShellReady: () => pipe(sink), onShellError: reject });
  });
}

it("FIRST PAINT AT ONCE, ROWS WHEN THEY LAND: the skeleton flushes immediately and the late seed's page streams into the same render", async () => {
  const reads = readTablePage(VISITS);
  // Inside the route's layout (the app shell), as Next renders it: a root-level boundary alone is never flushed early.
  const chunks = await streamed(
    <main>
      <PrimedTablePage tableId={VISITS} gate={reads.gate} seed={reads.seed} opening={reads.opening} />
    </main>,
  );
  // 1. the first chunk is the shell with the skeleton, long before the seed (≥ 1.6 s)
  expect(chunks[0]!.at).toBeLessThan(300);
  expect(chunks[0]!.html).toContain('data-testid="skeleton"');
  expect(chunks[0]!.html).not.toContain('data-testid="page"');
  // 2. the server's page is in the same response, streamed when the seed landed — not dropped at 1.2 s
  const all = chunks.map((c) => c.html).join("");
  expect(all).toContain('data-from="server"');
  expect(all).toContain('data-testid="page"');
  const pageAt = chunks.find((c) => c.html.includes('data-testid="page"'))!.at;
  expect(pageAt).toBeGreaterThanOrEqual(SERVER_DELAY_MS - 100);
}, 10_000);

it("THE BROWSER TAKES THE SERVER'S LATE PAGE: its own slower read of the same door does not decide when the rows draw", async () => {
  forgetObjectOrganizations();
  const reads = readTablePage(VISITS);
  const t0 = Date.now();
  const own = {
    rpc: (fn: string) =>
      new Promise((resolve) =>
        setTimeout(() => resolve({ data: fn === "where_id_opens" ? { kind: "table", organization_id: ORG } : { from: "browser" }, error: null }), fn === "read_records_page" ? 4000 : 50),
      ),
    schema: () => ({}),
  } as never;
  const seed = await askClientTableSeed(own, VISITS, { server: reads.seed, opening: reads.opening });
  const page = seed?.records?.answers.find((a) => a.door === "read_records_page");
  expect(page?.data).toEqual({ from: "server" });
  // drawn at the server's time (~1.6 s), not the browser's own 4 s read
  expect(Date.now() - t0).toBeLessThan(3000);
}, 10_000);
