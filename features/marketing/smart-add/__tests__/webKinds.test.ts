import type { BrandRelationKind } from "@/features/marketing/data/service";
import { parseEvidenceItem, webRow, type EvidenceItem } from "../evidence";
import { engineRanks, groupByKind, suggestKind, type SuggestContext } from "../webKinds";

const kind = (key: string, stance: BrandRelationKind["stance"], match: Partial<BrandRelationKind["match"]> = {}): BrandRelationKind => ({
  id: key,
  key,
  label: key,
  routesTo: key === "not_us" ? "exclusion" : key === "ours" ? "brand_property" : null,
  isKnown: true,
  stance,
  description: null,
  hasSentiment: key === "mention",
  match: { hosts: match.hosts ?? [], paths: match.paths ?? [] },
});

// The live vocabulary's rule shapes (web.brand_relation_kind.metadata.match), trimmed.
const KINDS = [
  kind("ours", "ours"),
  kind("our_store_listing", "ours", { paths: ["^etsy\\.com/shop/"] }),
  kind("job_posting", "ours", { paths: ["^linkedin\\.com/jobs/"], hosts: ["jobs.lever.co"] }),
  kind("review_site", "about_us", { hosts: ["yelp.com", "g2.com"] }),
  kind("claimable_listing", "about_us", { hosts: ["crunchbase.com"] }),
  kind("mention", "about_us", { hosts: ["eater.com"] }),
  kind("not_us", "not_us"),
  kind("irrelevant", "irrelevant"),
];

const CTX: SuggestContext = {
  ourHosts: ["ritualcoffee.com"],
  ourAccounts: ["instagram.com/ritualcoffee"],
  name: "Ritual Coffee Roasters",
};

const web = (url: string, label: string, over: Partial<EvidenceItem> = {}): EvidenceItem =>
  parseEvidenceItem({
    key: `web:${url}`,
    field: "web_page",
    value: url,
    url,
    label,
    source: { node: "web", kind: "web_search", url, where: "web result 1" },
    confidence: 0.4,
    hits: [{ engine: "google", rank: 1, query: '"Ritual Coffee Roasters"', endpoint: "web" }],
    ...over,
  }) as EvidenceItem;

describe("On the web: deterministic suggestions (no AI)", () => {
  it("our own site or a subdomain of it is Ours", () => {
    expect(suggestKind(web("https://shop.ritualcoffee.com/beans", "Beans"), KINDS, CTX)?.kind).toBe("ours");
  });
  it("a post on our confirmed account is Ours", () => {
    expect(suggestKind(web("https://www.instagram.com/ritualcoffee/p/abc", "Post"), KINDS, CTX)?.kind).toBe("ours");
  });
  it("each kind's own host/path rules (data) claim their sites", () => {
    expect(suggestKind(web("https://www.yelp.com/biz/ritual", "Ritual"), KINDS, CTX)?.kind).toBe("review_site");
    expect(suggestKind(web("https://www.crunchbase.com/organization/x", "X"), KINDS, CTX)?.kind).toBe("claimable_listing");
    expect(suggestKind(web("https://sf.eater.com/best", "Best"), KINDS, CTX)?.kind).toBe("mention");
    expect(suggestKind(web("https://www.linkedin.com/jobs/view/1", "Barista"), KINDS, CTX)?.kind).toBe("job_posting");
    expect(suggestKind(web("https://www.etsy.com/shop/ritual", "Shop"), KINDS, CTX)?.kind).toBe("our_store_listing");
  });
  it("a page naming our website is a mention; our name on another site is possibly not us", () => {
    const names = web("https://blog.example.org/x", "Coffee crawl", { snippet: "We loved ritualcoffee.com" });
    expect(suggestKind(names, KINDS, CTX)?.kind).toBe("mention");
    const other = suggestKind(web("https://ritualcoffeeroasters.co.uk/", "Ritual Coffee Roasters UK"), KINDS, CTX);
    expect(other?.kind).toBe("not_us");
    expect(other?.reason).toContain("ritualcoffee.com");
  });
  it("anything else gets no suggestion", () => {
    expect(suggestKind(web("https://example.org/", "Something"), KINDS, CTX)).toBeNull();
  });
});

describe("On the web: rows", () => {
  it("merge by best rank, show every engine's rank, group answered rows by answer", () => {
    const a = web("https://a.example/", "A", { hits: [{ engine: "brave", rank: 4, query: "q", endpoint: "web" }] });
    const b = web("https://b.example/", "B", {
      engines: ["google", "brave"],
      hits: [
        { engine: "google", rank: 2, query: "q", endpoint: "web" },
        { engine: "brave", rank: 1, query: "q", endpoint: "web" },
      ],
    });
    expect(webRow([a, b]).map((i) => i.label)).toEqual(["B", "A"]);
    expect(engineRanks(b)).toBe("Google #2 · Brave #1");
    const groups = groupByKind([a, b], { [b.key]: { kind: "not_us", sentiment: null }, [a.key]: { kind: "ours", sentiment: null } }, KINDS);
    expect(groups.map((g) => g.kind.key)).toEqual(["ours", "not_us"]);
  });
});
