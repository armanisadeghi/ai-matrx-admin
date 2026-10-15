/**
 * validate/fold.ts against the duplicates the Rooter Hero Create saved (brand a6ff5cc0, 2026-10-14): one real
 * thing must reach the stage once, and what the brand already knows must never be asked.
 */
import { fromRow, type SavedRow } from "../validate/fromSaved";
import { gapFacts } from "../validate/queue";
import { accountOfPost, answeredKeysOf, foldQueue, sameSpokenName, socialIdentity, streetKey } from "../validate/fold";
import { buildQueue, type BrandFact } from "../validate/queue";
import type { EvidenceItem } from "../evidence";

let n = 0;
function row(category: string, guessed_kind: string, text: string, extra: Record<string, unknown> = {}, url: string | null = null): SavedRow {
  n += 1;
  const { field, ...rest } = extra;
  return {
    id: `r${n}`,
    category,
    guessed_kind,
    url,
    value: { text, ...(field ? { field, field_label: String(field), certainty: "likely", reason: "r", evidence_urls: [] } : {}), ...rest } as never,
    context: { evidence_key: `${guessed_kind}:${n}`, step: "web", where: "web result" } as never,
    confidence: 0.6,
  };
}

const ROWS: SavedRow[] = [
  row("fact", "phone", "(866) 941-8214", { field: "phone" }),
  row("fact", "phone", "+1-866-941-8214"),
  row("fact", "address", "5772 Commerce Blvd"),
  row("fact", "address", "5772 Commerce Blvd, Rohnert Park, CA, 94928"),
  row("fact", "address", "2827 Aiello Dr., San Jose, CA, 95111"),
  row("fact", "additional_location", "2827 Aiello Dr, San Jose, CA 95111", { field: "additional_location" }),
  row("social", "facebook", "https://www.facebook.com/rooterherotosaveyourday", { handle: "rooterherotosaveyourday" }, "https://www.facebook.com/rooterherotosaveyourday"),
  row("fact", "social_facebook", "https://www.facebook.com/rooterherotosaveyourday/", { field: "social_facebook" }),
  row("link", "web_page", "https://www.facebook.com/rooterherotosaveyourday", { label: "Rooter Hero Plumbing" }, "https://www.facebook.com/rooterherotosaveyourday"),
  row("social", "instagram", "https://www.instagram.com/p/DboJiddGte_", { handle: "DboJiddGte_" }, "https://www.instagram.com/p/DboJiddGte_"),
  row("identity", "bio_link", "https://www.rooterhero.com/blog", { label: "Read our Blogs!" }, "https://www.rooterhero.com/blog"),
  row("fact", "website", "https://www.rooterhero.com", { field: "website" }),
  row("fact", "official_name", "Rooter Hero Plumbing & Air", { field: "official_name" }),
  row("link", "listing", "https://www.yelp.com/biz/rooter-hero-plumbing-anaheim", { label: "Yelp" }, "https://www.yelp.com/biz/rooter-hero-plumbing-anaheim"),
  row("link", "listing", "https://www.yelp.com/biz/rooter-hero-mission-hills", { label: "Yelp" }, "https://www.yelp.com/biz/rooter-hero-mission-hills"),
  row("fact", "primary_products_services", "Drain cleaning", { field: "primary_products_services" }),
  row("fact", "primary_products_services", "HVAC services", { field: "primary_products_services" }),
  row("fact", "founder", "John Akhoin", { field: "founder" }),
  row("fact", "ceo", "John Akhoian", { field: "ceo" }),
  row("link", "web_page", "https://www.linkedin.com/posts/rooter-hero-plumbing_today-we-asked-ceo-john-akhoian", { label: "Today we asked CEO, John Akhoian what is the best" }, "https://www.linkedin.com/posts/rooter-hero-plumbing_today-we-asked-ceo-john-akhoian"),
];

function fixtureFactsForGap(): BrandFact[] {
  return ROWS.map(fromRow).flatMap((one) => (one && "fact" in one ? [one.fact] : []));
}

function stage() {
  const items: EvidenceItem[] = [];
  const facts: BrandFact[] = [];
  for (const r of ROWS) {
    const one = fromRow(r);
    if (one && "fact" in one) facts.push(one.fact);
    else if (one) items.push(one.item);
  }
  const raw = buildQueue({ items, facts, decisions: {}, webChoices: {}, answered: new Set(), later: [], kinds: [], ctx: { ourHosts: [], ourAccounts: [], name: null } });
  return foldQueue({
    queue: raw,
    known: { names: ["Rooter Hero Plumbing & Air"], hosts: ["https://www.rooterhero.com/"], urls: ["https://www.rooterhero.com/"], values: [] },
    later: [],
  });
}

