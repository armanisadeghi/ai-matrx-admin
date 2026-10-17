/**
 * What the Socials "Look up" screen offers, as data (lane L12c of the third-party-services program).
 *
 * Every row is a catalog Tool run through `/tools/calls`; this file only says WHICH Tools make up one
 * look-up and which of the person's answers each one is sent. Pure: no React, no network. A source
 * the catalog does not carry today is said so in words (`unavailableWords`), never an empty screen.
 */

import type { CatalogToolHit } from "@ai-matrx/agents/tools";

import { detectPlatform } from "../link";

export type ResearchMode = "account" | "topic" | "ads" | "comments";

export const RESEARCH_MODES: ReadonlyArray<{ id: ResearchMode; label: string }> = [
  { id: "account", label: "Account & posts" },
  { id: "topic", label: "Search a topic" },
  { id: "ads", label: "Ads" },
  { id: "comments", label: "Comments" },
];

export function isResearchMode(value: string | null | undefined): value is ResearchMode {
  return RESEARCH_MODES.some((m) => m.id === value);
}

/** One paid answer on the page: one Tool, fed these named inputs. */
export interface ResearchStep {
  id: string;
  /** The catalog job key (`social_profile`). */
  job: string;
  /** What the answer is called on the page. */
  title: string;
  /** The inputs of the shared box this step is sent; nothing else leaves the page. */
  send: readonly string[];
}

export interface ResearchSource {
  id: string;
  label: string;
  region: "west" | "china";
  /** The Tool whose friendly form is the box. */
  formJob: string;
  /** The button's words when the look-up is more than the form Tool's own job ("" = the Tool's). */
  submit: string;
  /** Inputs the chips already answer, so the box does not ask twice. */
  fixed: Readonly<Record<string, string>>;
  /** Inputs left out of the box (the page chooses them, or only builders need them). */
  hide: readonly string[];
  steps: readonly ResearchStep[];
}

const WEST_PLATFORMS: ReadonlyArray<[string, string]> = [
  ["instagram", "Instagram"],
  ["tiktok", "TikTok"],
  ["youtube", "YouTube"],
  ["facebook", "Facebook"],
  ["x", "X"],
  ["linkedin", "LinkedIn"],
  ["threads", "Threads"],
  ["pinterest", "Pinterest"],
  ["reddit", "Reddit"],
];

const westSource = ([id, label]: [string, string]): ResearchSource => ({
  id,
  label,
  region: "west",
  formJob: "social_posts",
  submit: "Look up",
  fixed: { platform: id },
  hide: ["platform", "cursor"],
  steps: [
    { id: "profile", job: "social_profile", title: "Account", send: ["account", "platform"] },
    { id: "posts", job: "social_posts", title: "Recent posts", send: ["account", "platform", "limit"] },
  ],
});

const CHINA_SOURCES: readonly ResearchSource[] = [
  {
    id: "xiaohongshu",
    label: "Xiaohongshu",
    region: "china",
    formJob: "xiaohongshu_account_search",
    submit: "Search",
    fixed: {},
    hide: ["cursor"],
    steps: [
      { id: "accounts", job: "xiaohongshu_account_search", title: "Accounts", send: ["keyword"] },
      { id: "notes", job: "xiaohongshu_note_search", title: "Notes", send: ["keyword"] },
    ],
  },
  {
    id: "douyin",
    label: "Douyin",
    region: "china",
    formJob: "douyin_account_search",
    submit: "",
    fixed: {},
    hide: ["cursor"],
    steps: [{ id: "accounts", job: "douyin_account_search", title: "Accounts", send: ["keyword"] }],
  },
  {
    id: "wechat",
    label: "WeChat",
    region: "china",
    formJob: "wechat_account_search",
    submit: "",
    fixed: {},
    hide: [],
    steps: [{ id: "accounts", job: "wechat_account_search", title: "Official accounts", send: ["keyword"] }],
  },
];

/** Sources people ask for that no Tool serves today; chosen, they say so and offer the closest. */
export const UNSERVED_SOURCES: ReadonlyArray<{ id: string; label: string; words: string }> = [
  { id: "weibo", label: "Weibo", words: "Weibo isn't available right now. Xiaohongshu, Douyin and WeChat are." },
];

