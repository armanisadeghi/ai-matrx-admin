/**
 * The Requests list carries each stored request/response pair untouched, and Activity keeps the
 * flow's own work while leaving session chatter out.
 */
import { activityRows, isFlowRequest, pageRequestRows, serverRequestRows } from "../requests";
import type { NodeOutcomeRow } from "../data";
import type { LoggedRequest } from "../requestLog";

const googlePayload = { organic_results: [{ title: "Ritual Coffee Roasters", link: "https://ritualcoffee.com" }] };

const outcome: NodeOutcomeRow = {
  id: "o1",
  runId: "run-1",
  nodeId: "web",
  step: 1,
  attempt: 1,
  itemIndex: 0,
  completedAt: "2026-10-13T19:19:40.000Z",
  durationMs: 6000,
  input: null,
  error: null,
  output: {
    cost_usd: 0.05,
    requests: [
      {
        seq: 1,
        at: "2026-10-13T19:19:39.000Z",
        ms: 5000,
        kind: "search",
        provider: "google",
        label: "Google web: ritual",
        status: 200,
        error: null,
        request: { url: "https://serpapi.com/search.json", params: { q: "ritual", api_key: "[redacted]" } },
        response: { status: 200, body: googlePayload },
      },
    ],
  },
};

function page(url: string, method: string, seq: number): LoggedRequest {
  return {
    seq,
    route: "/marketing/brands/smart-add",
    startedAt: 1_000 + seq,
    endedAt: 1_100 + seq,
    method,
    url,
    requestHeaders: {},
    requestBody: null,
    status: 200,
    statusText: "OK",
    responseHeaders: {},
    responseBody: { ok: true },
    streaming: false,
    error: null,
  };
}

describe("builder requests", () => {
  it("keeps the server's stored request and response exactly", () => {
    const [row] = serverRequestRows([outcome]);
    expect(row.request).toEqual(outcome.output && (outcome.output as { requests: { request: unknown }[] }).requests[0].request);
    expect(row.response).toEqual({ status: 200, body: googlePayload });
    expect(row.at).toBe(Date.parse("2026-10-13T19:19:39.000Z") - 5000);
    expect(row.runId).toBe("run-1");
  });

  it("puts flow work in Activity and leaves session reads out", () => {
    const rows = pageRequestRows(
      [
        page("https://db.matrxserver.com/rest/v1/rpc/get_dm_unread_summary", "POST", 1),
        page("http://localhost:8091/workflows/system/smart_add_brand_identify/runs", "POST", 2),
        page("https://db.matrxserver.com/rest/v1/brand", "POST", 3),
      ],
      "/marketing/brands/smart-add",
    );
    expect(rows.map(isFlowRequest)).toEqual([false, true, true]);
    const activity = activityRows([...rows, ...serverRequestRows([outcome])], [], [outcome], [], {});
    expect(activity.filter((a) => a.kind === "request")).toHaveLength(3);
    expect(activity.find((a) => a.kind === "step")?.costUsd).toBe(0.05);
  });
});
