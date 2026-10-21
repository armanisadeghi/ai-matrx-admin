import { brandAccounts, buildOverview, followerChange, postFigures, relativeChange } from "../accounts-overview";
import type { AccountRow, BrandPost } from "../types";

const NOW = Date.parse("2026-10-21T12:00:00Z");
const DAY = 86_400_000;
const ago = (d: number) => new Date(NOW - d * DAY).toISOString();

function account(over: Partial<AccountRow>): AccountRow {
  return {
    rowId: over.trackedAccountId ?? "r",
    trackedAccountId: "t1",
    profileId: "p1",
    platform: "instagram",
    handle: "brand",
    displayName: "Brand",
    avatarUrl: null,
    role: "own",
    status: "active",
    followers: 1000,
    growth: null,
    growthNote: "",
    postsTracked: 0,
    medianViews: null,
    bestScore: null,
    bestPostId: null,
    lastPostAt: null,
    lastRefreshedAt: null,
    profileUrl: null,
    propertyId: null,
    ...over,
  };
}

function post(over: Partial<BrandPost>): BrandPost {
  return {
    postId: Math.random().toString(36),
    platform: "instagram",
    profileId: "p1",
    handle: "brand",
    format: "reel",
    url: "",
    thumbnailUrl: null,
    hookLine: "",
    postedAt: ago(1),
    durationSeconds: null,
    views: 100,
    likes: 5,
    comments: 3,
    shares: 2,
    role: "own",
    trackedAccountId: "t1",
    outlierScore: null,
    ...over,
  } as BrandPost;
}

describe("accounts overview", () => {
  it("counts only the brand's own accounts on this brand", () => {
    const rows = [
      account({ trackedAccountId: "t1" }),
      account({ trackedAccountId: "t2", ownerKind: "person" }),
      account({ trackedAccountId: "t3", unassigned: true }),
      account({ trackedAccountId: "t4", role: "competitor" }),
    ];
    expect(brandAccounts(rows).map((r) => r.trackedAccountId)).toEqual(["t1"]);
  });

  it("engagement is interactions over views; no views is null, never 0", () => {
    const f = postFigures([post({ views: 100 }), post({ views: 300, likes: 30, comments: 0, shares: 0 })]);
    expect(f.views).toBe(400);
    expect(f.avgViews).toBe(200);
    expect(f.engagement).toBeCloseTo(40 / 400);
    expect(postFigures([post({ views: null })]).engagement).toBeNull();
    expect(postFigures([post({ views: null })]).views).toBeNull();
  });

  it("compares the window with the window before it", () => {
    const m = buildOverview({
      rows: [account({ trackedAccountId: "t1" })],
      posts: [post({ postedAt: ago(2), views: 200 }), post({ postedAt: ago(40), views: 100 }), post({ postedAt: ago(70) })],
      snapshots: [],
      days: 30,
      now: NOW,
    });
    expect(m.current.posts).toBe(1);
    expect(m.prior.posts).toBe(1);
    expect(relativeChange(m.current.views, m.prior.views)).toBeCloseTo(1);
    expect(m.followerChange).toBeNull();
    expect(m.leaders).toEqual([]);
  });

  it("follower change names the span it really covers", () => {
    const rows = [account({ profileId: "p1" })];
    const snaps = [
      { profile_id: "p1", observed_at: ago(40), follower_count: 1000 },
      { profile_id: "p1", observed_at: ago(9), follower_count: 1050 },
      { profile_id: "p1", observed_at: ago(1), follower_count: 1100 },
    ];
    expect(followerChange(rows, snaps, 30, NOW)).toEqual({ net: 100, fraction: 0.1, spanDays: 30 });
    expect(followerChange(rows, snaps.slice(1), 30, NOW)).toEqual({ net: 50, fraction: 50 / 1050, spanDays: 9 });
    expect(followerChange(rows, snaps.slice(2), 30, NOW)).toBeNull();
  });

  it("ranks the brand among competitors by average views and splits share of views", () => {
    const m = buildOverview({
      rows: [account({ trackedAccountId: "t1" }), account({ trackedAccountId: "c1", rowId: "c1", role: "competitor" })],
      posts: [post({ trackedAccountId: "t1", views: 100 }), post({ trackedAccountId: "c1", views: 300 })],
      snapshots: [],
      days: 30,
      now: NOW,
    });
    expect(m.leaders.map((l) => l.id)).toEqual(["c1", "brand"]);
    expect(m.shareOfViews).toBeCloseTo(0.25);
  });
});
