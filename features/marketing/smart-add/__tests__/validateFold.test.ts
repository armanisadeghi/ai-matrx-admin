/**
 * validate/fold.ts against the duplicates the Rooter Hero Create saved (brand a6ff5cc0, 2026-10-14): one real
 * thing must reach the stage once, and what the brand already knows must never be asked.
 */
import { fromRow, type SavedRow } from "../validate/fromSaved";
import { answeredKeysOf, foldQueue, socialIdentity, streetKey } from "../validate/fold";
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
];

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
});
