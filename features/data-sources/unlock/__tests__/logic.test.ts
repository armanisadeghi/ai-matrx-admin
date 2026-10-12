import { addToTally, dedupeByHost, EMPTY_TALLY, firstLines, normalizeUrl, parseCompare } from "../logic";

const row = (id: string, url: string, reason: string, at: string) => ({ id, input_ref: url, error_class: reason, last_seen_at: at });

describe("dedupeByHost", () => {
  it("keeps the newest row per host, drops non-http refs and non-page reasons", () => {
    const out = dedupeByHost([
      row("1", "https://www.a.com/x", "bot_wall", "2026-10-01T00:00:00Z"),
      row("2", "https://a.com/y", "login_wall", "2026-10-03T00:00:00Z"),
      row("3", "7e57e81e-d2dc-4867", "bot_wall", "2026-10-04T00:00:00Z"),
      row("4", "https://b.com/", "drm_protected", "2026-10-05T00:00:00Z"),
      row("5", "https://c.com/", "thin_content", "2026-10-02T00:00:00Z"),
    ]);
    expect(out.map((r) => r.id)).toEqual(["2", "5"]);
    expect(out[0].host).toBe("a.com");
  });
});

describe("tally and verdicts", () => {
  it("counts tried, unlocked and the points spent", () => {
    const mk = (verdict: string, points: number) =>
      parseCompare({ url: "https://a.com", verdict, ours: { ok: false }, unlocker: points ? { ok: true, points, cost_usd: 0.0015 } : null });
    let t = addToTally(EMPTY_TALLY, mk("unlocked", 30));
    t = addToTally(t, mk("ours_was_fine", 0));
    t = addToTally(t, mk("both_failed", 30));
    expect(t).toMatchObject({ tried: 3, unlocked: 1, points: 60 });
    expect(t.usd).toBeCloseTo(0.003);
  });
  it("an unknown verdict reads as both failed, never as a win", () => {
    expect(parseCompare({ verdict: "weird" }).verdict).toBe("both_failed");
  });
});

describe("input helpers", () => {
  it("normalizes pasted addresses", () => {
    expect(normalizeUrl("example.com/a")).toBe("https://example.com/a");
    expect(normalizeUrl("  ")).toBeNull();
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
  });
  it("shows the first lines only", () => {
    expect(firstLines("a\n\nb\nc\nd\ne", 3)).toBe("a\nb\nc");
  });
});
