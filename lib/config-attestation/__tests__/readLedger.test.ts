/**
 * The read ledger runs inside render and useSyncExternalStore getSnapshot: it must not write
 * storage or call the recorder synchronously, must count a snapshot's read once, and must stay
 * cheap. The recorder below is the real @ai-matrx/data recorder, so the hand-off is real.
 */
import { createConfigReadRecorder } from "@ai-matrx/data/config-attestation";
import {
  __resetConfigReadLedger,
  attachConfigReadRecorder,
  configAttestationCounters,
  noteConfigRead,
  noteKnobReadOnce,
  PRESTART_QUEUE_CAP,
} from "../readLedger";
import { capSpool } from "../recorder.client";

jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({}) }));

const flushMicrotasks = () => new Promise<void>((r) => setTimeout(r, 0));

function realRecorder() {
  const saves: unknown[] = [];
  const recorder = createConfigReadRecorder({
    app: "ai-matrx",
    appVersion: "0.4.1",
    buildSha: "a".repeat(40),
    device: () => ({ deviceId: "d", organizationId: "o" }),
    client: async () => ({ data: 1, error: null }),
    flushMinutes: () => 5,
    automation: true,
    log: () => undefined,
    spool: { load: () => undefined, save: (v) => saves.push(v) },
  });
  return { recorder, saves };
}

beforeEach(() => __resetConfigReadLedger());

test("a read never reaches the recorder or storage synchronously (no writes during render)", async () => {
  const { recorder, saves } = realRecorder();
  const read = jest.spyOn(recorder, "read");
  attachConfigReadRecorder(recorder);
  noteConfigRead("knob", "billing", "points_rate", "db", 3);
  expect(read).not.toHaveBeenCalled();
  expect(saves).toHaveLength(0);
  await flushMicrotasks();
  expect(read).toHaveBeenCalledTimes(1);
  expect(read.mock.calls[0][0]).toMatchObject({ kind: "knob", feature: "billing", key: "points_rate", source: "db" });
});

test("the same snapshot answer is one read however many renders peek it; a new snapshot counts again", async () => {
  const { recorder } = realRecorder();
  const read = jest.spyOn(recorder, "read");
  attachConfigReadRecorder(recorder);
  const snapA = {};
  for (let i = 0; i < 500; i++) noteKnobReadOnce(snapA, "approvals.queue.page_size", 25);
  noteKnobReadOnce({}, "approvals.queue.page_size", 25);
  noteKnobReadOnce(snapA, { feature: "connectors", key: "prompt.resurface_days" }, 3);
  await flushMicrotasks();
  expect(read).toHaveBeenCalledTimes(3);
  // dotted form splits at the LAST dot, like knobAddress and the manifest scanner
  expect(read.mock.calls[0][0]).toMatchObject({ feature: "approvals.queue", key: "page_size" });
  expect(read.mock.calls[2][0]).toMatchObject({ feature: "connectors", key: "prompt.resurface_days" });
});

test("micro-benchmark: 10,000 peeks of a held snapshot cost under 25 ms", () => {
  const snap = {};
  noteKnobReadOnce(snap, "a.b", 1);
  const t0 = performance.now();
  for (let i = 0; i < 10_000; i++) noteKnobReadOnce(snap, "a.b", 1);
  const ms = performance.now() - t0;
  expect(ms).toBeLessThan(25);
});

test("micro-benchmark: 10,000 distinct reads queue in under 50 ms", () => {
  const t0 = performance.now();
  for (let i = 0; i < 10_000; i++) noteConfigRead("knob", "f", `k${i % 50}`, "db", i);
  expect(performance.now() - t0).toBeLessThan(50);
});

test("before the recorder attaches, the queue is capped and drops are counted", async () => {
  for (let i = 0; i < PRESTART_QUEUE_CAP + 7; i++) noteConfigRead("knob", "f", "k", "db");
  await flushMicrotasks();
  expect(configAttestationCounters.queue_drops).toBe(7);
});

test("the spool cap drops the oldest unsent buckets and counts them", () => {
  const pending = Array.from({ length: 10 }, (_, i) => ({ i, pad: "x".repeat(1000) }));
  const { value, dropped } = capSpool({ version: 1, pending }, 4_000);
  expect(dropped).toBeGreaterThan(0);
  expect(JSON.stringify(value).length).toBeLessThanOrEqual(4_000);
  expect((value as { pending: Array<{ i: number }> }).pending[0].i).toBe(dropped);
});
