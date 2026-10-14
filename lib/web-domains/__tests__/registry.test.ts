/**
 * The frontend reader of the known-domain registry, against an export of the live table
 * (snapshot.fixture.json = aidream/services/web_domains/snapshot.json, written by
 * aidream scripts/export_web_domain_snapshot.py), plus Smart Add's kinds expanded through it.
 */
import { categoriesFor, domainAddress, domainHost, ruleFor, ruleLabel, withKnownDomainRules, type KnownDomainRule } from "../registry";
import { kindByRules } from "@/features/marketing/smart-add/webKinds";
import { webAnswerObservations } from "@/features/marketing/smart-add/learnDomains";
import type { BrandRelationKind } from "@/features/marketing/data/service";
import raw from "./snapshot.fixture.json";

const RULES: KnownDomainRule[] = (raw as { host: string; path_pattern: string; category: string; provenance: string; confidence: number }[]).map((r) => ({
  host: r.host,
  pathPattern: r.path_pattern,
  category: r.category,
  provenance: r.provenance as KnownDomainRule["provenance"],
  confidence: r.confidence,
}));

const kind = (key: string, categories: string[]): BrandRelationKind => ({
  id: key,
  key,
  label: key,
  routesTo: null,
  isKnown: true,
  stance: "about_us",
  description: null,
  hasSentiment: false,
  match: { hosts: [], paths: [], categories },
});

// The vocabulary as it stands in web.brand_relation_kind (metadata.match.categories), in sort order.
const KINDS = withKnownDomainRules(
  [
    kind("our_store_listing", ["store_page"]),
    kind("our_press_release", ["press_release"]),
    kind("job_posting", ["job_board"]),
    kind("link_in_bio_page", ["link_in_bio"]),
    kind("review_site", ["review_site"]),
    kind("claimable_listing", ["directory", "data_broker", "reference"]),
    kind("mention", ["news", "aggregator", "forum", "video", "blog_platform"]),
  ],
  RULES,
);

describe("known web domains", () => {
  it("normalizes like the database", () => {
    expect(domainAddress("https://www.Yelp.com/biz/x?y=1#z")).toBe("yelp.com/biz/x");
    expect(domainHost("https://m.PRNewswire.com:443/news/a")).toBe("prnewswire.com");
  });

  it("knows pressrelease.com and the other wires (Arman, 2026-10-14)", () => {
    for (const h of ["pressrelease.com", "prnewswire.com", "prweb.com", "businesswire.com", "globenewswire.com", "accesswire.com", "einpresswire.com", "newswire.com", "prlog.org", "openpr.com"]) {
      expect(categoriesFor(`https://www.${h}/news/acme`, RULES)).toContain("press_release");
    }
  });

  it("path rules beat whole-host rules", () => {
    expect(ruleFor("https://www.indeed.com/cmp/acme/reviews", ["review_site", "job_board"], RULES)?.category).toBe("review_site");
    expect(ruleLabel(ruleFor("https://bit.ly/m/jane", ["link_in_bio"], RULES) as KnownDomainRule)).toBe("bit.ly/m");
    expect(ruleFor("https://bit.ly/3abc", ["link_in_bio"], RULES)).toBeNull();
  });

  it("Smart Add kinds read the registry: the old host rules still fire", () => {
    const cases: [string, string][] = [
      ["https://www.pressrelease.com/news/acme-launches", "our_press_release"],
      ["https://www.prnewswire.com/news-releases/acme", "our_press_release"],
      ["https://www.yelp.com/biz/acme-coffee", "review_site"],
      ["https://www.indeed.com/cmp/acme/reviews", "review_site"],
      ["https://www.indeed.com/viewjob?jk=1", "job_posting"],
      ["https://www.crunchbase.com/organization/acme", "claimable_listing"],
      ["https://www.google.com/maps/place/acme", "claimable_listing"],
      ["https://www.nytimes.com/2026/10/01/acme.html", "mention"],
      ["https://www.youtube.com/watch?v=abc", "mention"],
      ["https://linktr.ee/acme", "link_in_bio_page"],
      ["https://www.amazon.com/stores/acme/page/1", "our_store_listing"],
    ];
    for (const [url, key] of cases) expect([url, kindByRules(url, KINDS)?.kind.key]).toEqual([url, key]);
    expect(kindByRules("https://acme-coffee.com/about", KINDS)).toBeNull();
  });

  it("a person's answer becomes an observation only when its kind names one category", () => {
    const items = [
      { key: "a", url: "https://www.pressrelease.com/x", value: "https://www.pressrelease.com/x" },
      { key: "b", url: "https://www.nytimes.com/x", value: "https://www.nytimes.com/x" },
    ] as unknown as Parameters<typeof webAnswerObservations>[0];
    const out = webAnswerObservations(items, { a: { kind: "our_press_release", sentiment: null }, b: { kind: "mention", sentiment: null } }, KINDS);
    expect(out).toEqual([{ url: "https://www.pressrelease.com/x", category: "press_release" }]);
  });
});