export const ACCOUNT_SOURCES: readonly ResearchSource[] = [...WEST_PLATFORMS.map(westSource), ...CHINA_SOURCES];

const SIMPLE_MODES: Record<Exclude<ResearchMode, "account">, ResearchSource> = {
  topic: {
    id: "topic",
    label: "Search a topic",
    region: "west",
    formJob: "social_keyword_search",
    submit: "",
    fixed: {},
    hide: ["cursor"],
    steps: [{ id: "posts", job: "social_keyword_search", title: "Posts", send: ["query", "platform", "search_type"] }],
  },
  ads: {
    id: "ads",
    label: "Ads",
    region: "west",
    formJob: "ads_library_search",
    submit: "",
    fixed: {},
    hide: ["cursor"],
    steps: [{ id: "ads", job: "ads_library_search", title: "Ads", send: ["query", "library", "advertiser"] }],
  },
  comments: {
    id: "comments",
    label: "Comments",
    region: "west",
    formJob: "social_comments",
    submit: "",
    fixed: {},
    hide: ["cursor"],
    steps: [{ id: "comments", job: "social_comments", title: "Comments", send: ["url", "platform"] }],
  },
};

export const DEFAULT_ACCOUNT_SOURCE = "instagram";

/** The source behind a mode and a chip. Null = a chip nothing serves. */
export function sourceFor(mode: ResearchMode, sourceId: string | null): ResearchSource | null {
  if (mode !== "account") return SIMPLE_MODES[mode];
  return ACCOUNT_SOURCES.find((s) => s.id === sourceId) ?? null;
}

export function unservedFor(sourceId: string | null): { id: string; label: string; words: string } | null {
  return UNSERVED_SOURCES.find((s) => s.id === sourceId) ?? null;
}

/** Every job key a mode may need, so one catalog read answers for all of them. */
export const RESEARCH_JOBS: readonly string[] = Array.from(
  new Set([...ACCOUNT_SOURCES, ...Object.values(SIMPLE_MODES)].flatMap((s) => s.steps.map((x) => x.job))),
);

/** The steps of a source whose Tool the catalog carries, and the titles of those it does not. */
export function stepsServed(
  source: ResearchSource,
  tools: ReadonlyMap<string, CatalogToolHit>,
): { served: Array<ResearchStep & { toolId: string }>; missing: ResearchStep[] } {
  const served: Array<ResearchStep & { toolId: string }> = [];
  const missing: ResearchStep[] = [];
  for (const step of source.steps) {
    const hit = tools.get(step.job);
    if (hit) served.push({ ...step, toolId: hit.tool_id });
    else missing.push(step);
  }
  return { served, missing };
}

/** The inputs a step is sent: the shared box's answers it declares, empty ones left out. */
export function stepInputs(step: ResearchStep, values: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const name of step.send) {
    const value = values[name];
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    out[name] = typeof value === "string" ? value.trim() : value;
  }
  return out;
}

/** Points the whole look-up is expected to cost (the sum of its Tools' price hints), or null when any is unknown. */
export function priceHintTotal(steps: ReadonlyArray<{ toolId: string }>, tools: ReadonlyMap<string, CatalogToolHit>): number | null {
  const byId = new Map(Array.from(tools.values()).map((t) => [t.tool_id, t]));
  let total = 0;
  for (const step of steps) {
    const hint = byId.get(step.toolId)?.price_hint_points;
    if (hint == null) return null;
    total += hint;
  }
  return total;
}

/** A pasted link names its platform; the chip follows it. Null = leave the chip where it is. */
export function chipForPaste(text: string): string | null {
  const platform = detectPlatform(text);
  return platform && WEST_PLATFORMS.some(([id]) => id === platform) ? platform : null;
}

/** `calls=` in the address: the call ids of one look-up, in step order, so a reload shows the same answers. */
export function encodeCalls(ids: ReadonlyArray<string | null>): string {
  return ids.map((id) => id ?? "-").join(",");
}

export function decodeCalls(raw: string | null, count: number): Array<string | null> {
  const parts = (raw ?? "").split(",").map((p) => (p && p !== "-" && /^[0-9a-f-]{16,64}$/i.test(p) ? p : null));
  return Array.from({ length: count }, (_, i) => parts[i] ?? null);
}
