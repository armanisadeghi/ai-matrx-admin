import { dragonLairComposition, editWordOps, type PatchOp } from "@ai-matrx/media/video";

import { describeTheirs, historyFromRows, rebasePending } from "../conflict";
import { summarizeEstimate, estimateLabel, confirmLine, outputRows, downloadName, variantDownloadName } from "../estimate";
import { brandNameIn, hookPrefill } from "../hook-brand";
import { joinOverlayLines } from "../text";
import { cutText, hasBrokenCharacter, nameFromCaption } from "../text";
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
  it("joins the walk's hook lines with a space and a full stop, and drops emoji", () => {
    expect(joinOverlayLines("masks need to cover\nyour nose AND mouth")).toBe("masks need to cover your nose AND mouth");
    expect(joinOverlayLines("masks need to cover\u200byour nose AND mouth")).toBe("masks need to cover your nose AND mouth");
    expect(joinOverlayLines("This is my favorite recipe I've made all summer\nIt's so good \u{1F60D}")).toBe("This is my favorite recipe I've made all summer. It's so good");
    expect(joinOverlayLines("Wait!\nIt's so good")).toBe("Wait! It's so good");
    const out = hookPrefill("This is Joe's PIZZA recipe I've made all summer\nIt's so good \u{1F355}", "Cedar Ridge");
    expect(out.text).toBe("This is Cedar Ridge recipe I've made all summer. It's so good");
    expect(out.text).not.toMatch(/summer It's|\u{1F355}/u);
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
  it("names the confirmation line in points", () => {
    expect(confirmLine({ confirm_over_points: 20000 })).toBe("Asks before spending over 20,000 points");
    expect(confirmLine({ confirm_over_points: 10000 })).toBe("Asks before spending over 10,000 points");
    expect(confirmLine({ confirm_over_points: null })).toBeNull();
  });
});

describe("project names from captions", () => {
  it("drops emoji and hashtags and cuts at a word, never mid-word", () => {
    expect(nameFromCaption("Egg roll tacos \u{1F32E}\u{1F525} #recipe", 40)).toBe("Egg roll tacos");
    const cut = nameFromCaption("Comment RECIPE and I'll send it to you right away friend", 40);
    expect(cut).toBe("Comment RECIPE and I'll send it to you…");
    expect(hasBrokenCharacter(cut)).toBe(false);
    expect(nameFromCaption("\u{1F525}\u{1F525}", 40)).toBe("");
  });
});

describe("finished videos say which version they are", () => {
  it("flags a render older than the head and names the version", () => {
    const rows = outputRows({ output_file_ids: ["new", "old"], output_versions: { old: 2, new: 5 }, head_version: 5 });
    expect(rows.map((r) => [r.label, r.stale])).toEqual([["Made from v5", false], ["Made from v2", true]]);
    expect(outputRows({ output_file_ids: ["x"], head_version: 5 })[0]).toMatchObject({ label: "Render 1", stale: false, version: null });
  });
  it("lists the newest render first even though the server lists the oldest first", () => {
    const rows = outputRows({ output_file_ids: ["a", "b", "c", "d"], output_versions: { a: 2, b: 3, c: 5, d: 9 }, head_version: 9 });
    expect(rows.map((r) => r.fileId)).toEqual(["d", "c", "b", "a"]);
    const bare = outputRows({ output_file_ids: ["a", "b", "c"], head_version: 3 });
    expect(bare.map((r) => r.fileId)).toEqual(["c", "b", "a"]);
    expect(bare.map((r) => r.label)).toEqual(["Render 3", "Render 2", "Render 1"]);
  });
  it("names each variant's file with its label", () => {
    const names = ["Hook: friendly reminder", "Captions: Bold", "Shape 1:1"].map((l) => variantDownloadName("Organic cotton tee", l));
    expect(new Set(names).size).toBe(3);
    expect(names[0]).toBe("Organic cotton tee Hook friendly reminder.mp4");
  });
  it("saves under the video's name", () => {
    expect(downloadName('Tuft: "Pillow" / v2')).toBe("Tuft Pillow v2.mp4");
    expect(downloadName("  ")).toBe("video.mp4");
  });
});