describe("validate fold", () => {
  it("keeps the missing-core gap cards in front, one card each (MKT-143)", () => {
    const raw = buildQueue({ items: [], facts: fixtureFactsForGap(), decisions: {}, webChoices: {}, answered: new Set(), later: [], kinds: [], ctx: { ourHosts: [], ourAccounts: [], name: null }, gaps: gapFacts(["website", "account"]) });
    const out = foldQueue({ queue: raw, known: { names: [], hosts: [], urls: [], values: [] }, later: [] });
    expect(out.slice(0, 2).map((c) => c.key)).toEqual(["gap:website", "gap:account"]);
  });

  it("normalizes identities", () => {
    expect(streetKey("300 East Esplanade Dr., Suite 101, Oxnard")).toBe("300 e esplanade dr");
    expect(streetKey("Los Angeles, California")).toBeNull();
    expect(socialIdentity("https://www.instagram.com/rooterhero/?hl=en").key).toBe("acct:instagram:rooterhero");
    expect(socialIdentity("https://www.instagram.com/p/DboJiddGte_").post).toBe(true);
    expect(socialIdentity("https://www.linkedin.com/in/jane-doe").person).toBe(true);
  });

  it("shows one card per real thing and never asks what the brand knows", () => {
    const q = stage();
    const values = q.map((c) => `${c.kind}|${c.label}|${c.value}`);
    // One phone card (two spellings), one card per street (short, full and the agent's location fold).
    expect(q.filter((c) => /941-?8214/.test(c.value) || c.twins.some((t) => t.startsWith("phone")))).toHaveLength(1);
    const locations = q.find((c) => c.key === "set:locations");
    expect(locations?.members).toHaveLength(2);
    // The Facebook account, the agent's social_facebook and the web result of the same page: one account card.
    const fb = q.filter((c) => c.value.includes("rooterherotosaveyourday") || c.twins.some((t) => t.includes("social_facebook")));
    expect(fb).toHaveLength(1);
    expect(fb[0].kind).toBe("account");
    expect(answeredKeysOf(fb[0])).toHaveLength(3);
    // A post address is a post, never an account.
    expect(q.find((c) => c.value.includes("/p/DboJiddGte_"))?.kind).toBe("web");
    // Known: the brand's own website, a page on it, and its name.
    expect(values.some((v) => v.includes("rooterhero.com/blog") || v.endsWith("|https://www.rooterhero.com"))).toBe(false);
    expect(values.some((v) => v.includes("Rooter Hero Plumbing & Air"))).toBe(false);
    // Two Yelp pages: one card.
    expect(q.filter((c) => c.value.includes("yelp.com"))).toHaveLength(1);
    // Two services: one set card.
    expect(q.find((c) => c.key === "set:offerings")?.members).toHaveLength(2);
    // Stage order: the account before the services before the locations.
    const at = (pred: (k: string) => boolean) => q.findIndex((c) => pred(c.key));
    expect(at((k) => k === "set:offerings")).toBeLessThan(at((k) => k === "set:locations"));
    expect(q[0].kind).toBe("account");
  });

  it("shows one person spelled two ways once, both spellings in the hover", () => {
    expect(sameSpokenName("John Akhoin", "John Akhoian")).toBe(true);
    expect(sameSpokenName("John Akhoin", "Jane Akhoin")).toBe(false);
    const people = stage().filter((c) => /Akhoi/.test(c.value));
    expect(people).toHaveLength(1);
    expect(people[0].spellings?.sort()).toEqual(["John Akhoian", "John Akhoin"]);
    expect(answeredKeysOf(people[0])).toHaveLength(2);
  });
});

describe("a page of our own account folds into the account (MKT-045)", () => {
  it("names the account a post sits under, and none for a profile or a bare post address", () => {
    expect(accountOfPost("https://www.facebook.com/ritualcoffee/posts/123")).toBe("acct:facebook:ritualcoffee");
    expect(accountOfPost("https://www.facebook.com/ritualcoffee")).toBeNull();
    expect(accountOfPost("https://www.instagram.com/p/DboJiddGte_")).toBeNull();
  });
});

