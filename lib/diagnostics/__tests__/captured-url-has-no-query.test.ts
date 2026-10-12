/**
 * @jest-environment jsdom
 */

/**
 * Every captured row stores the page as origin + path only. Seen live
 * 2026-10-12: a durable row carried `"url": "…/chat/<id>?probe=secret456"`.
 * A query or hash can hold a credential (`?code=`, a magic link, a share
 * token), and a captured row is filed to the server and kept.
 */

import { captureError, getSnapshot } from "@/lib/diagnostics/errorCaptureStore";

describe("the capture door keeps no query or hash", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("stores origin + path and the route, never the query or hash", () => {
    window.history.replaceState(
      null,
      "",
      "/chat/abc-123?probe=secret456&code=SECRET#access_token=SECRET2",
    );
    captureError({
      source: "runtime-exception",
      message: "url hygiene probe",
    });
    const row = getSnapshot().find((entry) => entry.message === "url hygiene probe");

    expect(row?.url).toBe(`${window.location.origin}/chat/abc-123`);
    expect(row?.route).toBe("/chat/abc-123");
    expect(JSON.stringify(row)).not.toMatch(/secret456|SECRET/);
  });
});
