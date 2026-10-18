import { dragonLairComposition, editWordOps, type PatchOp } from "@ai-matrx/media/video";

import { describeTheirs, historyFromRows, rebasePending } from "../conflict";
import { summarizeEstimate, estimateLabel, perSecondLine, confirmLine } from "../estimate";
import { brandNameIn, hookPrefill } from "../hook-brand";
import { cutText, hasBrokenCharacter } from "../text";
import { countWord, createButtonText, matrixOutcomeText, rebasedLabel, splitNewSets } from "../variants";
import { plainRenderMessage } from "../render-errors";

describe("conflict rebase", () => {
  const doc = dragonLairComposition();
  const turn = doc.script.turns[0]!;
  const [w0, w1] = [turn.words[0]!, turn.words[1]!];
  const mine = editWordOps(doc, turn.id, w1.id, "really", "captions") as PatchOp[];
  const theirs = (id: string, text: string) => ({
    version: 4,
    patch: { baseVersion: 3, ops: editWordOps(doc, turn.id, id, text, "captions") },
  });

  it("keeps my edit when the other writer touched a different word", () => {
    const out = rebasePending(mine, 3, [theirs(w0.id, "other")], 4);
    expect(out.kind).toBe("clean");
  });

  it("shows both when the other writer changed the same word", () => {
    const out = rebasePending(mine, 3, [theirs(w1.id, "couch")], 4);
    expect(out.kind).toBe("overlap");
    if (out.kind === "overlap") expect(out.paths.length).toBeGreaterThan(0);
  });

  it("never claims a clean rebase over a gap in the history", () => {
    expect(rebasePending(mine, 3, [], 4).kind).toBe("unreadable");
    expect(historyFromRows([{ version: 4, patch: null }])).toEqual([]);
  });

  it("names what the other writer left", () => {
    const out = rebasePending(mine, 3, [theirs(w1.id, "couch")], 4);
    if (out.kind !== "overlap") throw new Error("expected overlap");
    expect(typeof describeTheirs(doc, out.paths)).toBe("string");
  });
});

describe("estimate summary", () => {
  const est = { lines: [], cached: ["a", "b", "c"], unsupported: [], warnings: [], total_usd: 0, total_points: 0, confirm_over_points: null };
  it("counts reused items as reused, not as left to make", () => {
    const s = summarizeEstimate(est);
    expect(s.toMake).toBe(0);
    expect(estimateLabel(s)).toBe("3 reused");
  });
  it("prefers the server's own counts", () => {
    expect(summarizeEstimate({ ...est, to_make: 2, reused: 1 })).toMatchObject({ toMake: 2, reused: 1 });
  });
});

describe("hook brand name", () => {
  it("finds the reference's business name", () => {
    expect(brandNameIn("Joe's PIZZA")).toBeTruthy();
    expect(brandNameIn("Try Dragon Lair Knives today")).toBe("Dragon Lair Knives");
  });
  it("ignores plain hooks and the person's own brand", () => {
    expect(brandNameIn("stop scrolling")).toBeNull();
    expect(brandNameIn("OUR FIRST-EVER VINYL · NOTES IN REPOSE · COMING 10.06")).toBeNull();
    expect(brandNameIn("Try Dragon Lair Knives today", "Dragon Lair Knives")).toBeNull();
  });
});

describe("render messages", () => {
  it("never shows a cloud error", () => {
    const m = plainRenderMessage("render_failed", "User: arn:aws:iam::1:user/x is not authorized to perform: ecs:ListTasks (AccessDeniedException)");
    expect(m).not.toMatch(/arn|ecs|aws/i);
  });
  it("uses the typed code's words", () => {
    expect(plainRenderMessage("local_render_disabled", "x")).toMatch(/turned off/);
  });
});

