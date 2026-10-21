import { describe, expect, it } from "@jest/globals";
import { accountMatchesBrand } from "@/features/marketing/social/owner-check";
import { isBannerUrl, logoKey, pickHeroLogo, rankLogos } from "../logo-rank";
import { historySpanLabel, summarizeSearch } from "../useBrandOverviewTrends";

describe("whose account (owner check)", () => {
  it("raises a founder's personal account on a company brand and passes the brand's own", () => {
    const brand = "Data Destruction Inc";
    expect(accountMatchesBrand({ handle: "armantitanium", profileName: "Armani Sadeghi", displayName: "Armani Sadeghi" }, brand)).toBe(false);
    expect(accountMatchesBrand({ handle: "ArmanSadeghi", profileName: "Arman Sadeghi", displayName: "Arman Sadeghi" }, brand)).toBe(false);
    expect(accountMatchesBrand({ handle: "datadestructio2", profileName: null, displayName: "datadestructio2" }, brand)).toBe(true);
    expect(accountMatchesBrand({ handle: "DataDestructioninc", profileName: null, displayName: "DataDestructioninc" }, brand)).toBe(true);
  });
});

describe("logo rank", () => {
  const vasaro = [
    { url: "http://vasaro.com/cdn/shop/files/Vasaro_Social_Sharing_Banner_ee58.png?v=1", kind: "logo" },
    { url: "https://vasaro.com/cdn/shop/files/VS_LOGO_VS_VASARO_Horizontal_e0d9.png?v=1&width=320", kind: "logo" },
  ];
  const [banner, mark] = vasaro as [{ url: string; kind: string }, { url: string; kind: string }];
  it("never takes a sharing banner as the hero logo", () => {
    expect(isBannerUrl(banner.url)).toBe(true);
    expect(pickHeroLogo(banner.url, vasaro)).toBe(mark.url);
    expect(pickHeroLogo("https://x.com/logo.png", vasaro)).toBe("https://x.com/logo.png");
  });
  it("collapses a site's favicon family and size variants into one picture each", () => {
    const ai = ["favicon.ico", "matrx/favicon-16x16.png", "matrx/favicon-32x32.png", "matrx/apple-touch-icon.png", "matrx/matrx-icon.svg"].map((f) => ({
      url: `https://www.aimatrx.com/${f}`,
      kind: "favicon",
    }));
    const ranked = rankLogos(ai);
    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.url).toContain("matrx-icon.svg");
    expect(logoKey("https://a.com/cropped-mark-1-180x180.png")).toBe(logoKey("https://cdn.b.net/x/cropped-mark-1-32x32.png"));
    expect(logoKey("https://a.com/x.png", "f1")).toBe("file:f1");
  });
});

describe("search summary", () => {
  const periods = { current: { start: "2026-09-20", end: "2026-10-17" }, compare: { start: "2026-08-23", end: "2026-09-19" } };
  it("totals clicks, weights position by impressions and names the last day with data", () => {
    const s = summarizeSearch(
      [
        { period: "current", day: "2026-10-16", clicks: 3, impressions: 100, avg_position: 10 },
        { period: "current", day: "2026-10-17", clicks: 2, impressions: 300, avg_position: 20 },
        { period: "current", day: "2026-10-18", clicks: 0, impressions: 0, avg_position: null },
        { period: "compare", day: "2026-09-01", clicks: 3, impressions: 50, avg_position: 5 },
      ],
      periods,
    );
    expect(s.total).toBe(5);
    expect(s.compareTotal).toBe(3);
    expect(s.avgPosition).toBeCloseTo(17.5);
    expect(s.dataEnd).toBe("2026-10-17");
  });
  it("labels a history line by the days it really covers", () => {
    expect(historySpanLabel(["2026-10-09T01:00:00Z", "2026-10-16T05:00:00Z"])).toBe("8 days");
    expect(historySpanLabel(["2026-10-09T01:00:00Z"])).toBeNull();
  });
});
