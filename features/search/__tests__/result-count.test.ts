import { organicResultCount } from "../result-count";

const web = (extra: Record<string, unknown>) => ({
  __kind: "web_search_results",
  vertical: "web",
  results: Array.from({ length: 10 }, (_, i) => ({ title: `r${i}` })),
  ...extra,
});

describe("organicResultCount", () => {
  it("counts the organic list only, so the bands never change the number", () => {
    const withBands = web({ news: Array.from({ length: 20 }, () => ({})), videos: Array.from({ length: 6 }, () => ({})) });
    const withoutNews = web({ videos: Array.from({ length: 6 }, () => ({})) });
    expect(organicResultCount(withBands)).toBe(10);
    expect(organicResultCount(withoutNews)).toBe(10);
  });

  it("reads an answer that arrives without its marker as a web page", () => {
    expect(organicResultCount({ results: [{}, {}], news: [{}, {}, {}] })).toBe(2);
  });

  it("leaves other answers to their own count", () => {
    expect(organicResultCount({ __kind: "web_search_results", vertical: "news", news: [{}] })).toBeNull();
    expect(organicResultCount({ __kind: "shopping_results", results: [{}] })).toBeNull();
  });
});
