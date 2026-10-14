/** @jest-environment jsdom */
import { getRequestLog, setRequestRecording } from "../requestLog";
import reducer, { builderPublish, setDebugMode, toggleDebugMode } from "@/lib/redux/preferences/adminDebugSlice";

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("Builder records only while debug mode is on", () => {
  beforeAll(() => {
    window.fetch = jest.fn(async () => new Response("{}", { headers: { "content-type": "application/json" } }));
  });

  it("request log keeps nothing before recording starts, records while on, drops all when off", async () => {
    // Not recording yet: nothing is kept.
    await window.fetch("https://example.test/a");
    expect(getRequestLog()).toHaveLength(0);

    setRequestRecording(true);
    await window.fetch("https://example.test/b");
    await flush();
    expect(getRequestLog().map((r) => r.url)).toEqual(["https://example.test/b"]);

    setRequestRecording(false);
    expect(getRequestLog()).toHaveLength(0);
    await window.fetch("https://example.test/c");
    await flush();
    expect(getRequestLog()).toHaveLength(0);
  });

  it("turning debug mode off drops every Builder feed", () => {
    let state = reducer(undefined, setDebugMode(true));
    state = reducer(
      state,
      builderPublish({
        surfaceKey: "s",
        route: "/x",
        entries: [{ key: "k", label: "K", group: "inputs", data: 1 }],
        prune: null,
      }),
    );
    expect(Object.keys(state.builderFeeds)).toEqual(["s"]);
    state = reducer(state, toggleDebugMode());
    expect(state.isDebugMode).toBe(false);
    expect(state.builderFeeds).toEqual({});
  });
});
