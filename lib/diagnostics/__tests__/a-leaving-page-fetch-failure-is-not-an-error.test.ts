/**
 * @jest-environment jsdom
 */
/**
 * GUARD - a Supabase / API fetch killed because the page is navigating away
 * ("TypeError: Failed to fetch", no abort signal) is not filed. The same
 * failure while the page stays still is (the connection really dropped).
 * Real: admin_spend_headline "Failed to fetch" on the kind-registry page,
 * 2026-10-14, while the RPC itself answers in ~100 ms.
 */
import { captureError, clearCapturedErrors, getSnapshot } from "@/lib/diagnostics/errorCaptureStore";
import { resetPageLeavingForTests } from "@ai-matrx/chat/agents/redux/execution-system/utils/page-leaving";

const fetchFailure = () =>
  captureError({
    source: "supabase-postgrest",
    operation: "rpc",
    relation: "admin_spend_headline",
    name: "TypeError",
    message: "TypeError: Failed to fetch",
    status: 0,
  });

describe("a fetch failure on a leaving page", () => {
  beforeEach(() => {
    clearCapturedErrors();
    resetPageLeavingForTests();
  });
  it("is captured while the page stays", () => {
    fetchFailure();
    expect(getSnapshot()).toHaveLength(1);
  });
  it("is not captured once the page is leaving", () => {
    window.dispatchEvent(new Event("beforeunload"));
    fetchFailure();
    expect(getSnapshot()).toHaveLength(0);
  });
  it("a real PostgREST error during a leave is still captured", () => {
    window.dispatchEvent(new Event("beforeunload"));
    captureError({ source: "supabase-postgrest", code: "42501", message: "permission denied", status: 403 });
    expect(getSnapshot()).toHaveLength(1);
  });
});
