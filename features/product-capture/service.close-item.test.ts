/**
 * SUT: `closeItem` — THE one handoff both capture lanes write (one lifecycle,
 * two entry points, Arman 2026-10-23). The instant lane calls it right after
 * its analysis record is saved, so `capturing → captured` fires the server
 * run, which skips its analyzer and researches the stored products.
 *
 * Two properties are load-bearing: a `capturing` item IS handed over, and a
 * `processed` item is NEVER walked back to `captured` — not from the caller's
 * copy, and not from the row that lands on a version conflict either (an
 * instant item the server already settled, revisited from a stale copy).
 */

const updates: Array<Record<string, unknown>> = [];

function chain(): Record<string, unknown> {
  const c: Record<string, unknown> = {};
  c.update = (patch: Record<string, unknown>) => {
    updates.push(patch);
    return c;
  };
  c.eq = () => c;
  c.select = () => c;
  c.maybeSingle = () => Promise.resolve({ data: null, error: null });
  return c;
}

const from = jest.fn(() => chain());
const schema = jest.fn(() => ({ from }));
const createClient = jest.fn(() => ({ schema }));
jest.mock("@/utils/supabase/client", () => ({ createClient }));

type GuardedOpts = {
  expectedVersion: number;
  applyUpdate: (v: { expectedVersion: number; nextVersion: number }) => unknown;
};
const guardedUpdate = jest.fn();
jest.mock("@ai-matrx/data/db", () => ({
  guardedUpdate: (opts: GuardedOpts) => guardedUpdate(opts),
  readAllRows: jest.fn(),
}));

import { closeItem } from "./service";
import type { CaptureItem } from "./types";

const ROW = {
  id: "b3a077e0-5c68-44c6-a7fc-0c46eb669301",
  organization_id: "d3a077e0-5c68-44c6-a7fc-0c46eb669301",
  code: "SKU-4471",
  code_source: "manual",
  notes: "",
  folder_path: "Captures/SKU-4471",
  created_at: "2026-10-23T12:00:00.000Z",
};

function item(status: CaptureItem["status"], version: number): CaptureItem {
  return {
    id: ROW.id,
    organizationId: ROW.organization_id,
    code: ROW.code,
    codeSource: "manual",
    notes: "",
    folderPath: ROW.folder_path,
    status,
    createdAt: ROW.created_at,
    version,
  };
}

describe("closeItem — the one handoff to the server pipeline", () => {
  beforeEach(() => {
    updates.length = 0;
    guardedUpdate.mockReset();
  });

  it("hands a capturing item over as captured (fires the server run)", async () => {
    guardedUpdate.mockImplementation(async (opts: GuardedOpts) => {
      opts.applyUpdate({ expectedVersion: 3, nextVersion: 4 });
      return { status: "saved", row: { ...ROW, status: "captured", version: 4 } };
    });
    const saved = await closeItem(item("capturing", 3));
    expect(updates).toEqual([{ status: "captured", version: 4 }]);
    expect(saved.status).toBe("captured");
  });

  it.each(["processed", "captured"] as const)(
    "never writes on an item already %s",
    async (status) => {
      const saved = await closeItem(item(status, 5));
      expect(guardedUpdate).not.toHaveBeenCalled();
      expect(saved.status).toBe(status);
    },
  );

  it("re-decides against the landed row: a conflict that reveals 'processed' never walks it back", async () => {
    // The caller's copy says capturing (stale), but the server already settled
    // the item: the first swap loses and returns the real row.
    guardedUpdate.mockImplementationOnce(async (opts: GuardedOpts) => {
      opts.applyUpdate({ expectedVersion: 3, nextVersion: 4 });
      return { status: "conflict", currentRow: { ...ROW, status: "processed", version: 7 } };
    });
    const saved = await closeItem(item("capturing", 3));
    expect(guardedUpdate).toHaveBeenCalledTimes(1);
    expect(updates).toEqual([{ status: "captured", version: 4 }]); // the lost swap only
    expect(saved.status).toBe("processed");
    expect(saved.version).toBe(7);
  });
});
