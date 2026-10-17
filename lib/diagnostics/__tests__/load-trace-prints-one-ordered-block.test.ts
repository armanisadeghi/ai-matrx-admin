/**
 * @jest-environment jsdom
 */

/**
 * The load trace prints what Arman asked for (2026-10-16): component RENDERED lines with their
 * time, one ordered block at settle (summary first, then the grouped timeline), every request in
 * ONE collapsed group with database calls first and duplicates flagged ×N — never NET lines
 * interleaved before the summary, never console.table. A late event is an "after settle" line.
 */
import {
  __loadTraceTesting,
  classifyRequest,
  loadTraceReport,
  resetLoadTraceForTests,
} from "@/lib/diagnostics/loadTrace";
import { loadTraceIsOn, resetLoadMarksForTests, useLoadMark } from "@/lib/diagnostics/loadMark";

type Logged = { method: string; text: string };

function captureConsole(): Logged[] {
  const out: Logged[] = [];
  for (const method of ["log", "groupCollapsed", "groupEnd", "table"] as const) {
    jest.spyOn(console, method).mockImplementation((...args: unknown[]) => {
      out.push({ method, text: String(args[0] ?? "").replace(/%c/g, "") });
    });
  }
  return out;
}

function resource(name: string, startTime: number, extra: Partial<PerformanceResourceTiming> = {}) {
  return { name, startTime, duration: 40, initiatorType: "fetch", encodedBodySize: 2048, transferSize: 0, entryType: "resource", ...extra } as unknown as PerformanceEntry;
}

beforeEach(() => {
  resetLoadTraceForTests();
  resetLoadMarksForTests();
  (performance as unknown as { getEntriesByType: () => PerformanceEntry[] }).getEntriesByType = () => [];
});
afterEach(() => jest.restoreAllMocks());

describe("request classification", () => {
  const origin = "http://localhost";
  it("names the table or rpc of a database call", () => {
    expect(classifyRequest("https://db.matrxserver.com/rest/v1/notes?select=id", "GET", origin)).toMatchObject({ group: "db", label: expect.stringMatching(/^notes /) });
    expect(classifyRequest("https://db.matrxserver.com/rest/v1/rpc/get_shell_counts", "POST", origin)).toMatchObject({ group: "db", label: "rpc get_shell_counts" });
    expect(classifyRequest("https://db.matrxserver.com/auth/v1/user", "GET", origin)).toMatchObject({ group: "db", label: "auth/user" });
  });
  it("puts the Python server and Next requests in their own groups", () => {
    expect(classifyRequest("https://server.app.matrxserver.com/api/x", "GET", origin).group).toBe("server");
    expect(classifyRequest("http://localhost/login?redirectTo=%2Fchat&_rsc=abc", "GET", origin)).toMatchObject({ group: "next", rsc: true });
  });
  it("compares RSC fetches of one route without their _rsc hash", () => {
    const a = classifyRequest("http://localhost/login?redirectTo=x&_rsc=aaa", "GET", origin);
    const b = classifyRequest("http://localhost/login?redirectTo=x&_rsc=bbb", "GET", origin);
    expect(a.dupKey).toBe(b.dupKey);
  });
});

describe("render marks", () => {
  it("cost nothing and mark nothing while the trace is off", () => {
    const mark = jest.spyOn(performance, "mark");
    expect(loadTraceIsOn()).toBe(false);
    useLoadMark("Sidebar");
    expect(mark).not.toHaveBeenCalled();
  });
  it("write one load:render mark with its render time when the trace is on", async () => {
    (globalThis as { __matrxLoadTraceOn?: boolean }).__matrxLoadTraceOn = true;
    const mark = jest.spyOn(performance, "mark").mockImplementation(() => undefined as unknown as PerformanceMark);
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    useLoadMark("Sidebar");
    useLoadMark("Sidebar");
    await new Promise((r) => setTimeout(r, 5));
    expect(mark).toHaveBeenCalledTimes(1);
    expect(mark.mock.calls[0][0]).toBe("load:render:Sidebar");
    expect((mark.mock.calls[0][1] as { detail: { ms: number } }).detail.ms).toEqual(expect.any(Number));
  });
});

