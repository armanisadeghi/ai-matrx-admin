/**
 * @jest-environment jsdom
 */

/**
 * A full page load that cuts a live stream is filed — once, by the next page,
 * with its cause. Written for crawl 8beb27cd (2026-10-12): its tab began a full
 * document load at 03:30:02Z, the stream died at the commit 6 s later, and
 * nothing recorded why the page reloaded.
 */

jest.mock("@/lib/diagnostics/errorCaptureStore", () => ({
  captureError: jest.fn(),
}));

import { captureError } from "@/lib/diagnostics/errorCaptureStore";

type TraceModule = typeof import("@/lib/diagnostics/hardNavigationTrace");

function freshModule(): TraceModule {
  let loaded: TraceModule | undefined;
  jest.isolateModules(() => {
    loaded = jest.requireActual("@/lib/diagnostics/hardNavigationTrace") as TraceModule;
  });
  if (!loaded) throw new Error("module did not load");
  return loaded;
}

describe("hard-navigation trace", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
  });

  it("names the cause from what the leaving page saw", () => {
    const { hardNavigationCause } = freshModule();
    expect(
      hardNavigationCause({ declared: { at: 1, reason: "auth-session-watcher:expired" }, navigation: null }, "reload"),
    ).toBe("declared:auth-session-watcher:expired");
    expect(
      hardNavigationCause(
        { declared: null, navigation: { at: 1, to: "/x", navigationType: "push", userInitiated: false, stack: null } },
        "navigate",
      ),
    ).toBe("script-navigation");
    expect(
      hardNavigationCause(
        { declared: null, navigation: { at: 1, to: "/x", navigationType: "push", userInitiated: true, stack: null } },
        "navigate",
      ),
    ).toBe("link");
    expect(hardNavigationCause({ declared: null, navigation: null }, "reload")).toBe("browser-reload");
    expect(hardNavigationCause({ declared: null, navigation: null }, "navigate")).toBe("browser-navigation");
  });

  it("files one capture on the next page when the leave cut a live stream", () => {
    // The leaving page: one live stream, our own code declares a reload.
    const leaving = freshModule();
    leaving.installHardNavigationTrace();
    const crawl = leaving.trackLiveStream("/api/scraper/crawler/sites/site-1/sessions");
    leaving.noteHardNavigationReason("new-version-refresh:chunk");
    window.dispatchEvent(new Event("beforeunload"));
    expect(window.sessionStorage.getItem("matrx:client:diagnostics.hard-navigation.v1")).not.toBeNull();

    // The next page boots in the same tab.
    const next = freshModule();
    next.installHardNavigationTrace();

    expect(captureError).toHaveBeenCalledTimes(1);
    expect(jest.mocked(captureError).mock.calls[0]?.[0]).toMatchObject({
      source: "hard-navigation",
      code: "declared:new-version-refresh:chunk",
    });
    expect(window.sessionStorage.getItem("matrx:client:diagnostics.hard-navigation.v1")).toBeNull();
    // This module's listeners stay on the shared jsdom window; leave no
    // open stream behind for the next test's leave to report.
    crawl.close("ended");
  });

  it("files nothing for a page load that cut no stream", () => {
    const leaving = freshModule();
    leaving.installHardNavigationTrace();
    const stream = leaving.trackLiveStream("/ai/chat");
    stream.close("ended");
    window.dispatchEvent(new Event("beforeunload"));

    freshModule().installHardNavigationTrace();

    expect(captureError).not.toHaveBeenCalled();
  });
  it("never keeps a query or hash — from, streams and stack are origin + path only", () => {
    window.history.replaceState(null, "", "/marketing/viva?code=SECRET123#tok=SECRET456");
    const leaving = freshModule();
    leaving.installHardNavigationTrace();
    const stream = leaving.trackLiveStream("https://scraper.example.test/api/run?token=SECRET789");
    window.dispatchEvent(new Event("beforeunload"));
    const stored = window.sessionStorage.getItem("matrx:client:diagnostics.hard-navigation.v1") ?? "";
    expect(stored).not.toContain("SECRET");
    expect(stored).toContain("/marketing/viva");

    freshModule().installHardNavigationTrace();
    const filed = JSON.stringify(jest.mocked(captureError).mock.calls);
    expect(filed).not.toContain("SECRET");
    stream.close("ended");
    window.history.replaceState(null, "", "/");
  });

  it("strips queries from every URL in a navigating script's stack", () => {
    const { sanitizeNavigationStack } = freshModule();
    const stack = [
      "Error: hard navigation",
      "    at go (https://www.aimatrx.com/_next/static/chunks/app.js?dpl=abc:3:9)",
      "    at https://www.aimatrx.com/login?code=SECRET:1:2",
    ].join("\n");
    expect(sanitizeNavigationStack(stack)).not.toContain("SECRET");
    expect(sanitizeNavigationStack(stack)).not.toContain("dpl=");
  });

  it("files the person's own reload at the silent tier, our code's reload as red", () => {
    const { classifyTier } = jest.requireActual(
      "@/lib/diagnostics/errorTierRules",
    ) as typeof import("@/lib/diagnostics/errorTierRules");
    const base = { source: "hard-navigation", message: "m" } as Parameters<typeof classifyTier>[0];
    for (const code of ["browser-reload", "browser-navigation", "link", "back-forward"]) {
      expect(classifyTier({ ...base, code })).toMatchObject({ tier: "yellow", persist: true });
    }
    for (const code of ["script-reload", "script-navigation", "declared:auth-session-watcher:expired"]) {
      expect(classifyTier({ ...base, code }).tier).toBe("red");
    }
  });

  it("a failure while filing the previous leave never skips the page's own listeners", () => {
    const leaving = freshModule();
    leaving.installHardNavigationTrace();
    const crawl = leaving.trackLiveStream("/api/scraper/crawler/sites/site-1/sessions");
    window.dispatchEvent(new Event("beforeunload"));
    crawl.close("ended");

    jest.mocked(captureError).mockImplementationOnce(() => {
      throw new Error("capture store broke");
    });
    const next = freshModule();
    expect(() => next.installHardNavigationTrace()).not.toThrow();

    // The next page's own leave is still recorded.
    const live = next.trackLiveStream("/ai/chat");
    window.dispatchEvent(new Event("beforeunload"));
    expect(window.sessionStorage.getItem("matrx:client:diagnostics.hard-navigation.v1")).toContain("/ai/chat");
    live.close("ended");
  });
});

