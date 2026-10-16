/**
 * A mode's setup save must never delete another surface's key on the same set
 * metadata (2026-10-16: the matrix save overwrote the whole blob, so every
 * re-save dropped `decision_verdicts` — and would drop the Smart Add bench).
 */

const rows: { id: string; version: number; metadata: Record<string, unknown> }[] = [];
const updates: Record<string, unknown>[] = [];

function chain(result: () => unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "is", "order"]) c[m] = () => c;
  c.maybeSingle = async () => ({ data: result(), error: null });
  c.single = c.maybeSingle;
  return c;
}

jest.mock("@/utils/supabase/client", () => ({
  createClient: () => {
    const from = () => ({
      select: () => chain(() => rows[0] ?? null),
      update: (patch: Record<string, unknown>) => {
        updates.push(patch);
        return chain(() => {
          const row = rows[0];
          row.metadata = patch.metadata as Record<string, unknown>;
          row.version = patch.version as number;
          return row;
        });
      },
    });
    const client = { from, schema: () => client };
    return client;
  },
}));
jest.mock("@/lib/organizations/ensureOrgId", () => ({ ensureOrgId: async (o: string | null) => o ?? "org" }));

import { updateComparisonSetMetadata } from "../comparisonSetsService";

beforeEach(() => {
  rows.length = 0;
  updates.length = 0;
  rows.push({
    id: "set-1",
    version: 3,
    metadata: {
      mode: "matrix",
      matrix: { schema_version: 1 },
      decision_verdicts: { is_this_us: { answer: "yes", notedAt: "2026-10-16T00:00:00Z" } },
      smart_add_bench: { truth: { r1: "ours" } },
    },
  });
});

test("a setup save keeps every key it does not own", async () => {
  await updateComparisonSetMetadata("set-1", { mode: "matrix", matrix: { schema_version: 1, repeats: 2 } });
  const written = updates.at(-1)?.metadata as Record<string, unknown>;
  expect(written.matrix).toEqual({ schema_version: 1, repeats: 2 });
  expect(written.decision_verdicts).toEqual({ is_this_us: { answer: "yes", notedAt: "2026-10-16T00:00:00Z" } });
  expect(written.smart_add_bench).toEqual({ truth: { r1: "ours" } });
});

test("the write is guarded on the row version", async () => {
  await updateComparisonSetMetadata("set-1", { mode: "matrix" });
  expect(updates.at(-1)?.version).toBe(4);
});
