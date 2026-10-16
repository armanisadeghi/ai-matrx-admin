import type { Assist } from "@/features/assists/types";
import {
  brandAssistDedupeKey,
  costLine,
  offersToEmit,
  type BrandAssistOffers,
} from "../select-offers";

const BRAND = "3f6c2d1e-8a4b-4c3d-9e2f-1a2b3c4d5e6f";
const NOW = Date.parse("2026-10-16T18:00:00Z");

function offers(cooldown = 0): BrandAssistOffers {
  return {
    brand_id: BRAND,
    brand_name: "The Shrimp Farm",
    site: "theshrimpfarm.com",
    decline_cooldown_days: cooldown,
    offers: [
      { assist_id: "who_ranks", title: "", body: "", verb: "", lands: "", cost_usd: "0.06", cost_points: 1200, rank: 5.4, done: false },
      { assist_id: "colors_fonts", title: "", body: "", verb: "", lands: "", cost_usd: "0.0000", cost_points: 0, rank: 16, done: false },
      { assist_id: "name_volume", title: "", body: "", verb: "", lands: "", cost_usd: "0.05", cost_points: 1000, rank: 6, done: false },
    ],
  };
}

function row(assistId: string, patch: Partial<Assist>): Assist {
  return {
    dedupeKey: brandAssistDedupeKey(assistId, BRAND),
    status: "pending",
    suppressedUntil: null,
    decidedAt: null,
    ...patch,
  } as Assist;
}

describe("brand assist offers", () => {
  it("ranks most valuable, cheapest and most certain first", () => {
    expect(offersToEmit(offers(), [], NOW).map((o) => o.assist_id)).toEqual([
      "colors_fonts",
      "name_volume",
      "who_ranks",
    ]);
  });

  it("a dismissal (Not now / Stop showing) is never offered again by default", () => {
    const history = [row("colors_fonts", { status: "dismissed", decidedAt: "2025-01-01T00:00:00Z" })];
    expect(offersToEmit(offers(), history, NOW).map((o) => o.assist_id)).not.toContain("colors_fonts");
  });

  it("a snooze (Later) is a decline too", () => {
    const history = [row("name_volume", { suppressedUntil: "2026-10-16T19:00:00Z" })];
    expect(offersToEmit(offers(), history, NOW).map((o) => o.assist_id)).not.toContain("name_volume");
  });

  it("only the cooldown knob brings a declined assist back, and only after it passes", () => {
    const old = [row("who_ranks", { status: "dismissed", decidedAt: "2026-09-01T00:00:00Z" })];
    const recent = [row("who_ranks", { status: "dismissed", decidedAt: "2026-10-15T00:00:00Z" })];
    expect(offersToEmit(offers(30), old, NOW).map((o) => o.assist_id)).toContain("who_ranks");
    expect(offersToEmit(offers(30), recent, NOW).map((o) => o.assist_id)).not.toContain("who_ranks");
  });

  it("never re-offers one already pending, run, or done", () => {
    const data = offers();
    data.offers[0].done = true;
    const history = [row("colors_fonts", {}), row("name_volume", { status: "accepted" })];
    expect(offersToEmit(data, history, NOW)).toEqual([]);
  });

  it("states cost exactly in points and dollars", () => {
    expect(costLine({ cost_points: 0, cost_usd: "0" })).toBe("Free");
    expect(costLine({ cost_points: 1000, cost_usd: "0.05" })).toBe("1,000 points ($0.05)");
    expect(costLine({ cost_points: 100, cost_usd: "0.005" })).toBe("100 points ($0.0050)");
    expect(costLine({ cost_points: null, cost_usd: null })).toBe("Price not set");
  });
});
