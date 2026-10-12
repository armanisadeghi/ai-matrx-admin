import { COUNT_UNREADABLE_MESSAGE, LOAD_MORE_STEP, choiceFromKnob, choiceMenu, commentsUsd, knobFromChoice, loadMoreRequest, morePostsAvailable, postsUsd, rememberedMaxPosts, rememberedMaxPostsPlain, resolveCount, setPostCountChoice } from "../post-count";
import { fetchOutcomeText, stoppedText } from "../components/FetchLines";
import type { SocialCosts } from "../types";

const mockKnobInt = jest.fn();
jest.mock("@/lib/knobs/featureKnobs", () => ({ knobInt: (...a: unknown[]) => mockKnobInt(...a) }));
const mockResolve = jest.fn();
const mockSetOverride = jest.fn();
const mockPrincipals = jest.fn();
const mockToastError = jest.fn();
jest.mock("@/lib/scoped-config/sessionKnob", () => ({
  sessionKnobPrincipals: () => mockPrincipals(),
  resolveSessionKnob: (...a: unknown[]) => mockResolve(...a),
  useSessionKnob: jest.fn(),
}));
jest.mock("@/lib/scoped-config/service", () => ({
  setKnobOverride: (...a: unknown[]) => mockSetOverride(...a),
  knobRefusalSentence: (r: { reason?: string }) => r.reason ?? "",
}));
jest.mock("@/lib/toast", () => ({ toast: { error: (...a: unknown[]) => mockToastError(...a) } }));
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

describe("default post count: platform 50 → organization → person, saved on the server", () => {
  beforeEach(() => { mockKnobInt.mockReset(); mockResolve.mockReset(); mockSetOverride.mockReset(); mockPrincipals.mockReturnValue({ organizationId: "org-1", userId: "user-1" }); });

  it("turns a knob value into the picker choice and back (0 = All)", () => {
    expect(choiceFromKnob(50)).toBe("50");
    expect(choiceFromKnob(0)).toBe("all");
    expect(choiceFromKnob("100")).toBe("100");
    expect(choiceFromKnob(undefined)).toBeNull();
    expect(choiceFromKnob(-3)).toBeNull();
    expect(knobFromChoice("all")).toBe(0);
    expect(knobFromChoice("75")).toBe(75);
    expect(choiceMenu("75")).toEqual(["12", "50", "75", "100", "500", "all"]);
    expect(choiceMenu("50")).toEqual(["12", "50", "100", "500", "all"]);
  });

  it("uses whatever the ladder resolved for this person: system 50, organization 100, person 200 - never a built-in 12", async () => {
    mockResolve.mockResolvedValueOnce(50);
    expect(await rememberedMaxPosts()).toBe(50);
    mockResolve.mockResolvedValueOnce(100);
    expect(await rememberedMaxPosts()).toBe(100);
    mockResolve.mockResolvedValueOnce(200);
    expect(await rememberedMaxPosts()).toBe(200);
    expect(mockResolve).toHaveBeenCalledWith("social.profile_posts_default");
  });

  it("without an organization it reads the platform value", async () => {
    mockPrincipals.mockReturnValue({ organizationId: null, userId: "user-1" });
    mockKnobInt.mockResolvedValueOnce(50);
    expect(await rememberedMaxPosts()).toBe(50);
    expect(mockKnobInt).toHaveBeenCalledWith("social", "profile_posts_default");
  });

  it("a default of 0 means All, read from the organization limit", async () => {
    mockResolve.mockResolvedValueOnce(0);
    mockKnobInt.mockResolvedValueOnce(250);
    expect(await rememberedMaxPosts()).toBe(250);
    expect(mockKnobInt).toHaveBeenCalledWith("social", "profile_posts_max");
  });

  it("an unreadable limit throws, and the plain door says so in words", async () => {
    mockResolve.mockResolvedValue(0);
    mockKnobInt.mockRejectedValue(new Error("boom"));
    await expect(rememberedMaxPosts()).rejects.toThrow("boom");
    await expect(rememberedMaxPostsPlain()).rejects.toThrow(COUNT_UNREADABLE_MESSAGE);
  });

  it("picking a number saves it as the person's own override of the knob, on the server", async () => {
    mockSetOverride.mockResolvedValue({ ok: true });
    await setPostCountChoice("100");
    expect(mockSetOverride).toHaveBeenCalledWith({ feature: "social", key: "profile_posts_default", scopeKind: "user", scopeId: "user-1", organizationId: "org-1", value: 100 });
    mockSetOverride.mockResolvedValue({ ok: true });
    await setPostCountChoice("all");
    expect(mockSetOverride).toHaveBeenLastCalledWith(expect.objectContaining({ value: 0 }));
  });

  it("a refused save is shown and the pick does not stick", async () => {
    mockSetOverride.mockResolvedValue({ ok: false, reason: "not_overridable" });
    mockResolve.mockResolvedValue(50);
    await setPostCountChoice("500");
    expect(mockToastError).toHaveBeenCalled();
    expect(await rememberedMaxPosts()).toBe(50);
  });
});

describe("morePostsAvailable", () => {
  it("is the gap between what the profile reports and what is stored", () => {
    expect(morePostsAvailable(2400, 12)).toBe(2388);
    expect(morePostsAvailable(12, 12)).toBeNull();
    expect(morePostsAvailable(null, 12)).toBeNull();
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
    expect(text).toContain("Capped at 500 (Most posts per account)");
    expect(text).toContain("source unavailable");
    expect(fetchOutcomeText("ok", {})).toBe("ok");
    expect(stoppedText("points_limit")).toContain("points limit");
    expect(stoppedText(null)).toBeNull();
  });
});
