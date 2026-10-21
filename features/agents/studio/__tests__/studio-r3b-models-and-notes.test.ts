import { isDebriefModel, debriefModelIds, curatedDebriefModelIds, type DebriefModelFilter, type DebriefModelRow } from "../debrief-models";

/** What the knob register answers today (migration 20261022140000): the menu's filter is data, not code. */
const FILTER: DebriefModelFilter = {
  minContextTokens: 32_000,
  minStrongRating: 4,
  modelsPerMaker: 2,
  topRatingBand: 6,
  specialistPattern: "robot|\\blive\\b|translate|deep research|codex|safety|guard|tts|realtime|embedding|image|\\bcoder?\\b|\\bsearch\\b",
};
import { describeVersionNote, SYSTEM_NOTE_LABEL } from "../version-notes";

const ok = { contextWindow: 200_000, interaction: "turn", input: ["text", "image"], output: ["text"] };

describe("Debrief offers only text/chat models still served", () => {
  it("keeps a normal text model", () => {
    expect(isDebriefModel({ id: "1", name: "Claude Opus 5.5", ...ok }, FILTER)).toBe(true);
  });
  it("drops mock, speech-to-text, image, deprecated, retired and tiny-window models", () => {
    expect(isDebriefModel({ id: "m", name: "Mock Model (No-Cost Test)", ...ok }, FILTER)).toBe(false);
    expect(isDebriefModel({ id: "s", name: "Deepgram Nova-3 (Streaming STT)", contextWindow: null, interaction: "realtime", input: ["audio"], output: ["text"] }, FILTER)).toBe(false);
    expect(isDebriefModel({ id: "i", name: "Gemini 2.5 Flash Image", contextWindow: 66_000, interaction: "turn", input: ["text"], output: ["text", "image"] }, FILTER)).toBe(false);
    expect(isDebriefModel({ id: "d", name: "Old", isDeprecated: true, ...ok }, FILTER)).toBe(false);
    expect(isDebriefModel({ id: "r", name: "Gone", retiredAt: "2026-01-01", ...ok }, FILTER)).toBe(false);
    expect(isDebriefModel({ id: "a", name: "ALLaM 2 7B", contextWindow: 4_100, interaction: "turn", input: ["text"], output: ["text"] }, FILTER)).toBe(false);
  });
  it("lists ids", () => {
    expect(debriefModelIds([{ id: "1", name: "A", ...ok }, { id: "2", name: "Mock", ...ok }], FILTER)).toEqual(["1"]);
  });
});

describe("Versions notes are for people", () => {
  const names: Record<string, string> = {
    "5b467c4b-0000-4000-8000-000000000001": "Claude Sonnet 5.5",
    "c5a1f7e3-0000-4000-8000-000000000002": "Claude Haiku 5.5",
  };
  const name = (id: string) => names[id];
  it("says model swaps in names, never ids", () => {
    const t = describeVersionNote(
      "Deprecated model replaced 5b467c4b-0000-4000-8000-000000000001 → c5a1f7e3-0000-4000-8000-000000000002 (deprecated-models audit batch)",
      name,
    );
    expect(t).toBe("Model changed from Claude Sonnet 5.5 to Claude Haiku 5.5");
  });
  it("never shows an ops note raw", () => {
    expect(describeVersionNote("L4b stage C 2026-10-18: required inputs reset to optional (undo: agent.required_flag_change stage C)", name)).toBe(SYSTEM_NOTE_LABEL);
  });
  it("keeps a note a person wrote and hides empty ones", () => {
    expect(describeVersionNote("Warmer tone, shorter replies", name)).toBe("Warmer tone, shorter replies");
    expect(describeVersionNote("  ", name)).toBeUndefined();
    expect(describeVersionNote(null, name)).toBeUndefined();
  });
});

describe("wiring", () => {
  it("StudioControls uses both helpers", () => {
    const c = require("fs").readFileSync(require("path").join(__dirname, "../components/StudioControls.tsx"), "utf8");
    expect(c).toContain("allowedModelIds={menuIds.length > 0 ? menuIds : undefined}");
    expect(c).toContain("studio-debrief-more-models");
    expect(c).toContain("describeVersionNote(r.change_note");
    expect(c).toContain("m.common_name ?? m.name");
  });
});

