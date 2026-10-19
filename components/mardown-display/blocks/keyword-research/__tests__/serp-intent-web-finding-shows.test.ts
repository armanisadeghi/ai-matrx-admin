/** Forcing function: the web-search finding must show for new ("web") and stored ("brave") analyses. */
import { readKeywordSerpIntentAnalysis } from "../KeywordSerpIntentAnalysisBlock";

const payload = (second: string) => ({
  phrase: "espresso machine",
  provider_findings: [
    { provider: "google", apparent_intent: "commercial" },
    { provider: second, apparent_intent: "commercial" },
  ],
});

describe("keyword SERP-intent analysis provider findings", () => {
  it("shows the web-search finding the server emits now", () => {
    const data = readKeywordSerpIntentAnalysis(payload("web"));
    expect(data?.providers.map((p) => p.provider)).toEqual(["google", "web"]);
  });
  it("still shows stored analyses that say brave", () => {
    const data = readKeywordSerpIntentAnalysis(payload("brave"));
    expect(data?.providers).toHaveLength(2);
    expect(data?.providers[1].provider).toBe("web");
  });
});
