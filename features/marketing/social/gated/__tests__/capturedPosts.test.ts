import { capturedSummary, capturedThumbnailDoor, isCapturedPostId, mergeCapturedPosts, recomputeOutliers, type CapturedPostRow } from "../capturedPosts";
import { listPostMedia, postThumbnailDoor } from "../../server";
import type { PostCardModel } from "../../types";

jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({}), supabase: {} }));

const pid = (i: number) => `76000000000000${String(i).padStart(5, "0")}`;
const NOW = Date.parse("2026-10-11T12:00:00Z");
const day = (n: number) => new Date(NOW - n * 86_400_000).toISOString();

function shared(i: number, views: number | null, over: Partial<PostCardModel> = {}): PostCardModel {
  return {
    postId: `layer-a-${i}`,
    platform: "tiktok",
    profileId: "p1",
    handle: "ava.roxana",
    format: "video",
    url: `https://www.tiktok.com/@ava.roxana/video/${pid(i)}`,
    thumbnailUrl: null,
    hookLine: `shared ${i}`,
    postedAt: day(i),
    durationSeconds: null,
    views,
    likes: null,
    comments: null,
    shares: null,
    isAd: false,
    removed: false,
    outlier: { score: 9, baselineViews: 1, percentile: 50, baselineWindow: 30, ageHours: 1 },
    outlierScore: 9,
    percentile: 50,
    ...over,
  };
}

function captured(i: number, views: number | null, over: Partial<CapturedPostRow> = {}): CapturedPostRow {
  return {
    id: `row-${i}`,
    organization_id: "org",
    profile_id: "p1",
    platform: "tiktok",
    platform_post_id: pid(i),
    post_id: null,
    source_document_id: "doc",
    url: `https://www.tiktok.com/@ava.roxana/video/${pid(i)}`,
    format: "video",
    caption: `captured ${i}\nmore`,
    posted_at: day(i),
    posted_label: null,
    duration_seconds: null,
    views,
    likes: 5,
    comments: null,
    shares: null,
    saves: null,
    thumbnail_url: null,
    thumbnail_file_id: `file-${i}`,
    file_ids: [`file-${i}`],
    extras: {},
    captured_at: "2026-10-09T21:00:00Z",
    created_at: "2026-10-09T21:00:00Z",
    updated_at: "2026-10-09T21:00:00Z",
    ...over,
  };
}

describe("captured posts merge reader", () => {
  it("adds every captured post the shared cache lacks as a real card, marked from your browser", () => {
    const list = mergeCapturedPosts([shared(0, 100)], [captured(1, 200), captured(2, 300)], { handle: "ava.roxana", now: NOW });
    expect(list.map((p) => p.postId)).toEqual(["layer-a-0", "captured:row-1", "captured:row-2"]);
    const c = list[1];
    expect(c.fromBrowser).toBe(true);
    expect(c.hookLine).toBe("captured 1");
    expect(c.thumbnailFileId).toBe("file-1");
    expect(postThumbnailDoor(c.postId)).toBe(capturedThumbnailDoor(c.postId));
    expect(list[0].fromBrowser).toBeUndefined();
  });

  it("dedupes against shared posts by post_id or by the id in the link; shared figures win, the capture fills gaps", () => {
    const list = mergeCapturedPosts(
      [shared(0, 100), shared(1, null)],
      [captured(0, 999, { post_id: "layer-a-0" }), captured(1, 444)],
      { now: NOW },
    );
    expect(list).toHaveLength(2);
    expect(list.find((p) => p.postId === "layer-a-0")?.views).toBe(100);
    expect(list.find((p) => p.postId === "layer-a-1")?.views).toBe(444);
    expect(list.find((p) => p.postId === "layer-a-0")?.likes).toBe(5);
  });

  it("recomputes multiples over the union (no score under the minimum, the post never in its own baseline)", () => {
    const few = mergeCapturedPosts([shared(0, 100)], [captured(1, 100)], { now: NOW });
    expect(few.every((p) => p.outlierScore === null)).toBe(true);
    const many = [captured(0, 1000), ...Array.from({ length: 12 }, (_, i) => captured(i + 1, 100))];
    const list = mergeCapturedPosts([], many, { now: NOW });
    const top = list.find((p) => p.postId === "captured:row-0")!;
    expect(top.outlierScore).toBe(10);
    expect(top.percentile).toBe(100);
    expect(recomputeOutliers(list, { now: NOW }).find((p) => p.postId === "captured:row-1")?.outlierScore).toBe(1);
  });

  it("leaves the shared list untouched when nothing was captured", () => {
    const s = [shared(0, 100)];
    expect(mergeCapturedPosts(s, [])).toBe(s);
  });

  it("says the capture in one line", () => {
    expect(capturedSummary(281, "2026-10-09T21:00:00Z")).toBe("281 posts from your browser · Oct 9");
    expect(capturedSummary(1, null)).toBe("1 post from your browser");
    expect(isCapturedPostId("captured:x")).toBe(true);
    expect(isCapturedPostId("3f0af4c3-48c8-4757-b9ca-6c9c4a6a7b1c")).toBe(false);
    expect(typeof listPostMedia).toBe("function");
  });
});
