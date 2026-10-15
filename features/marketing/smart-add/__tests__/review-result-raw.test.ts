/** MKT-056: the review window is given the engine's own result object, not Smart Add's trimmed fields. */
import { parseEvidenceItem } from "../evidence";
import { reviewResultOf } from "../SmartAddWebRow";

const base = {
  key: "web:x.test/a",
  field: "web_page",
  value: "https://x.test/a",
  url: "https://x.test/a",
  label: "X &amp; Co",
  source: { node: "web", kind: "web_search", url: "https://x.test/a", where: "w" },
  confidence: 0.5,
  snippet: "short",
  hits: [{ rank: 2, query: "q", endpoint: "web", engine: "brave" }],
};

describe("reviewResultOf", () => {
  it("draws from the raw engine object when the server kept it", () => {
    const item = parseEvidenceItem({
      ...base,
      label: "X & Co",
      raw_results: [{ engine: "brave", rank: 2, result: { title: "X &amp; Co", url: "https://x.test/a", extra_snippets: ["more one", "more two"], faq: { results: [] } } }],
    });
    const r = reviewResultOf(item!);
    expect(r.result.extra_snippets).toEqual(["more one", "more two"]);
    expect(r.result.faq).toEqual({ results: [] });
    expect(r.result.title).toBe("X & Co");
    expect(r.result.description).toBe("short");
  });

  it("falls back to the trimmed fields when no raw object came with the item", () => {
    const r = reviewResultOf(parseEvidenceItem(base)!);
    expect(r.result.extra_snippets).toBeUndefined();
    expect(r.result.description).toBe("short");
  });
});
