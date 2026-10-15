/**
 * FORCING TESTS for where a pending filing lives: the server, in the computer's own app_instances
 * row (`metadata.ai_work.pending_filings`), merged under the row's version. A start on one browser
 * resumes on another, and Matrx 2's own metadata keys survive. The supabase client is a faithful
 * in-memory double of the three queries the store makes (select by owner, guarded update).
 */
jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
jest.mock("@/lib/python-client", () => ({ getAccessTokenOrNull: jest.fn() }));
jest.mock("@ai-matrx/auth", () => ({ getClaimsUser: jest.fn() }));
jest.mock("@/features/files/devices/console/devices-query", () => ({ fetchConsoleDevices: jest.fn() }));
jest.mock("@/features/files/devices/console/relay", () => ({ fetchRelayStatus: jest.fn(), relayConnectUrl: jest.fn(), relaySubprotocols: jest.fn() }));
jest.mock("@/features/files/devices/console/sessions/model", () => ({ clientLabelFor: jest.fn() }));
jest.mock("@/features/ai-work/lib/matrxLocalRuntime", () => ({}));

import { createServerFilingStore } from "../matrx2Computers";
import type { PendingFiling } from "../matrx2Coding";

type Row = { id: string; user_id: string; is_active: boolean; deleted_at: string | null; version: number; metadata: Record<string, unknown> };

/** The rows a person's browsers share (the server), and a client that reads/writes them as PostgREST would. */
function server(rows: Row[]) {
  const client = {
    from(table: string) {
      if (table !== "app_instances") throw new Error(`unexpected table ${table}`);
      const filters: Array<(r: Row) => boolean> = [];
      let patch: Partial<Row> | null = null;
      const run = () => {
        const hit = rows.filter((r) => filters.every((f) => f(r)));
        if (patch) for (const r of hit) Object.assign(r, structuredClone(patch));
        return hit.map((r) => structuredClone(r));
      };
      const q = {
        select: () => q,
        update: (p: Partial<Row>) => ((patch = p), q),
        eq: (col: keyof Row, v: unknown) => (filters.push((r) => r[col] === v), q),
        is: (col: keyof Row, v: unknown) => (filters.push((r) => r[col] === v), q),
        maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
        then: (resolve: (v: unknown) => void) => resolve({ data: run(), error: null }),
      };
      return q;
    },
  };
  return client as never;
}

const filing = (over: Partial<PendingFiling> = {}): PendingFiling => ({
  deviceId: "dev-1",
  computerName: "Studio Mac",
  sessionId: "s1",
  providerSessionId: "chat-1",
  homes: [{ token: "project", id: "p1" }],
  startedAt: 1,
  ...over,
});

describe("pending filings live on the server, in the computer's row", () => {
  const rows = (): Row[] => [
    { id: "dev-1", user_id: "u1", is_active: true, deleted_at: null, version: 3, metadata: { app: "matrx2" } },
    { id: "dev-2", user_id: "u2", is_active: true, deleted_at: null, version: 1, metadata: { ai_work: { pending_filings: [filing({ deviceId: "dev-2", sessionId: "theirs" })] } } },
  ];

  // RED WHEN: list() stops reading the server (e.g. a browser-only store), so a second browser sees nothing.
  it("a filing put from one browser is listed on another, and Matrx 2's own keys survive", async () => {
    const db = rows();
    const browserA = createServerFilingStore(server(db), async () => "u1");
    const browserB = createServerFilingStore(server(db), async () => "u1");
    await browserA.put(filing());
    expect(await browserB.list()).toEqual([filing()]);
    expect(db[0]?.metadata).toEqual({ app: "matrx2", ai_work: { pending_filings: [filing()] } });
    expect(db[0]?.version).toBe(4);
  });

  it("is cleared by remove, and never lists another person's", async () => {
    const db = rows();
    const store = createServerFilingStore(server(db), async () => "u1");
    await store.put(filing());
    await store.remove(filing());
    expect(await store.list()).toEqual([]);
    expect(db[0]?.metadata).toEqual({ app: "matrx2", ai_work: { pending_filings: [] } });
  });

  it("says why a write did not land, never silently", async () => {
    const store = createServerFilingStore(server(rows()), async () => "u1");
    await expect(store.put(filing({ deviceId: "dev-gone" }))).rejects.toThrow("The pending filing could not be saved: that computer's row is not visible to you.");
  });
});
