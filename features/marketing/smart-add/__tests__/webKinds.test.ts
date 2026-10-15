import type { BrandRelationKind } from "@/features/marketing/data/service";
import { parseEvidenceItem, webRow, type EvidenceItem } from "../evidence";
import { engineRanks, exclusionMatchForUrl, groupByKind, suggestKind, type SuggestContext } from "../webKinds";

const kind = (key: string, stance: BrandRelationKind["stance"], match: Partial<BrandRelationKind["match"]> = {}): BrandRelationKind => ({
  id: key,
  key,
  label: key,
  routesTo: key === "not_us" ? "exclusion" : key === "ours" ? "brand_property" : null,
  isKnown: true,
  stance,
  description: null,
  hasSentiment: key === "mention",
  match: { hosts: match.hosts ?? [], paths: match.paths ?? [], categories: [] },
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
    expect(engineRanks(b)).toBe("#1 · #2");
    const groups = groupByKind([a, b], { [b.key]: { kind: "not_us", sentiment: null }, [a.key]: { kind: "ours", sentiment: null } }, KINDS);
    expect(groups.map((g) => g.kind.key)).toEqual(["ours", "not_us"]);
  });
});

describe("On the web: mistaken identity vs a mention (live shapes, fullspecstaff.com 2026-10-13)", () => {
  const FS: SuggestContext = { ourHosts: ["fullspecstaff.com"], ourAccounts: [], name: "Full Spectrum Search Group" };
  it("a similar-named business's own page is possibly not us", () => {
    const fb = web("https://www.facebook.com/spectrumsearchgroup", "Spectrum Search Group | Facebook");
    expect(suggestKind(fb, KINDS, FS)?.kind).toBe("not_us");
    expect(suggestKind(fb, KINDS, FS)?.reason).toContain("Similar name");
  });
  it("a news page that names us in its snippet is a mention, never not us", () => {
    const news = web(
      "https://directrecruiters.com/news/direct-recruiters-inc-expands-executive-search-offerings-with-the-strategic-integration-of-full-spectrum-search-group/",
      "Direct Recruiters, Inc. Expands Executive Search Offerings ...",
      { snippet: "Based in California, Full Spectrum Search Group has been a leading executive search firm" },
    );
    expect(suggestKind(news, KINDS, FS)?.kind).toBe("mention");
  });
  it("an unrelated staffing page gets no suggestion", () => {
    expect(suggestKind(web("https://sharestaff.net/divisions/healthcare/", "Healthcare - Nationwide Staffing"), KINDS, FS)).toBeNull();
  });
});

describe("On the web: live false positives stay fixed", () => {
  const FS: SuggestContext = { ourHosts: ["fullspecstaff.com"], ourAccounts: [], name: "Full Spectrum Search Group" };
  it("a long news title that names us is not a mistaken identity", () => {
    const t = "Direct Recruiters, Inc. Expands Executive Search Offerings with the Strategic Integration of Full Spectrum Search Group";
    expect(suggestKind(web("https://directrecruiters.com/news/x-full-spectrum-search-group/", t), KINDS, FS)?.kind).toBe("mention");
  });
  it("a job slug naming us is not a mistaken identity", () => {
    const job = web("https://www.wayup.com/i-j-healthcare-recruiter-full-spectrum-search-group/", "Healthcare Recruiter - Long Term Care");
    expect(suggestKind(job, KINDS, FS)?.kind).not.toBe("not_us");
  });
  it("one address found as a listing and as a news result is one row", () => {
    const listing = parseEvidenceItem({ ...web("https://www.yelp.com/biz/fs", "x"), key: "listing:yelp.com/biz/fs", field: "listing" }) as EvidenceItem;
    const mention = parseEvidenceItem({ ...web("https://yelp.com/biz/fs/", "x"), key: "mention:yelp.com/biz/fs", field: "mention" }) as EvidenceItem;
    expect(webRow([mention, listing]).map((i) => i.key)).toEqual(["listing:yelp.com/biz/fs"]);
  });
});

describe("a Not-us web exclusion keeps the query that names the page (MKT-073)", () => {
  it("excluding one YouTube video does not exclude every video", () => {
    const one = exclusionMatchForUrl("https://www.youtube.com/watch?v=AbC123&si=trk");
    expect(one).toEqual({ kind: "url", value: "youtube.com/watch?v=AbC123" });
    expect(one).not.toEqual(exclusionMatchForUrl("https://www.youtube.com/watch?v=Zzz999"));
  });
  it("a bare site stays a host, a path page a url", () => {
    expect(exclusionMatchForUrl("https://www.yelp.com/")).toEqual({ kind: "host", value: "yelp.com" });
    expect(exclusionMatchForUrl("https://yelp.com/biz/x?utm_source=a")).toEqual({ kind: "url", value: "yelp.com/biz/x" });
  });
});
