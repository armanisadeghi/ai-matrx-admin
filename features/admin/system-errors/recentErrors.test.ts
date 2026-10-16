import { readFileSync } from "fs";
import { join } from "path";

type Call = [string, ...unknown[]];
const calls: Call[][] = [];
const rpcCalls: string[] = [];
let rowsFor: (n: number) => unknown[] = () => [];

function builder() {
  const log: Call[] = [];
  calls.push(log);
  const b: Record<string, unknown> = {};
  for (const m of ["schema", "from", "select", "gt", "lte", "eq", "or", "order", "limit"]) {
    b[m] = (...a: unknown[]) => {
      log.push([m, ...a]);
      return b;
    };
  }
  b.rpc = (fn: string) => {
    rpcCalls.push(fn);
    return Promise.resolve({ data: "2026-10-16T12:00:07.123+00:00", error: null });
  };
  b.then = (res: (v: unknown) => unknown) => {
    const limited = log.find((c) => c[0] === "limit")?.[1] as number;
    return Promise.resolve(
      limited === 0
        ? { data: [], count: 1234, error: null }
        : { data: rowsFor(limited), count: 1234, error: null },
    ).then(res);
  };
  return b;
}

jest.mock("@/utils/supabase/client", () => ({ createClient: () => builder() }));

import { fetchRecentSystemErrors } from "./recentErrors";

const row = (i: number) => ({ id: `id-${i}`, occurred_at: `2026-10-16T00:00:${String(60 - i).padStart(2, "0")}+00:00`, kind: "k" });

beforeEach(() => {
  calls.length = 0;
  rpcCalls.length = 0;
});

describe("system errors are read from ops.system_error, not the server", () => {
  it("reads the table with the frozen window and returns the server's shape", async () => {
    rowsFor = (lim) => Array.from({ length: Math.min(lim, 4) }, (_, i) => row(i));
    const out = await fetchRecentSystemErrors({
      since_hours: 24,
      limit: 3,
      snapshot_at: "2026-10-16T12:00:00.000Z",
      kind: "provider_outage",
      unresolved_only: true,
    });
    const page = calls[1];
    expect(page).toContainEqual(["schema", "ops"]);
    expect(page).toContainEqual(["from", "system_error"]);
    expect(page).toContainEqual(["gt", "occurred_at", "2026-10-15T12:00:00.000Z"]);
    expect(page).toContainEqual(["lte", "created_at", "2026-10-16T12:00:00.000Z"]);
    expect(page).toContainEqual(["eq", "kind", "provider_outage"]);
    expect(page).toContainEqual(["or", "resolved_at.is.null,resolved_at.gt.2026-10-16T12:00:00.000Z"]);
    expect(page).toContainEqual(["order", "occurred_at", { ascending: false }]);
    expect(page).toContainEqual(["order", "id", { ascending: false }]);
    expect(page).toContainEqual(["limit", 4]);
    expect(out.total).toBe(1234);
    expect(out.count).toBe(3);
    expect(out.errors).toHaveLength(3);
    expect(out.next_cursor_id).toBe("id-2");
    expect(out.next_cursor_occurred_at).toBe(row(2).occurred_at);
    expect(out.snapshot_at).toBe("2026-10-16T12:00:00.000Z");
  });

  it("applies the keyset cursor and ends the list when no extra row exists", async () => {
    rowsFor = () => [row(0), row(1)];
    const out = await fetchRecentSystemErrors({
      since_hours: 6,
      limit: 5,
      snapshot_at: "2026-10-16T12:00:00.000Z",
      cursor_occurred_at: "2026-10-16T00:00:30+00:00",
      cursor_id: "abc",
    });
    expect(calls[1]).toContainEqual([
      "or",
      "occurred_at.lt.2026-10-16T00:00:30+00:00,and(occurred_at.eq.2026-10-16T00:00:30+00:00,id.lt.abc)",
    ]);
    expect(calls[0].some((c) => c[0] === "or")).toBe(false);
    expect(out.next_cursor_id).toBeNull();
  });

  it("the first page freezes the snapshot on the DATABASE clock, not the browser's", async () => {
    rowsFor = () => [row(0)];
    jest.useFakeTimers().setSystemTime(new Date("2031-01-01T00:00:00Z")); // a skewed browser clock
    try {
      const out = await fetchRecentSystemErrors({ since_hours: 1, limit: 5 });
      expect(rpcCalls).toEqual(["server_now"]);
      expect(out.snapshot_at).toBe("2026-10-16T12:00:07.123Z");
      expect(calls.some((l) => l.some((c) => c[0] === "lte" && c[2] === "2026-10-16T12:00:07.123Z"))).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it("counts the window once: the first page counts, later pages carry the total", async () => {
    rowsFor = () => [row(0)];
    const first = await fetchRecentSystemErrors({ since_hours: 1, limit: 5 });
    expect(first.total).toBe(1234);
    const selects = calls.map((l) => l.find((c) => c[0] === "select")).filter(Boolean);
    expect(selects).toHaveLength(2);
    expect(selects[0]?.[2]).toEqual({ count: "exact" }); // the first page counts...
    expect(selects[1]?.[2]).toBeUndefined(); // ...the page query does not.

    calls.length = 0;
    rpcCalls.length = 0;
    const next = await fetchRecentSystemErrors({
      since_hours: 1,
      limit: 5,
      snapshot_at: first.snapshot_at,
      total: first.total,
      cursor_occurred_at: "2026-10-16T00:00:30+00:00",
      cursor_id: "abc",
    });
    expect(calls).toHaveLength(1); // the page query only, no count query
    expect(rpcCalls).toEqual([]); // and no new snapshot
    expect(next.total).toBe(1234);
  });

  it("the panel no longer calls the server for this list", () => {
    const src = readFileSync(join(__dirname, "SystemErrorsPanel.tsx"), "utf8");
    expect(src).not.toMatch(/recentErrors\(serverApi/);
    expect(src).toMatch(/fetchRecentSystemErrors/);
  });
});
