import { accountMatchesBrand, checkAccountOwners, domainName } from "@/features/marketing/social/owner-check";
import { logoKey, rankLogos } from "../logo-rank";

const acct = (handle: string, profileName: string | null) => ({ handle, profileName, displayName: profileName ?? handle });

describe("owner check against the brand's whole identity", () => {
  // the-good-trade (2026-10-21): web.brand.name = "Natalie Gale", legal name fact "The Good Trade"; seven brand
  // accounts are The Good Trade's, Instagram natalie.img is a person's.
  const goodTrade = [
    acct("thegoodtrade", "The Good Trade"),
    acct("thegoodtrade", "The Good Trade"),
    acct("thegoodtrade", "The Good Trade"),
    acct("natalie.img", "Natalie Gale"),
    acct("thegoodtrade", "The Good Trade"),
    acct("thegoodtradeph", "The Good Trade PH"),
    acct("the-good-trade", "The Good Trade"),
    acct("thegoodtrade", "The Good Trade"),
  ];
  const identity = {
    name: "Natalie Gale",
    legalNames: ["The Good Trade"],
    websites: ["https://thegoodtrade.ph/", "https://goodgear.com/", "http://nataliekgale.com/", "https://thegoodtrade.com/"],
  };

  it("flags the outsider, not the real accounts, when the brand name is wrong", () => {
    const result = checkAccountOwners(goodTrade, identity);
    expect([...result.suspects]).toEqual([3]);
    expect(result.nameMostAccountsUse).toBe("The Good Trade");
  });

  it("the name-only check got it backwards (the defect this replaces)", () => {
    const flagged = goodTrade.map((a, i) => (accountMatchesBrand(a, identity.name) ? null : i)).filter((i) => i !== null);
    expect(flagged).toEqual([0, 1, 2, 4, 5, 6, 7]);
  });

  it("keeps the brand name when most accounts carry it", () => {
    const dd = [acct("datadestructio2", null), acct("DataDestructioninc", null), acct("datadestruction", "Data Destruction"), acct("armantitanium", "Armani Sadeghi")];
    const result = checkAccountOwners(dd, { name: "Data Destruction", websites: ["https://datadestruction.com"] });
    expect([...result.suspects]).toEqual([3]);
    expect(result.nameMostAccountsUse).toBeNull();
  });

  it("a website domain vouches for an account the name does not", () => {
    const result = checkAccountOwners([acct("goodgear", "Good Gear"), acct("acme", "Acme Co")], { name: "Acme", websites: ["goodgear.com"] });
    expect(result.suspects.size).toBe(0);
  });

  it("reads a domain's name", () => {
    expect(domainName("https://www.thegoodtrade.com/")).toBe("thegoodtrade");
    expect(domainName("the-good-trade.co.uk")).toBe("the good trade");
  });
});

describe("near-identical logos collapse, distinct marks stay", () => {
  const base = "https://datadestruction.com/wp-content/uploads";
  it("a WordPress site-icon crop is the same mark as the logo file", () => {
    expect(logoKey(`${base}/2023/09/data-destruction-logo.png`)).toBe(
      logoKey(`${base}/2023/05/cropped-cropped-data-destruction-1-192x192.png`),
    );
  });
  it("a wide wordmark stays apart from the square mark", () => {
    expect(logoKey(`${base}/2023/08/Datadestruction-logo-311x53-1.png`)).not.toBe(logoKey(`${base}/2023/09/data-destruction-logo.png`));
  });
  it("an expired provider link never leads a picture that loads", () => {
    const ranked = rankLogos([
      { url: "https://scontent.fagc1-1.fna.fbcdn.net/v/abc_n.jpg", kind: "logo", expired: true },
      { url: "https://pbs.twimg.com/profile_images/1/u3vxg2u5_400x400.jpg", kind: "logo" },
    ]);
    expect(ranked[0].expired).toBeUndefined();
  });
});

describe("recent activity", () => {
  it("one entry per batch of assets saved together, newest first", () => {
    const { batchByHour, newestEntries } = jest.requireActual("../BrandOverviewActivity") as typeof import("../BrandOverviewActivity");
    const rows = [
      { created_at: "2026-10-17T10:05:00Z" },
      { created_at: "2026-10-17T10:00:00Z" },
      { created_at: "2026-10-17T09:30:00Z" },
      { created_at: "2026-10-10T09:30:00Z" },
    ];
    expect(batchByHour(rows).map((g) => g.length)).toEqual([3, 1]);
    const at = (iso: string) => ({ key: iso, at: iso, icon: (() => null) as never, label: iso, detail: null, href: "/" });
    expect(newestEntries([at("2026-10-01T00:00:00Z"), at("2026-10-03T00:00:00Z"), at("")], 6).map((e) => e.key)).toEqual([
      "2026-10-03T00:00:00Z",
      "2026-10-01T00:00:00Z",
    ]);
  });
});
