import type { CatalogToolHit } from "@ai-matrx/agents/tools";

import {
  ACCOUNT_SOURCES,
  RESEARCH_JOBS,
  chipForPaste,
  decodeCalls,
  encodeCalls,
  sourceFor,
  stepInputs,
  stepsServed,
  unservedFor,
} from "../sources";

const hit = (job_key: string, tool_id: string, price: number | null): CatalogToolHit => ({
  tool_id,
  job_key,
  display_name: job_key,
  display_noun: "Lookup",
  summary: "",
  job_family: "social",
  price_hint_points: price,
  reliability: { success_rate: null, samples: 0, p50_ms: null, last_success_at: null } as CatalogToolHit["reliability"],
  state: "live",
});

describe("look-up sources", () => {
  const tools = new Map([
    ["social_profile", hit("social_profile", "p", 40)],
    ["social_posts", hit("social_posts", "q", 120)],
    ["wechat_account_search", hit("wechat_account_search", "w", 1200)],
  ]);

  it("a Western account look-up is the account and its posts, sent only what each declares", () => {
    const source = sourceFor("account", "tiktok");
    expect(source?.steps.map((s) => s.job)).toEqual(["social_profile", "social_posts"]);
    const values = { account: "  @duolingo ", platform: "tiktok", limit: "", cursor: "abc", keyword: "x" };
    expect(stepInputs(source!.steps[0], values)).toEqual({ account: "@duolingo", platform: "tiktok" });
    expect(stepInputs(source!.steps[1], { ...values, limit: 20 })).toEqual({ account: "@duolingo", platform: "tiktok", limit: 20 });
  });

  it("each ad library is a chip that answers the Tool's library input, so the box never asks twice", () => {
    for (const id of ["meta", "tiktok", "google"]) {
      const source = sourceFor("ads", id)!;
      expect(source.fixed).toEqual({ library: id });
      expect(source.hide).toContain("library");
      expect(stepInputs(source.steps[0], { query: " Massage Envy ", library: id, cursor: "x" })).toEqual({ query: "Massage Envy", library: id });
    }
    expect(sourceFor("ads", null)?.id).toBe("meta");
  });

  it("a source whose Tool the catalog lacks is reported, not run empty", () => {
    const xhs = sourceFor("account", "xiaohongshu")!;
    const { served, missing } = stepsServed(xhs, tools);
    expect(served).toEqual([]);
    expect(missing.map((m) => m.title)).toEqual(["Accounts", "Notes"]);
    const wechat = stepsServed(sourceFor("account", "wechat")!, tools);
    expect(wechat.served.map((s) => s.toolId)).toEqual(["w"]);
  });

  it("Weibo is named as not served, so the screen says so", () => {
    expect(unservedFor("weibo")?.words).toMatch(/instead/);
    expect(ACCOUNT_SOURCES.some((s) => s.id === "weibo")).toBe(false);
  });

  it("every step's Tool is in the one catalog read", () => {
    for (const source of ACCOUNT_SOURCES) for (const step of source.steps) expect(RESEARCH_JOBS).toContain(step.job);
    expect(RESEARCH_JOBS).toContain("ads_library_search");
  });

  it("a pasted Western link moves the chip; a Chinese platform is never moved by a paste", () => {
    expect(chipForPaste("https://www.tiktok.com/@gymshark")).toBe("tiktok");
    expect(chipForPaste("@gymshark")).toBeNull();
    expect(chipForPaste("https://www.xiaohongshu.com/user/profile/1")).toBeNull();
  });

  it("the call ids of a look-up survive the address and ignore anything that is not an id", () => {
    const ids = ["2d7e0981-aaaa-4bbb-8ccc-123456789012", null];
    expect(decodeCalls(encodeCalls(ids), 3)).toEqual([ids[0], null, null]);
    expect(decodeCalls("<script>,../x", 2)).toEqual([null, null]);
  });
});