describe("text cuts", () => {
  const caption = "Well, today feels pretty darn special. \u{1F979}\u2764\uFE0F more";
  it("never leaves half an emoji at any cut length", () => {
    for (let n = 0; n <= caption.length; n++) expect(hasBrokenCharacter(cutText(caption, n))).toBe(false);
  });
  it("the old UTF-16 cut did break it (guard proves itself)", () => {
    const broken = Array.from({ length: caption.length }, (_, n) => caption.slice(0, n)).some(hasBrokenCharacter);
    expect(broken).toBe(true);
  });
  it("keeps a joined emoji whole", () => {
    expect(cutText("a\u{1F468}\u200D\u{1F469}\u200D\u{1F467}b", 2)).toBe("a\u{1F468}\u200D\u{1F469}\u200D\u{1F467}");
  });
});

describe("hook prefill", () => {
  it("never calls a contraction a brand", () => {
    expect(brandNameIn("It's a big day here")).toBeNull();
    expect(brandNameIn("That's so good. Let's go")).toBeNull();
    expect(hookPrefill("It's a big day here at Asheville TeaCompany!!", "Cedar Ridge Iced Tea").text).toBe("It's a big day here at Cedar Ridge Iced Tea!!");
  });
  it("keeps spaces between joined lines", () => {
    const out = hookPrefill("Send this to someone\nwho loves Joe's PIZZA", "Cedar Ridge");
    expect(out.text).toBe("Send this to someone who loves Cedar Ridge");
    expect(out.text).not.toMatch(/someonewho/);
  });
  it("leaves it empty when it is not sure or not readable", () => {
    expect(hookPrefill("stop scrolling", "Cedar Ridge").text).toBe("");
    expect(hookPrefill(`Joe's PIZZA ${"word ".repeat(40)}`, "Cedar Ridge").text).toBe("");
    expect(hookPrefill("Try Dragon Lair Knives today", "Dragon Lair Knives").text).toBe("");
  });
});

describe("variants panel rules", () => {
  const sets = [{ label: "Captions: Bold" }, { label: "Shape 1:1" }, { label: "Shape 1:1" }];
  it("counts only what will really be created", () => {
    const { fresh, reused } = splitNewSets(sets, ["Captions: Bold"]);
    expect(fresh.map((s) => s.label)).toEqual(["Shape 1:1"]);
    expect(reused).toHaveLength(2);
    expect(createButtonText(fresh.length)).toBe("Create 1 variant");
    expect(createButtonText(0)).toBeNull();
    expect(countWord(3)).toBe("3 variants");
  });
  it("says what the server did", () => {
    expect(matrixOutcomeText([{ reused: false }, { reused: true }])).toBe("Created 1 variant; 1 already existed");
    expect(matrixOutcomeText([{ reused: true }])).toBe("That variant already exists");
  });
  it("labels a variant behind the head as rebased", () => {
    expect(rebasedLabel(2, 4)).toBe("rebased from v2");
    expect(rebasedLabel(4, 4)).toBe("");
  });
});

describe("estimate lines the person reads", () => {
  const take = (q: number) => ({ media_id: `t${q}`, capability: "video", model: "veo", unit: "second", quantity: q, unit_price_usd: 0.05, cost_usd: q * 0.05, points: 0, note: null });
  it("shows the per-second price of presenter takes, and nothing for a plain image plan", () => {
    expect(perSecondLine({ lines: [take(4), take(8)] })).toBe("2 video takes, 4 to 8 s each at $0.05 a second ($0.20 to $0.40 each, $0.60 in all)");
    expect(perSecondLine({ lines: [{ ...take(4), unit: "image" }] })).toBeNull();
  });
  it("names the confirmation line in dollars", () => {
    expect(confirmLine({ confirm_over_points: 20000 })).toBe("Asks before spending over $1");
    expect(confirmLine({ confirm_over_points: 10000 })).toBe("Asks before spending over $0.50");
    expect(confirmLine({ confirm_over_points: null })).toBeNull();
  });
});
