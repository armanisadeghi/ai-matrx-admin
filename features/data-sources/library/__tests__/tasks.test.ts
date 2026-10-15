import { parseLibrary } from "../catalog";
import { LIBRARY_TASKS, resolveTask, resolveTasks } from "../tasks";

/** A catalog shaped like the live server's richer answer. */
const LIBRARY = parseLibrary({
  sources: [
    { key: "trustpilot_reviews", label: "Trustpilot reviews", group: "Reviews & reputation", input: { kind: "url" }, verified_live: true, featured: true, usd_per_record: 0.0015, output_fields: ["review_text", "rating"] },
    { key: "yelp_reviews", label: "Yelp reviews", group: "Reviews & reputation", input: { kind: "url" }, verified_live: false, usd_per_record: 0.0015 },
    { key: "google_maps_place", label: "Google Maps place", group: "Places & local business", input: { kind: "url" }, verified_live: true, usd_per_record: 0.002 },
    { key: "amazon_product", label: "Amazon product", group: "Ecommerce & products", input: { kind: "url" }, verified_live: true, usd_per_record: 0.0015 },
    { key: "zillow_listing", label: "Zillow listing", group: "Real estate", input: { kind: "url" }, verified_live: true, usd_per_record: 0.0015 },
  ],
});

describe("resolveTask", () => {
  it("keeps the task's own order and drops keys the catalog no longer ships", () => {
    const task = LIBRARY_TASKS.find((t) => t.id === "company-reviews")!;
    const r = resolveTask(LIBRARY, task);
    // g2_reviews is absent here, so it drops; the survivors keep curated order.
    expect(r.all.map((s) => s.key)).toEqual(["trustpilot_reviews", "google_maps_place", "yelp_reviews"]);
  });

  it("puts live-verified sources first and the rest under more", () => {
    const task = LIBRARY_TASKS.find((t) => t.id === "company-reviews")!;
    const r = resolveTask(LIBRARY, task);
    expect(r.confirmed.map((s) => s.key)).toEqual(["trustpilot_reviews", "google_maps_place"]);
    expect(r.more.map((s) => s.key)).toEqual(["yelp_reviews"]);
  });

  it("falls back to plain-word search when no curated key survives", () => {
    const task = { id: "x", title: "t", example: "e", icon: (() => null) as never, sourceKeys: ["nope_nope"], search: "homes houses real estate property" };
    const r = resolveTask(LIBRARY, task);
    expect(r.all.map((s) => s.key)).toContain("zillow_listing");
  });
});

describe("resolveTasks", () => {
  it("hides tasks that land on nothing and never repeats a source within a task", () => {
    const tasks = resolveTasks(LIBRARY);
    expect(tasks.length).toBeGreaterThan(0);
    for (const t of tasks) {
      const keys = t.all.map((s) => s.key);
      expect(new Set(keys).size).toBe(keys.length);
      expect(t.all.length).toBeGreaterThan(0);
    }
  });

  it("every curated task title reads as a plain job, not a feature name", () => {
    for (const t of LIBRARY_TASKS) {
      expect(t.title.length).toBeLessThanOrEqual(48);
      expect(t.example.length).toBeLessThanOrEqual(60);
      expect(t.sourceKeys.length).toBeGreaterThan(0);
    }
  });
});
