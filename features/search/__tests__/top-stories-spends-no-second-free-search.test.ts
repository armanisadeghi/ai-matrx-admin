/**
 * Review I4 (2026-10-22): Top stories on All fired a second POST /search for the same words, and the
 * server counted it as a second free search. The counted search's result now carries `follow_up_token`;
 * the companion sends it back as `follow_up_token`, and the server does not count it again.
 */
import { runKindSearch } from "@/features/search/service";
import type { SearchOutcome } from "@/features/search/types";

function ndjson(events: unknown[]): Response {
  return new Response(events.map((e) => JSON.stringify(e)).join("\n") + "\n", {
    status: 200,
    headers: { "Content-Type": "application/x-ndjson" },
  });
}

describe("one person query = one free count", () => {
  it("reads the proof from the web search and sends it back on the companion", async () => {
    const bodies: Record<string, unknown>[] = [];
    const post = jest.fn(async (_endpoint: string, body: unknown) => {
      bodies.push(body as Record<string, unknown>);
      return ndjson([
        { event: "data", data: { type: "search_kinds_result", result: { __kind: "web_search_results", results: [] }, follow_up_token: "proof-1" } },
        { event: "end", data: {} },
      ]);
    });
    let web: SearchOutcome | null = null;
    await runKindSearch({ post, query: "latest news on EVs", provider: "brave", count: 10, onOutcome: (o) => (web = o) });
    expect(web!.followUpToken).toBe("proof-1");
    await runKindSearch({
      post,
      query: "latest news on EVs",
      provider: "brave",
      count: 10,
      options: { vertical: "news" },
      followUpToken: web!.followUpToken,
      onOutcome: () => undefined,
    });
    expect(bodies[0].follow_up_token).toBeUndefined();
    expect(bodies[1].follow_up_token).toBe("proof-1");
  });
});
