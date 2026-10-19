/**
 * A FAILED FILL CLOSES ITS WATCH AI ENTRY (lane SERVER-STORE, 2026-10-19). Live: three "Try on 1 row" presses that
 * failed with "StoreUnavailable" before any AI call left three Watch AI entries "running, no AI call recorded yet"
 * forever. The runner now tells the followed work how the request ended, with the refusal's own sentence.
 */
import { enrichByRunner, runAiColumn, type WatchEnd } from "../enrichPort";

function respond(status: number, body: unknown): Promise<Response> {
  return Promise.resolve({ ok: status < 400, status, json: async () => body } as unknown as Response);
}

const ask = { tableId: "t1", fieldId: "f1", rows: 1, previewOnly: true } as unknown as Parameters<typeof enrichByRunner>[1];

describe("the AI column runner ends the run it asked Watch AI to follow", () => {
  it("ends it failed with the server's sentence when the store was busy", async () => {
    const ended: Parameters<WatchEnd>[0][] = [];
    const out = await enrichByRunner(
      () => respond(503, { message: "The data store is busy, try again." }),
      ask,
      () => (outcome) => ended.push(outcome),
    );
    expect(out.ok).toBe(false);
    expect(ended).toEqual([{ ok: false, reason: "The data store is busy, try again." }]);
  });

  it("ends it failed when the request never got an answer", async () => {
    const ended: Parameters<WatchEnd>[0][] = [];
    await runAiColumn(() => Promise.reject(new Error("Failed to fetch")), { tableId: "t1", fieldId: "f1", rows: 1, preview: true }, () => (o) => ended.push(o));
    expect(ended).toEqual([{ ok: false, reason: "Failed to fetch" }]);
  });

  it("ends it ok when the run came back", async () => {
    const ended: Parameters<WatchEnd>[0][] = [];
    await enrichByRunner(() => respond(200, { rows_seen: 1, says: "ok" }), ask, () => (o) => ended.push(o));
    expect(ended).toEqual([{ ok: true }]);
  });
});
