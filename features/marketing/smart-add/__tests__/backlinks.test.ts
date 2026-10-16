import { backlinkChecksFrom, backlinkReason, reviewLinkCheck } from "../backlinks";

const found = {
  key: "listing:yelp.com/biz/joy",
  url: "https://www.yelp.com/biz/joy",
  status: "found",
  backlinks: [
    { target_kind: "website", platform: null, matched_url: "https://joycollectiveyoga.com", anchor_text: "Website", label: "joycollectiveyoga.com" },
    { target_kind: "social", platform: "instagram", matched_url: "https://instagram.com/joyyoga", anchor_text: "", label: "@joyyoga" },
  ],
  reason: null,
  checked_at: "2026-10-16T07:00:00+00:00",
};

describe("backlinks (aidream backlinks step → review row)", () => {
  it("reads frames and the step output, output winning", () => {
    const checks = backlinkChecksFrom(
      { checks: [found, { key: "web:b", url: "https://b.example", status: "none", backlinks: [] }] },
      [{ brand_backlinks: [{ key: "web:c", url: "https://c.example", status: "failed", reason: "the site answered 403" }] }, { other: 1 }],
    );
    expect(Object.keys(checks).sort()).toEqual(["listing:yelp.com/biz/joy", "web:b", "web:c"]);
    expect(checks["listing:yelp.com/biz/joy"].backlinks[1]).toMatchObject({ targetKind: "social", platform: "instagram" });
  });

  it("maps each state honestly: checking, found, none, couldn't check", () => {
    const checks = backlinkChecksFrom({ checks: [found] }, [{ brand_backlinks: [{ key: "x", url: "u", status: "failed", reason: "timeout" }] }]);
    expect(reviewLinkCheck(undefined, true)).toEqual({ state: "checking", targets: [] });
    expect(reviewLinkCheck(undefined, false)).toBeUndefined();
    expect(reviewLinkCheck(checks.x, false)).toEqual({ state: "failed", targets: [], reason: "timeout" });
    const shown = reviewLinkCheck(checks["listing:yelp.com/biz/joy"], true);
    expect(shown?.state).toBe("found");
    expect(shown?.targets.map((t) => t.label)).toEqual(["joycollectiveyoga.com", "@joyyoga"]);
    expect(backlinkReason(checks["listing:yelp.com/biz/joy"])).toContain("joycollectiveyoga.com");
  });

  it("drops malformed rows instead of inventing a status", () => {
    expect(backlinkChecksFrom({ checks: [{ key: "k", status: "maybe" }, { status: "found" }] }, [])).toEqual({});
  });
});
