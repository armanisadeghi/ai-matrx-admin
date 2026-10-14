/**
 * A broken address is explained from what the site says about it — who links
 * there, whether it ever worked — and the fix follows from those facts.
 * Fixture: the live All Green case (2026-10-14) — a sitewide "Your Industry"
 * link to /industries-served while the real page is /industries.
 */
import { parsePageProvenance } from "@/features/marketing/data/page-provenance";
import { explainMissingPage } from "@/features/marketing/lib/missing-page-story";

const live = {
  url: "https://allgreenrecycling.com/industries-served",
  path: "/industries-served",
  inbound: {
    anchors: [
      { text: "Your Industry", pages: 1072 },
      { text: "including", pages: 1 },
    ],
    samples: ["/", "/blog", "/news", "/ojai", "/troy"],
    source_pages: 1072,
    crawled_pages: 1073,
  },
  page_id: "1420ec9e-f1e4-4410-855f-2f20a8676c4d",
  sitemaps: [],
  discovery: {
    from_path: "/nashville-davidson-data-destruction",
    discovered_at: "2026-07-29T04:51:14.345576+00:00",
    discovery_source: "link",
  },
  known_from: "crawl",
  status_now: 404,
  known_since: "2026-07-20T19:42:53.925947+00:00",
  replacements: [
    { url: "https://allgreenrecycling.com/industries", path: "/industries", page_id: "171e" },
  ],
  ever_worked_at: null,
  search_console: { connected: true, clicks_90d: 0, impressions_90d: 0, last_impression_date: null },
  working_children: { count: 12, samples: ["/industries-served/bulk-storage"] },
};

const variant = (patch: Record<string, unknown>) =>
  explainMissingPage(parsePageProvenance({ ...live, ...patch }), 404);

describe("explainMissingPage", () => {
  it("names the sitewide link and the one edit that fixes it", () => {
    const story = variant({});
    expect(story.headline).toContain("“Your Industry” link points to /industries-served");
    expect(story.headline).toContain("menu or footer");
    expect(story.remedy.title).toBe("Fix the “Your Industry” link");
    expect(story.remedy.instruction).toContain(
      "Change the “Your Industry” link from /industries-served to /industries.",
    );
    expect(story.remedy.instruction).toContain("one edit fixes all 1,072 pages");
    expect(story.remedy.instruction).toContain("Don't create a page at /industries-served");
    expect(story.replacement?.path).toBe("/industries");
  });

  it("states every measured fact, unknowns included", () => {
    const facts = Object.fromEntries(variant({}).facts.map((f) => [f.label, f.value]));
    expect(facts["Linked from"]).toBe("1,072 of your 1,073 pages · “Your Industry”");
    expect(facts["Ever worked"]).toMatch(/^Never, since we found it Jul 2[89], 2026$/);
    expect(facts["In your sitemap"]).toBe("No");
    expect(facts["Google, last 90 days"]).toBe("Not shown in any search");
    expect(facts["Pages under it"]).toBe("12 working, e.g. /industries-served/bulk-storage");
    const unbound = Object.fromEntries(
      variant({ search_console: { connected: false } }).facts.map((f) => [f.label, f.value]),
    );
    expect(unbound["Google, last 90 days"]).toBe("Search Console not connected");
  });

  it("a page that used to work is restored or redirected, not relinked", () => {
    const story = variant({ ever_worked_at: "2026-05-01T00:00:00Z" });
    expect(story.remedy.title).toBe("Restore or redirect /industries-served");
    expect(story.remedy.instruction).toContain("redirect /industries-served to /industries");
  });

  it("an address nothing asks for is low priority", () => {
    const story = variant({
      inbound: { anchors: [], samples: [], source_pages: 0, crawled_pages: 1073 },
    });
    expect(story.remedy.title).toBe("Probably nothing to do");
    expect(story.headline).toContain("Google doesn't show it");
    const unbound = variant({
      inbound: { anchors: [], samples: [], source_pages: 0, crawled_pages: 1073 },
      search_console: { connected: false },
    });
    // Never claim what Google shows when we cannot see Google.
    expect(unbound.headline).not.toContain("Google");
  });

  it("a few-page link lists where it is", () => {
    const story = variant({
      inbound: { anchors: [{ text: "Read more", pages: 3 }], samples: ["/a", "/b", "/c"], source_pages: 3, crawled_pages: 1073 },
    });
    expect(story.remedy.where).toBe("the pages that carry the link");
    expect(story.remedy.instruction).toContain("It appears on: /a, /b, /c.");
  });

  it("drifted JSON is refused, never read as zero", () => {
    expect(() => parsePageProvenance({ ...live, inbound: { anchors: [] } })).toThrow(
      /inbound.source_pages/,
    );
  });
});
