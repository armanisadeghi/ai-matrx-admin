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
    expect(window.sessionStorage.getItem("matrx:hard-navigation:v1")).not.toBeNull();

    // The next page boots in the same tab.
    const next = freshModule();
    next.installHardNavigationTrace();

    expect(captureError).toHaveBeenCalledTimes(1);
    expect(jest.mocked(captureError).mock.calls[0]?.[0]).toMatchObject({
      source: "hard-navigation",
      code: "declared:new-version-refresh:chunk",
    });
    expect(window.sessionStorage.getItem("matrx:hard-navigation:v1")).toBeNull();
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
});
