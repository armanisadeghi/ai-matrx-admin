import type { BrandRelationKind } from "@/features/marketing/data/service";
import { parseEvidenceItem, webRow, type EvidenceItem } from "../evidence";
import { backlinkSuggestion, engineRanks, exclusionMatchForUrl, groupByKind, ruleFillIn, suggestKind, type SuggestContext } from "../webKinds";
import { BACKLINK_KIND, parseBacklinkCheck, withPageKind } from "../backlinks";

const kind = (key: string, stance: BrandRelationKind["stance"], match: Partial<BrandRelationKind["match"]> = {}): BrandRelationKind => ({
  id: key,
  key,
  label: key,
  routesTo: key === "not_us" ? "exclusion" : key === "ours" ? "brand_property" : null,
  isKnown: true,
  stance,
  description: null,
  hasSentiment: key === "mention",
  usage: "use",
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

describe("a wrong Not us is the worst error: own pages and articles are never Not us (MKT-038)", () => {
  const RC: SuggestContext = { ...CTX, ourHandles: ["ritualcoffee"], foundAccounts: ["facebook.com/ritualcoffeeroasters"] };
  it("an order page named with our account's handle is Ours", () => {
    expect(suggestKind(web("https://ritualcoffee.square.site/", "Order online"), KINDS, RC)?.kind).toBe("ours");
    expect(suggestKind(web("https://order.example.com/ritualcoffee", "Order"), KINDS, RC)?.kind).toBe("ours");
  });
  it("a found account of ours is never suggested Not us", () => {
    const s = suggestKind(web("https://www.facebook.com/ritualcoffeeroasters", "Ritual Coffee Roasters | Facebook"), KINDS, RC);
    expect(s?.kind).not.toBe("not_us");
  });
  it("an article whose title leads with our whole name is a mention, not Not us", () => {
    const s = suggestKind(web("https://www.cntraveler.com/story/ritual-coffee-roasters", "Ritual Coffee Roasters — San Francisco | Condé Nast Traveler", { snippet: "Ritual Coffee Roasters opened" }), KINDS, RC);
    expect(s?.kind).toBe("mention");
  });
  it("a namesake's own site is still possibly Not us", () => {
    expect(suggestKind(web("https://ritualcoffeeroasters.co.uk/", "Ritual Coffee Roasters UK"), KINDS, RC)?.kind).toBe("not_us");
  });
});

describe("a common-name business: other cities and strangers (MKT-039)", () => {
  const EP: SuggestContext = { ourHosts: [], ourAccounts: [], name: "Elite Plumbing", place: "Austin, TX" };
  const kindOf = (url: string, label: string, snippet = "") => suggestKind(web(url, label, { snippet }), KINDS, EP)?.kind;
  it("the same name in another state is Not us", () => {
    expect(kindOf("https://eliteplumbingin.com/", "Elite Plumbing - Indianapolis, IN")).toBe("not_us");
    expect(kindOf("https://example.com/a", "Elite Plumbing", "Serving Phoenix, AZ since 1990")).toBe("not_us");
    expect(kindOf("https://example.com/b", "Elite Plumbing Milwaukee", "Wisconsin's trusted plumber")).toBe("not_us");
  });
  it("the same name in our own state stays a mention", () => {
    expect(kindOf("https://example.com/c", "Elite Plumbing - Austin, TX", "Elite Plumbing in Austin")).toBe("mention");
  });
  it("with only a city known, a page naming a state and not our city is Not us", () => {
    const ctx = { ...EP, place: "Austin" };
    expect(suggestKind(web("https://x.com/", "Elite Plumbing, Des Moines, Iowa"), KINDS, ctx)?.kind).toBe("not_us");
    expect(suggestKind(web("https://x.com/", "Elite Plumbing, Austin, Texas"), KINDS, ctx)?.kind).toBe("mention");
  });
  it("obituary and people-search pages are Irrelevant", () => {
    expect(kindOf("https://www.legacy.com/us/obituaries/x", "John Elite Plumbing owner obituary")).toBe("irrelevant");
    expect(kindOf("https://www.spokeo.com/Elite-Plumbing", "Elite Plumbing - Spokeo")).toBe("irrelevant");
  });
});

describe("recognized pages (VISION Part 22)", () => {
  const credential = {
    id: "k-cred",
    key: "credential",
    label: "Our credential",
    routesTo: null,
    isKnown: true,
    stance: "ours" as const,
    description: null,
    hasSentiment: false,
    usage: "use" as const,
    match: { hosts: [], paths: [], categories: ["certification_body", "professional_registry"] },
    fact: "credential",
  };
  const item = (url: string, category: string | null) =>
    ({
      key: `web:${url}`,
      field: "web_page",
      value: url,
      url,
      label: "Acme Shred",
      image_url: null,
      platform: null,
      handle: null,
      followers: null,
      verified: null,
      profile_id: null,
      source: { node: "n", kind: "web_search", url, where: null },
      confidence: 0.5,
      ...(category
        ? { siteKind: { category, label: "Certification body", signal: "page_address", reason: "certification page", fact: "credential", fields: {} } }
        : {}),
    }) as EvidenceItem;
  const ctx = { ourHosts: ["acmeshred.com"], ourAccounts: [], name: "Acme Shred" };

  it("suggests the kind whose categories name the recognized category", () => {
    expect(suggestKind(item("https://unknown-certifier.org/certified/acme", "certification_body"), [credential], ctx)?.kind).toBe("credential");
  });

  it("an unrecognized page gets no credential suggestion", () => {
    expect(suggestKind(item("https://unknown-certifier.org/about", null), [credential], ctx)?.kind).not.toBe("credential");
  });
});

describe("a suggestion never contradicts its classifier (MKT-181)", () => {
  const NAME_START: SuggestContext = { ourHosts: [], ourAccounts: [], name: "The Blue Cake Company", place: "Little Rock, AR" };
  const home = () => web("https://www.thebluecakecompany.com/", "The Blue Cake Company | Little Rock, AR");
  it("with no website known yet, a site whose address is our name is not Not us", () => {
    expect(suggestKind(home(), KINDS, NAME_START)?.kind).not.toBe("not_us");
    expect(suggestKind(web("https://www.thebluecakecompany.com/order", "Order"), KINDS, NAME_START)?.kind).not.toBe("not_us");
  });
  it("a namesake's own site is still possibly Not us when we know our own site", () => {
    const known = { ...NAME_START, ourHosts: ["bluecakes.example"], place: undefined };
    expect(suggestKind(web("https://thebluecakecompany.co.uk/", "Cakes"), KINDS, known)?.kind).toBe("not_us");
  });
  it("when the classifier said needs a person, a rule may not suggest Not us or Irrelevant", () => {
    expect(ruleFillIn("later", { kind: "not_us", reason: "x" })).toBeNull();
    expect(ruleFillIn("later", { kind: "irrelevant", reason: "x" })).toBeNull();
    expect(ruleFillIn("later", { kind: "mention", reason: "x" })?.kind).toBe("mention");
    expect(ruleFillIn(undefined, { kind: "not_us", reason: "x" })?.kind).toBe("not_us");
  });
});

describe("a page that links to the brand AND is recognized as something specific", () => {
  const k = (key: string, categories: string[]): BrandRelationKind => ({ ...kind(key, "about_us"), match: { hosts: [], paths: [], categories } });
  const KINDS_WITH = [...KINDS, kind(BACKLINK_KIND, "about_us"), k("credential", ["certification_body"]), k("membership", ["trade_association"]), k("press_mention", ["news"])];
  const ctx: SuggestContext = { ourHosts: ["acmeshred.com"], ourAccounts: [], name: "Acme Shred" };
  const check = (url: string) =>
    parseBacklinkCheck({
      key: `web:${url}`,
      url,
      status: "found",
      backlinks: [{ target_kind: "website", platform: null, matched_url: "https://acmeshred.com", anchor_text: "Acme", label: "acmeshred.com" }],
    })!;
  const page = (url: string, category: string | null) =>
    web(url, "Acme Shred", category ? ({ site_kind: { category, label: "x", signal: "known_site", reason: "r", fact: null, fields: {} } } as Partial<EvidenceItem>) : {});

  it.each([
    ["certification_body", "credential"],
    ["trade_association", "membership"],
    ["news", "press_mention"],
  ])("a recognized %s page keeps %s as the suggestion; the link stays a badge", (category, expected) => {
    const url = "https://unknown-site.org/a";
    const i = page(url, category);
    expect(backlinkSuggestion(i, KINDS_WITH, check(url))).toBeNull();
    expect(suggestKind(i, KINDS_WITH, ctx)?.kind).toBe(expected);
  });

  it("backlink is the suggestion only when nothing more specific was recognized", () => {
    const url = "https://unknown-site.org/b";
    expect(backlinkSuggestion(page(url, null), KINDS_WITH, check(url))?.kind).toBe(BACKLINK_KIND);
    // a recognized category no kind names is not "more specific" for us either
    expect(backlinkSuggestion(page(url, "podcast"), KINDS_WITH, check(url))?.kind).toBe(BACKLINK_KIND);
    expect(backlinkSuggestion(page(url, null), KINDS, check(url))).toBeNull(); // no Backlink kind in the vocabulary
  });

  it("the backlinks step's own recognition (read off the page) completes the row's", () => {
    const url = "https://unknown-site.org/c";
    const c = parseBacklinkCheck({
      key: `web:${url}`, url, status: "found", backlinks: [],
      site_kind: { category: "news", label: "News", signal: "page_markup", reason: "schema.org NewsArticle", fact: "press_mention", fields: { headline: "Acme" } },
    })!;
    const merged = withPageKind(page(url, null), c);
    expect(merged.siteKind?.signal).toBe("page_markup");
    expect(suggestKind(merged, KINDS_WITH, ctx)?.kind).toBe("press_mention");
    expect(withPageKind(page(url, null), undefined).siteKind ?? null).toBeNull();
  });
});
