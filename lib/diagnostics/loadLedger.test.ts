/**
 * @jest-environment jsdom
 */
jest.mock("@ai-matrx/kit/idle-scheduler", () => ({ whenPageIdle: () => new Promise(() => undefined) }));

import { callerFrames, getLoadCalls, getLoads, recordLoadCall } from "./loadLedger";

describe("the load ledger", () => {
  it("records every call against the current load with its relation and phase", () => {
    recordLoadCall({ schema: "communication", relation: "get_dm_unread_summary", operation: "rpc", caller: new Error("x") });
    recordLoadCall({ relation: "notes", caller: new Error("y") });
    const calls = getLoadCalls();
    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatchObject({ load: 1, schema: "communication", relation: "get_dm_unread_summary", operation: "rpc" });
    expect(calls[1]).toMatchObject({ schema: "public", relation: "notes", operation: "select" });
    expect(["first-paint", "settling"]).toContain(calls[0].phase);
  });

  it("a client navigation starts a new load", () => {
    window.history.pushState({}, "", "/somewhere-else");
    recordLoadCall({ relation: "projects", caller: new Error("z") });
    const last = getLoadCalls().at(-1);
    expect(last?.load).toBe(2);
    expect(last?.route).toBe("/somewhere-else");
    expect(getLoads().map((l) => l.route)).toEqual(["/", "/somewhere-else"]);
  });

  it("names the caller as function · file:line", () => {
    const caller = new Error("origin");
    caller.stack = [
      "Error: origin",
      "    at wrapScope (http://h/_next/static/chunks/lib_diagnostics_supabaseErrorCapture.js:1:1)",
      "    at Object.getScopeTree (http://h/_next/static/chunks/features_scopes_service.js?v=2:99:7)",
    ].join("\n");
    recordLoadCall({ relation: "x", caller });
    const call = getLoadCalls().at(-1);
    expect(call && callerFrames(call)).toEqual(["Object.getScopeTree · features_scopes_service.js:99"]);
  });
});
