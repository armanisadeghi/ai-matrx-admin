/**
 * A post card's `⋯` items, as rows in the page's ONE right-click menu (designed menu, "Post").
 * Fails when a row the old `⋯` offered is dropped, when a viewer is offered a spending row, when the
 * record is not named "Post", or when a row stops running the card's own handler.
 */
jest.mock("@/lib/toast", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/components/cost/pointsRate", () => ({ currentPointsRate: () => 20000 }));
jest.mock("../components/usePostActions", () => ({
  postActionRunners: () => ({ transcript: jest.fn(async () => "ok"), breakdown: jest.fn(async () => "ok"), saveToSwipe: jest.fn(async () => "ok") }),
}));

import { QueryClient } from "@tanstack/react-query";
import { postCardMenuRows } from "../components/post-card-menu";
import type { PostCardModel } from "../types";

const post = {
  postId: "p-1",
  platform: "tiktok",
  profileId: "acc-1",
  handle: "harborviewliving",
  format: "video",
  url: "https://www.tiktok.com/@harborviewliving/video/7301",
  thumbnailUrl: null,
  hookLine: "3 mistakes first-time renters make",
  postedAt: null,
  durationSeconds: 31,
  views: 120000,
  likes: 9000,
  comments: 120,
  shares: 40,
  isAd: false,
  removed: false,
  outlier: null,
  outlierScore: null,
  percentile: null,
} as unknown as PostCardModel;

function labels(canEdit: boolean, extra: Partial<Parameters<typeof postCardMenuRows>[0]> = {}) {
  const rows = postCardMenuRows({
    post,
    brand: { seg: "titanium-marketing", organizationId: "org-1" },
    accountHref: "/marketing/titanium-marketing/socials/tiktok/acc-1",
    canEdit,
    copyText: async () => true,
    queryClient: new QueryClient(),
    ...extra,
  });
  return { rows, labels: rows.extraSections[0]!.items.map((i) => ("label" in i ? i.label : "")) };
}

describe("a post card's rows in the page menu", () => {
  it("an editor gets every old ⋯ row, in the old order, under the heading Post", () => {
    const { rows, labels: l } = labels(true, { extraActions: [{ id: "why", label: "Why it worked", onSelect: () => {} }] });
    expect(rows.heading?.label).toBe("Post");
    expect(l).toEqual(["Open original", "Copy link", "Why it worked", "Open account", "Save to swipe file", "Get transcript", "Run breakdown"]);
  });

  it("a viewer is never offered a row that spends or writes", () => {
    expect(labels(false).labels).toEqual(["Open original", "Copy link", "Open account"]);
  });

  it("the host's own Save handler is used once, never a second Save row", () => {
    const onSave = jest.fn();
    const { rows, labels: l } = labels(true, { onSave });
    expect(l.filter((x) => x === "Save to swipe file")).toHaveLength(1);
    const save = rows.extraSections[0]!.items.find((i) => "label" in i && i.label === "Save to swipe file");
    if (save && save.kind === "item") save.onSelect();
    expect(onSave).toHaveBeenCalledWith(post);
  });

  it("the transcript row names its points when the page holds the costs", () => {
    const client = new QueryClient();
    client.setQueryData(["marketing", "social", "costs", "org-1"], { call_usd: 0.001, operations: { transcript: 0.002 } });
    const { rows } = labels(true, { queryClient: client });
    const t = rows.extraSections[0]!.items.find((i) => "label" in i && i.label === "Get transcript");
    expect(t && "hint" in t ? t.hint : undefined).toBe("≈ 40 points");
  });
});
