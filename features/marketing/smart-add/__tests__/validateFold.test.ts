/**
 * validate/fold.ts against the duplicates the Rooter Hero Create saved (brand a6ff5cc0, 2026-10-14): one real
 * thing must reach the stage once, and what the brand already knows must never be asked.
 */
import { fromRow, type SavedRow } from "../validate/fromSaved";
import { gapFacts } from "../validate/queue";
import { accountOfPost, answeredKeysOf, foldQueue, logoImagesOf, logoLabel, sameSpokenName, socialIdentity, streetKey } from "../validate/fold";
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
    // Two different streets: two cards, each asked on its own (never a set answered at once).
    const locations = q.filter((c) => /Commerce Blvd|Aiello Dr/.test(c.value));
    expect(locations).toHaveLength(2);
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
    // Two services: two cards, one each — one card asks about ONE thing (Arman, 2026-10-22).
    expect(q.filter((c) => c.value === "Drain cleaning" || c.value === "HVAC services")).toHaveLength(2);
    expect(q.some((c) => c.key.startsWith("set:"))).toBe(false);
    // Stage order: the account before the services before the locations.
    const at = (pred: (v: string) => boolean) => q.findIndex((c) => pred(c.value));
    expect(at((v) => v === "HVAC services")).toBeLessThan(at((v) => /Commerce Blvd/.test(v)));
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
  it("asks about each picture on its own card, never a batch of logos at once (Arman, 2026-10-22)", () => {
    const cards = foldQueue({ queue: queueOf(logoRows), known: { names: [], hosts: [], urls: [], values: [] }, later: [] });
    expect(cards).toHaveLength(2);
    for (const c of cards) expect(c.folded ?? []).toHaveLength(0);
    expect(cards.map(logoLabel)).toEqual(["Logo", "Logo"]);
  });
  it("folds the same picture found at two addresses into one card", () => {
    const rows = [
      ...logoRows,
      row("media", "logo", "https://cdn.example.com/a.png", { image_url: "https://cdn.example.com/a.png" }, "https://www.facebook.com/acme"),
    ];
    const cards = foldQueue({ queue: queueOf(rows), known: { names: [], hosts: [], urls: [], values: [] }, later: [] });
    expect(cards).toHaveLength(2);
    const a = cards.find((c) => logoImagesOf(c).includes("https://cdn.example.com/a.png"));
    expect(a?.folded ?? []).toHaveLength(1);
    expect(logoImagesOf(a!)).toEqual(["https://cdn.example.com/a.png", "https://cdn.example.com/a.png"]);
  });
  it("folds near-identical pictures the server grouped (one mark, two image addresses) into one card", () => {
    const rows = [...logoRows, row("media", "logo", "https://scontent.example.net/a-200.jpg", { image_url: "https://scontent.example.net/a-200.jpg" })];
    const raw = queueOf(rows);
    const groupOf = new Map([
      [raw.find((q) => q.value.includes("a.png"))!.key, "g1"],
      [raw.find((q) => q.value.includes("a-200"))!.key, "g1"],
    ]);
    const cards = foldQueue({ queue: raw, known: { names: [], hosts: [], urls: [], values: [] }, later: [], samePicture: groupOf });
    expect(cards).toHaveLength(2);
    expect(cards.map((c) => logoImagesOf(c).length).sort()).toEqual([1, 2]);
  });
  it("drops a logo whose picture was already answered, under whatever key a later round gives it", () => {
    const cards = foldQueue({ queue: queueOf(logoRows), known: { names: [], hosts: [], urls: [], values: [], images: ["https://cdn.example.com/a.png"] }, later: [] });
    expect(cards).toHaveLength(1);
    expect(cards[0].value).toContain("b.png");
    expect(cards[0].folded ?? []).toHaveLength(0);
  });
});

describe("an undone earlier answer comes back (2026-10-22, pxdocs.com on brand e641a6d5)", () => {
  // The bio link the person answered "Ours": that answer made pxdocs.com one of the brand's sites, so the brand read on
  // load knows the host. Undo on the Answered list must still put the card back in focus.
  const bio = row("identity", "bio_link", "https://pxdocs.com/?utm_source=ig", { label: "pxdocs" }, "https://pxdocs.com/?utm_source=ig");
  const queue = () => {
    const one = fromRow(bio);
    const items = one && "item" in one ? [one.item] : [];
    return buildQueue({ items, facts: [], decisions: {}, webChoices: {}, answered: new Set(), later: [], kinds: [], ctx: { ourHosts: [], ourAccounts: [], name: null } });
  };
  const known = { names: [], hosts: ["https://pxdocs.com/", "pxdocs.com"], urls: ["https://pxdocs.com/"], values: [] };
  it("a page on a host the brand knows is not asked (unchanged rule)", () => {
    expect(foldQueue({ queue: queue(), known, later: [] })).toHaveLength(0);
  });
  it("the same card returns once its answer is undone", () => {
    const raw = queue();
    const cards = foldQueue({ queue: raw, known, later: [], reopened: new Set([raw[0].key]) });
    expect(cards.map((c) => c.key)).toEqual([raw[0].key]);
  });
});