describe("Debrief opens on a short curated list, rule-based from the catalog", () => {
  const m = (name: string, maker: string, costRating: number | null, releaseDate: string | null, isPrimary = false, isPremium = false): DebriefModelRow => ({
    id: name, name, maker, costRating, releaseDate, isPrimary, isPremium, ...ok,
  });
  const catalog: DebriefModelRow[] = [
    m("Claude Haiku 5.5", "Anthropic", 1, "2026-10-07", true),
    m("Claude Sonnet 5.5", "Anthropic", 5, "2026-09-28", true),
    m("Claude Sonnet 5.5 Max", "Anthropic", 6, "2026-09-28", false, true),
    m("Claude Opus 5.5", "Anthropic", 4, "2026-09-22", true, true),
    m("Claude Fable 5.1", "Anthropic", 6, "2026-08-28", true, true),
    m("GPT-6.1 Sol", "OpenAI", 4, "2026-09-27", false, true),
    m("GPT-5.6 Terra", "OpenAI", 5, "2026-07-09"),
    m("GPT-6 Astra", "OpenAI", 6, "2026-08-27", true, true),
    m("GPT 5 Mini", "OpenAI", 3, null, true),
    m("GPT OSS 120B", "OpenAI", 2, null, true),
    m("Gemini 4 Argon", "Google", 5, "2026-10-13", true, true),
    m("Gemini Pro Latest", "Google", 4, null, true, true),
    m("Gemini Robotics ER 2", "Google", 4, "2026-07-30"),
    m("Gemini Deep Research Max", "Google", 6, "2026-04-01", false, true),
    m("Gemma 4 31B", "Google", null, null),
    m("Llama 4 Scout 17B", "Meta", null, null),
  ];
  const names = (ids: string[]) => new Set(ids);
  it("keeps the strongest per maker and their top band, and drops small, specialist and unrated models", () => {
    const picked = names(curatedDebriefModelIds(catalog, FILTER));
    for (const n of ["Claude Sonnet 5.5", "Claude Opus 5.5", "Claude Fable 5.1", "GPT-6.1 Sol", "GPT-5.6 Terra", "GPT-6 Astra", "Gemini 4 Argon", "Gemini Pro Latest"]) {
      expect(picked.has(n)).toBe(true);
    }
    for (const n of ["Claude Haiku 5.5", "Claude Sonnet 5.5 Max", "GPT 5 Mini", "GPT OSS 120B", "Gemini Robotics ER 2", "Gemini Deep Research Max", "Gemma 4 31B", "Llama 4 Scout 17B"]) {
      expect(picked.has(n)).toBe(false);
    }
  });
  it("is short, and a subset of what Debrief may read with", () => {
    const curated = curatedDebriefModelIds(catalog, FILTER);
    expect(curated.length).toBeLessThan(debriefModelIds(catalog).length);
    expect(curated.every((id) => debriefModelIds(catalog).includes(id))).toBe(true);
  });
  it("follows the catalog: a newer rated model takes the place, no ids are named", () => {
    const next = [...catalog, m("Claude Opus 6", "Anthropic", 5, "2026-11-01", true, true)];
    expect(names(curatedDebriefModelIds(next, FILTER)).has("Claude Opus 6")).toBe(true);
    const src = require("fs").readFileSync(require("path").join(__dirname, "../debrief-models.ts"), "utf8");
    expect(src).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);
    // The menu's settings are knobs (chat.debrief.*), not constants or a hard-coded list in this file.
    expect(src).not.toMatch(/\bconst (MIN_|TOP_BAND|PER_MAKER|SPECIALIST)/);
    expect(src).not.toMatch(/robot\|/);
  });
});

describe("the Debrief menu filter comes from the knob register", () => {
  const ok = { contextWindow: 200_000, interaction: "turn", input: ["text"], output: ["text"] } as const;
  const rows: DebriefModelRow[] = [{ id: "1", name: "Big", maker: "A", costRating: 5, isPrimary: true, ...ok }];
  it("with no answer yet there is no short menu and no context floor", () => {
    expect(curatedDebriefModelIds(rows, null)).toEqual([]);
    expect(isDebriefModel({ id: "s", name: "Small", contextWindow: 4_000, interaction: "turn", input: ["text"], output: ["text"] }, null)).toBe(true);
  });
  it("the floor, per-maker count and specialist pattern follow the values given", () => {
    expect(isDebriefModel({ id: "m", name: "Mid", ...ok, contextWindow: 66_000 }, { ...FILTER, minContextTokens: 100_000 })).toBe(false);
    expect(curatedDebriefModelIds(rows, { ...FILTER, specialistPattern: "big" })).toEqual([]);
    expect(curatedDebriefModelIds(rows, FILTER)).toEqual(["1"]);
    expect(curatedDebriefModelIds(rows, { ...FILTER, specialistPattern: "(" })).toEqual([]);
  });
});