describe("MKT-045 — the validate queue never asks a brand's own account again as a web page", () => {
  const web = (url: string): EvidenceItem => {
    const one = fromRow(row("link", "mention", url, { label: "TAQMIX" }, url));
    if (!one || !("item" in one)) throw new Error("not an item");
    return one.item;
  };
  const input = (items: EvidenceItem[], decisions: Record<string, "yes"> = {}) => ({
    items, facts: [], decisions, webChoices: {}, answered: new Set<string>(), later: [], kinds: [], ctx: { ourHosts: [], ourAccounts: [], name: "X" },
  });
  it("an owned account known only by platform + handle drops its profile and its posts", () => {
    const items = [web("https://www.facebook.com/TAQMIX/"), web("https://www.facebook.com/TAQMIX/posts/123")];
    const known = { names: [], hosts: [], urls: [], values: [], accounts: ["facebook:@TAQMIX"] };
    expect(foldQueue({ queue: buildQueue(input(items)), known, later: [] })).toEqual([]);
  });
  it("a social profile found on the web is an account question, not an On the web card", () => {
    const q = buildQueue(input([web("https://www.instagram.com/taqmix/")]));
    expect(q.map((f) => f.kind)).toEqual(["account"]);
  });
  it("a confirmed account's profile is dropped by the decision alone", () => {
    const acct = web("https://www.facebook.com/TAQMIX/");
    const items = [acct, { ...acct, key: "social:facebook:taqmix", field: "social" as const, platform: "facebook", handle: "TAQMIX" }, web("https://www.facebook.com/TAQMIX/photos/1")];
    const q = buildQueue(input(items, { "social:facebook:taqmix": "yes" }));
    expect(q.filter((f) => f.kind === "web")).toEqual([]);
  });
});

describe("MKT-044 — near-duplicate descriptions are one card", () => {
  it("seven About/description findings reach the stage as one card that answers all seven", () => {
    const facts: BrandFact[] = [];
    const items: EvidenceItem[] = [];
    const texts = [
      "Full Spectrum Search Group is a trusted advisor and executive search firm.",
      "Full Spectrum Search Group is a leading executive search firm for senior care.",
      "We are Full Spectrum Search Group, healthcare executive search.",
      "Executive search for senior care and healthcare, by Full Spectrum.",
      "Full Spectrum Search Group — executive recruiters in healthcare.",
      "Healthcare executive search firm serving senior living operators.",
      "A trusted advisor to healthcare employers.",
    ];
    texts.forEach((t, i) => {
      const one = fromRow(row("fact", i % 2 ? "description" : "short_description", t, { field: i % 2 ? "description" : "short_description" }));
      if (one && "fact" in one) facts.push(one.fact);
      else if (one) items.push(one.item);
    });
    const raw = buildQueue({ items, facts, decisions: {}, webChoices: {}, answered: new Set(), later: [], kinds: [], ctx: { ourHosts: [], ourAccounts: [], name: null } });
    expect(raw).toHaveLength(7);
    const cards = foldQueue({ queue: raw, known: { names: [], hosts: [], urls: [], values: [] }, later: [] });
    expect(cards).toHaveLength(1);
    expect(answeredKeysOf(cards[0])).toHaveLength(7);
  });
});

describe("logos already answered (MKT-139)", () => {
  const logoRows = [
    row("media", "logo", "https://cdn.example.com/a.png", { image_url: "https://cdn.example.com/a.png" }),
    row("media", "logo", "https://cdn.example.com/b.png", { image_url: "https://cdn.example.com/b.png" }),
  ];
  const queueOf = (rows: SavedRow[]) => {
    const items = rows.map((r) => fromRow(r)).flatMap((o) => (o && "item" in o ? [o.item] : []));
    return buildQueue({ items, facts: [], decisions: {}, webChoices: {}, answered: new Set(), later: [], kinds: [], ctx: { ourHosts: [], ourAccounts: [], name: null } });
  };
  it("folds every logo into one card", () => {
    const cards = foldQueue({ queue: queueOf(logoRows), known: { names: [], hosts: [], urls: [], values: [] }, later: [] });
    expect(cards).toHaveLength(1);
  });
  it("drops a logo whose picture was already answered, under whatever key a later round gives it", () => {
    const cards = foldQueue({ queue: queueOf(logoRows), known: { names: [], hosts: [], urls: [], values: [], images: ["https://cdn.example.com/a.png"] }, later: [] });
    expect(cards).toHaveLength(1);
    expect(cards[0].value).toContain("b.png");
    expect(cards[0].folded ?? []).toHaveLength(0);
  });
});
