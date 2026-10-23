/**
 * SUT: `reprocessItem` / `handOffItem` — the "Reprocess" action's real write.
 * Before 2026-10-23 the action called `closeItem`, which refuses a settled item,
 * so it toasted "Queued for reprocessing" and wrote nothing. Reprocess is now
 * its own deliberate `processed → captured` (the server re-runs on that
 * transition); `handOffItem` routes a capturing item to `closeItem` and a
 * captured one to nothing.
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

import { handOffItem, reprocessItem } from "./service";
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
    notes: ROW.notes,
    folderPath: ROW.folder_path,
    status,
    createdAt: ROW.created_at,
    version,
  };
}

function savedRow(status: string, version: number) {
  return { ...ROW, status, version };
}

beforeEach(() => {
  updates.length = 0;
  guardedUpdate.mockReset();
});

test("reprocess walks a processed item back to captured — the server re-runs on it", async () => {
  guardedUpdate.mockImplementation(async (opts: GuardedOpts) => {
    await opts.applyUpdate({ expectedVersion: opts.expectedVersion, nextVersion: opts.expectedVersion + 1 });
    return { status: "saved", row: savedRow("captured", opts.expectedVersion + 1) };
  });
  const out = await reprocessItem(item("processed", 7));
  expect(out.status).toBe("captured");
  expect(updates).toEqual([{ status: "captured", version: 8 }]);
});

test("reprocess writes nothing for an item that is not settled", async () => {
  const out = await reprocessItem(item("capturing", 2));
  expect(out.status).toBe("capturing");
  expect(guardedUpdate).not.toHaveBeenCalled();
});

test("the manage press hands a capturing item over and leaves a captured one alone", async () => {
  guardedUpdate.mockImplementation(async (opts: GuardedOpts) => {
    await opts.applyUpdate({ expectedVersion: opts.expectedVersion, nextVersion: opts.expectedVersion + 1 });
    return { status: "saved", row: savedRow("captured", opts.expectedVersion + 1) };
  });
  expect((await handOffItem(item("capturing", 1))).status).toBe("captured");
  expect(updates).toEqual([{ status: "captured", version: 2 }]);
  updates.length = 0;
  expect((await handOffItem(item("captured", 3))).status).toBe("captured");
  expect(updates).toEqual([]);
});
