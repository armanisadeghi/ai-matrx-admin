// RESTORE-ADVANCE (ADVERSARIAL-8 F2, 2026-10-22): "Restore it" on SP0521's removed copy stuck at "Restoring … 1/36" for 5 minutes,
// twice, and brought nothing back. The store now answers every restore call that brought nothing back with a refusal; when that
// call ran out of time with items it never tried (`untried` > 0, its refused items moved to the back), the Spaces client asks
// again, bounded by what is still archived. A dead end (`untried` 0) is said once, as one sentence.
//
// The seam: the real runCopyDoor + runTemplateDoor over a fake supabase client that answers custom.template_restore in turns.

type Answer = Record<string, unknown>;
const turns: Answer[] = [];
let calls = 0;

jest.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    schema: () => ({
      rpc: async (fn: string) => {
        if (fn !== "template_restore") return { data: null, error: null };
        calls++;
        return { data: turns.shift() ?? null, error: null };
      },
    }),
  }),
}));

import { restoreRetriesLeft, runCopyDoor } from "../template-copy";

const item = (n: number) => ({ kind: "table", id: `t${n}`, title: `Table ${n}` });
const stalled = (left: number, untried: number): Answer => ({
  install_id: "i", state: "uninstalled", done: false, archived: Array.from({ length: left }, (_, n) => item(n)),
  refusal: { kind: "table", title: "Publishers and distributors", code: "23514", stalled: true, untried,
             message: "This could not be brought back as it was archived: a field reads through a relation that is not back yet." },
});
const restored: Answer = { install_id: "i", state: "installed", done: true, restored: true, archived: [] };
const copy = { organizationId: "org", installId: "i" };

beforeEach(() => { turns.length = 0; calls = 0; });

test("a stalled call with untried items is asked again, and the copy comes back", async () => {
  turns.push(stalled(35, 30), stalled(35, 20), restored);
  const out = await runCopyDoor("template_restore", copy);
  expect(out.ok).toBe(true);
  expect(calls).toBe(3);
});

test("a dead end (nothing untried) stops at once with one sentence", async () => {
  turns.push(stalled(2, 0), restored);
  const out = await runCopyDoor("template_restore", copy);
  expect(out.ok).toBe(false);
  expect(calls).toBe(1);
  if (!out.ok) expect(out.message.split(/(?<=[.!?])\s+/).length).toBe(1);
});

test("retries are bounded by the items still archived", async () => {
  for (let k = 0; k < 10; k++) turns.push(stalled(3, 3));
  const out = await runCopyDoor("template_restore", copy);
  expect(out.ok).toBe(false);
  expect(calls).toBeLessThanOrEqual(4);
});

test("only a stalled refusal with untried items is retried", () => {
  expect(restoreRetriesLeft(stalled(5, 2) as never)).toBe(5);
  expect(restoreRetriesLeft(stalled(5, 0) as never)).toBe(0);
  expect(restoreRetriesLeft({ ...stalled(5, 2), refusal: { code: "23514", message: "x" } } as never)).toBe(0);
  expect(restoreRetriesLeft(null)).toBe(0);
});
