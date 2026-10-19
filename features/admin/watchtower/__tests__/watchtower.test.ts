import { watchtowerItems, summarizeWatchtower, type WatchtowerRow } from "../../attention/sources/watchtower";
import { alarmWords, dailyNote, percent, seconds, sortScorecards } from "../words";
import type { ScorecardRow } from "../types";

const card = (over: Partial<ScorecardRow>): ScorecardRow => ({
  feature_key: "x", label: "X", group_key: "seo", tool_name: "x", canary_samples: 1, real_samples: 0, success_rate: 1, baseline_rate: null,
  recent_rate: null, p50_seconds: 2, p90_seconds: 3, avg_points: 40, points_window: 40, shape_misses: 0, refusals: 0, last_success_at: null,
  last_canary_at: null, last_outcome: "pass", consecutive_failures: 0, alarm_state: "ok", alarm_reason: null, alarm_since: null, computed_at: "", ...over,
});

describe("watchtower words", () => {
  it("lists the features that need a person first and hides the note row", () => {
    const rows = sortScorecards([card({ feature_key: "a" }), card({ feature_key: "b", alarm_state: "failing" }), card({ feature_key: "_daily_note" })]);
    expect(rows.map((r) => r.feature_key)).toEqual(["b", "a"]);
  });
  it("reads the daily note off its reserved row", () => {
    expect(dailyNote([card({ feature_key: "_daily_note", alarm_reason: "Nothing is broken." })])).toBe("Nothing is broken.");
  });
  it("formats honestly when there is no data", () => {
    expect(percent(null)).toBe("n/a");
    expect(percent(0.857)).toBe("86%");
    expect(seconds(null)).toBe("n/a");
    expect(alarmWords("unknown").label).toBe("Not checked");
  });
});

describe("watchtower dock items", () => {
  const rows: WatchtowerRow[] = [
    { item_key: "watchtower:seo_serp_check", kind: "failing", severity: "critical", title: "SEO serp check", sentence: "Failed its last 2 canary rounds in a row.", detail: "An agent fixes it.", record_href: "/administration/agents/watchtower?feature=seo_serp_check", last_seen_at: null, facts: {} },
    { item_key: "watchtower:daily_note", kind: "daily_note", severity: "info", title: "Daily health note", sentence: "Nothing is broken.", detail: null, record_href: null, last_seen_at: null, facts: {} },
  ];
  const items = watchtowerItems(rows, { muteLocally: () => {}, unmuteLocally: () => {} });
  it("makes one item per row with the right severity and a door to the runs", () => {
    expect(items.map((i) => i.severity)).toEqual(["critical", "info"]);
    expect(items[0].doors[0].href).toContain("feature=seo_serp_check");
  });
  it("summarises alarms, not the note", () => {
    expect(summarizeWatchtower(items)).toBe("SEO serp check: failing its checks.");
  });
});
