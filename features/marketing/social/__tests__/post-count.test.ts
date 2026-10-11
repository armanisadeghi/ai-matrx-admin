import { COUNT_UNREADABLE_MESSAGE, LOAD_MORE_STEP, commentsUsd, loadMoreRequest, postsUsd, rememberedMaxPosts, rememberedMaxPostsPlain, resolveCount, setPostCountChoice } from "../post-count";
import { fetchOutcomeText, stoppedText } from "../components/FetchLines";
import type { SocialCosts } from "../types";

const mockKnobInt = jest.fn();
jest.mock("@/lib/knobs/featureKnobs", () => ({ knobInt: (...a: unknown[]) => mockKnobInt(...a) }));
jest.mock("@tanstack/react-query", () => ({ useQuery: jest.fn() }));
jest.mock("next/link", () => ({ __esModule: true, default: () => null }));

const costs = { per_post: { tiktok: { usd_per_page: 0.002, posts_per_page: 10 } }, per_comment_page: 0.001 } as unknown as SocialCosts;

describe("resolveCount", () => {
  it("passes a number choice through and resolves All from the setting", () => {
    expect(resolveCount("12", null)).toBe(12);
    expect(resolveCount("500", 100)).toBe(500);
    expect(resolveCount("all", 300)).toBe(300);
  });
  it("is null while All cannot be resolved", () => {
    expect(resolveCount("all", null)).toBeNull();
    expect(resolveCount("all", 0)).toBeNull();
  });
});

describe("postsUsd / commentsUsd", () => {
  it("prices whole pages, rounding up", () => {
    expect(postsUsd(costs, "tiktok", 50)).toBeCloseTo(0.01);
    expect(postsUsd(costs, "tiktok", 12)).toBeCloseTo(0.004);
  });
  it("is null when nothing is priced", () => {
    expect(postsUsd(costs, "tiktok", 0)).toBeNull();
    expect(postsUsd(costs, "x", 10)).toBeNull();
    expect(postsUsd(null, "tiktok", 10)).toBeNull();
    expect(commentsUsd(costs, 0)).toBeNull();
  });
  it("prices comments in pages of 20", () => {
    expect(commentsUsd(costs, 21)).toBeCloseTo(0.002);
  });
});

describe("remembered choice", () => {
  beforeEach(() => { window.localStorage.clear(); mockKnobInt.mockReset(); });
  it("defaults to 12 and remembers a choice", async () => {
    expect(await rememberedMaxPosts()).toBe(12);
    setPostCountChoice("100");
    expect(await rememberedMaxPosts()).toBe(100);
  });
  it("All reads the setting; an unreadable setting throws, and the plain door says so in words", async () => {
    setPostCountChoice("all");
    mockKnobInt.mockResolvedValueOnce(250);
    expect(await rememberedMaxPosts()).toBe(250);
    mockKnobInt.mockRejectedValue(new Error("boom"));
    await expect(rememberedMaxPosts()).rejects.toThrow("boom");
    await expect(rememberedMaxPostsPlain()).rejects.toThrow(COUNT_UNREADABLE_MESSAGE);
  });
});

describe("Load more quote", () => {
  it("buys the next step of NEW posts, continuing, and quotes exactly that", () => {
    expect(loadMoreRequest()).toEqual({ maxPosts: LOAD_MORE_STEP, continueFromLast: true, quoteCount: LOAD_MORE_STEP });
    expect(postsUsd(costs, "tiktok", loadMoreRequest().quoteCount)).toBeCloseTo(5 * 0.002);
  });
});

describe("fetch outcome words", () => {
  it("names the limit and the early stop", () => {
    const text = fetchOutcomeText("20 new posts, 0 updated", { limit_applied: { setting: "profile_posts_max", value: 500, requested: 900 }, stopped_reason: "provider_error" });
    expect(text).toContain("Limited to 500 by Max posts per account");
    expect(text).toContain("provider had a problem");
    expect(fetchOutcomeText("ok", {})).toBe("ok");
    expect(stoppedText("points_limit")).toContain("points limit");
    expect(stoppedText(null)).toBeNull();
  });
});
