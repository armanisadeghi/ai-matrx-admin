import { describe, expect, it } from "@jest/globals";
import { followerSeries, weeklyPostSeries } from "../useBrandOverviewTrends";

describe("brand Overview trend series", () => {
  it("sums followers per day, carrying each account's count forward and its first count back", () => {
    const rows = [
      { profile_id: "a", observed_at: "2026-10-09T10:00:00Z", follower_count: 100 },
      { profile_id: "a", observed_at: "2026-10-12T10:00:00Z", follower_count: 110 },
      // b is first read on the 12th: it never shows as a jump on that day.
      { profile_id: "b", observed_at: "2026-10-12T11:00:00Z", follower_count: 50 },
      { profile_id: "b", observed_at: "2026-10-16T11:00:00Z", follower_count: 55 },
    ];
    expect(followerSeries(rows)).toEqual([150, 160, 165]);
  });

  it("has no line with a single day of history", () => {
    expect(followerSeries([{ profile_id: "a", observed_at: "2026-10-09T10:00:00Z", follower_count: 5 }])).toEqual([]);
  });

  it("buckets posts by week, oldest week first, dropping posts outside the window", () => {
    const now = Date.parse("2026-10-21T00:00:00Z");
    const day = 86_400_000;
    const at = (d: number) => new Date(now - d * day).toISOString();
    expect(weeklyPostSeries([at(1), at(2), at(8), at(30)], 3, now)).toEqual([0, 1, 2]);
  });
});