describe("the settle block", () => {
  it("prints the summary first, renders in order, requests in one collapsed group with DB first and duplicates flagged", () => {
    const logged = captureConsole();
    const { onResource, push, printTimelineAndSummary } = __loadTraceTesting;
    push({ at: 0, kind: "nav", name: "navigation start" });
    push({ at: 420, kind: "render", name: "Sidebar", ms: 12, rendered: true });
    push({ at: 300, kind: "render", name: "App shell", ms: 8, rendered: true });
    push({ at: 500, kind: "heavy", name: "PDF viewer", ms: 30, rendered: true });
    onResource(resource("http://localhost/login?redirectTo=x&_rsc=aaa", 100));
    onResource(resource("http://localhost/login?redirectTo=x&_rsc=bbb", 150));
    onResource(resource("https://db.matrxserver.com/rest/v1/notes?select=id", 200));
    printTimelineAndSummary();
    __loadTraceTesting.printRequests();

    const texts = logged.map((l) => l.text);
    expect(texts[0]).toMatch(/^\[load\] SUMMARY /);
    expect(logged.some((l) => l.method === "table")).toBe(false);

    const shell = texts.findIndex((t) => /RENDERED {2}App shell \(8ms\)/.test(t));
    const sidebar = texts.findIndex((t) => /RENDERED {2}Sidebar \(12ms\)/.test(t));
    expect(shell).toBeGreaterThan(0);
    expect(sidebar).toBeGreaterThan(shell);
    expect(texts.some((t) => /HEAVY RENDERED BEFORE ENGAGEMENT {2}PDF viewer/.test(t))).toBe(true);

    const group = logged.findIndex((l) => l.method === "groupCollapsed" && /Requests \(3, to \+\d+ms\) — DB 1, server 0, next 2/.test(l.text));
    expect(group).toBeGreaterThan(sidebar);
    // No request line anywhere before the requests group.
    expect(texts.slice(0, group).some((t) => /GET {4}/.test(t))).toBe(false);
    const db = texts.findIndex((t) => /GET {4}notes /.test(t));
    const rsc = texts.findIndex((t) => /GET {4}RSC \/login/.test(t));
    expect(db).toBeGreaterThan(group);
    expect(rsc).toBeGreaterThan(db);
    expect(texts[rsc]).toMatch(/×2 DUPLICATE/);
    expect(texts.some((t) => /DUPLICATE ×2 \(Next RSC fetch of the same route\)/.test(t))).toBe(true);
    expect(loadTraceReport().duplicates).toEqual([expect.objectContaining({ times: 2, group: "next", rsc: true })]);
  });

  it("holds a request that finishes after settle for the requests group, never a loose line", () => {
    const logged = captureConsole();
    __loadTraceTesting.printTimelineAndSummary();
    const before = logged.length;
    __loadTraceTesting.onResource(resource("https://db.matrxserver.com/rest/v1/user_preferences?select=*", 5000));
    expect(logged.length).toBe(before);
    __loadTraceTesting.printRequests();
    expect(logged.slice(before).some((l) => /GET {4}user_preferences/.test(l.text))).toBe(true);
    // After the group, a late request is its own "after settle" line.
    const mid = logged.length;
    __loadTraceTesting.onResource(resource("https://db.matrxserver.com/rest/v1/user_preferences?select=*", 72000));
    expect(logged[mid].text).toMatch(/after settle .*user_preferences.*×2 DUPLICATE/);
  });

  it("prints a later event as an 'after settle' line below the block", () => {
    const logged = captureConsole();
    __loadTraceTesting.printTimelineAndSummary();
    const before = logged.length;
    __loadTraceTesting.push({ at: 9000, kind: "render", name: "Notifications bell", ms: 4, rendered: true });
    expect(logged.length).toBe(before + 1);
    expect(logged[before].text).toMatch(/^\[load\] after settle \+ +9000ms {2}RENDERED {2}Notifications bell \(4ms\)/);
  });
});
