/**
 * A topical-map read the caller cancelled (a query unmounting, a superseded read) is control flow,
 * never an incident: it still rejects, but nothing reaches the Error Inspector. A failure the caller
 * did NOT cancel, or a timeout, is still captured. Live instance (2026-10-14): "readAllRows(seo.topical_map):
 * query failed — AbortError: signal is aborted without reason" was filed red.
 */
const captured = jest.fn();
jest.mock("@/lib/diagnostics/errorCaptureStore", () => ({ captureError: (...a: unknown[]) => captured(...a) }));

import { withTopicalMapErrors } from "./errors";

beforeEach(() => captured.mockReset());

it("a read the caller aborted rejects without being captured", async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(
    withTopicalMapErrors("seo.topical_map (list)", () => Promise.reject(new Error("AbortError: signal is aborted without reason")), controller.signal),
  ).rejects.toBeTruthy();
  expect(captured).not.toHaveBeenCalled();
});

it("a real failure is still captured", async () => {
  await expect(
    withTopicalMapErrors("seo.topical_map (list)", () => Promise.reject({ code: "57014", message: "canceling statement due to statement timeout" }), new AbortController().signal),
  ).rejects.toBeTruthy();
  expect(captured).toHaveBeenCalledTimes(1);
});

it("a timeout abort is a failure, not a cancellation", async () => {
  const controller = new AbortController();
  controller.abort(new DOMException("timed out", "TimeoutError"));
  await expect(
    withTopicalMapErrors("seo.topical_map (list)", () => Promise.reject(new Error("timed out")), controller.signal),
  ).rejects.toBeTruthy();
  expect(captured).toHaveBeenCalledTimes(1);
});
