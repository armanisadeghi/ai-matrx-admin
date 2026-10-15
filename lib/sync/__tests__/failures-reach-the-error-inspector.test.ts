/**
 * NOTHING FAILS SILENTLY: every lib/sync warn/error reaches the Error Inspector, a lost write
 * red, a handled warning an orange dot — even in production, where the logger prints nothing.
 */
import { __internal, logger, setSyncFailureSink, type SyncFailure } from "../logger";
import { localStorageAdapter } from "../persistence/local-storage";
import { syncFailureCaptureInput } from "@/lib/diagnostics/globalErrorCapture";
import { classifyTier } from "@/lib/diagnostics/errorTierRules";

afterEach(() => __internal.resetSink());

describe("sync engine failures reach the Error Inspector", () => {
  it("a full localStorage write is delivered as a red, filed data loss", () => {
    const got: SyncFailure[] = [];
    setSyncFailureSink((f) => got.push(f));
    const spy = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    expect(localStorageAdapter.write("k", { version: 1, identityKey: "u", data: {} } as never)).toBe(false);
    spy.mockRestore();
    expect(got).toHaveLength(1);
    expect(got[0]).toMatchObject({ event: "persist.write.failed", dataLoss: true });
    const input = syncFailureCaptureInput(got[0]);
    expect(input).toMatchObject({ source: "sync-engine", code: "persist.write.failed", relation: "k", level: "error" });
    expect(classifyTier(input as never).tier).toBe("red");
  });

  it("a handled warning is an orange dot", () => {
    const got: SyncFailure[] = [];
    setSyncFailureSink((f) => got.push(f));
    logger.warn("broadcast.invalid", { meta: { reason: "bad" } });
    const input = syncFailureCaptureInput(got[0]);
    expect(input.level).toBe("warn");
    expect(classifyTier(input as never).tier).toBe("orange");
  });

  it("events raised before the sink registers are handed over, bounded", () => {
    for (let i = 0; i < 80; i++) logger.warn("idb.read.error");
    const got: SyncFailure[] = [];
    setSyncFailureSink((f) => got.push(f));
    expect(got).toHaveLength(50);
  });
});
