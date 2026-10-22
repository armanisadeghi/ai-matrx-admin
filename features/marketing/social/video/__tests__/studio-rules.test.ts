import { dragonLairComposition, editWordOps, type PatchOp } from "@ai-matrx/media/video";

import { describeTheirs, historyFromRows, rebasePending } from "../conflict";
import { summarizeEstimate, estimateLabel, confirmLine, outputRows, downloadName, finishedDownloadName, variantDownloadName } from "../estimate";
import { brandNameIn, hookPrefill } from "../hook-brand";
import { joinOverlayLines } from "../text";
import { cutText, hasBrokenCharacter, nameFromCaption } from "../text";
import { batchStanding, batchCounts, batchProgressText, buildMatrix, countWord, createButtonText, matrixOutcomeText, matrixSize, parseHookLines, rebasedLabel, splitNewSets, zipEntryNames, zipFileName } from "../variants";
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
  it("a failed render says its real reason when the server sends one in plain words (walk 4)", () => {
    const reason = "A take's caption timing belongs to different words. Generate again so the takes and the script match, then render.";
    expect(plainRenderMessage("render_failed", reason)).toBe(reason);
    expect(plainRenderMessage("render_failed", null)).toMatch(/didn't finish/);
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
  it("keeps the whole variant label and shortens a long project name instead", () => {
    const long = "Hand-painted ceramic butterfly plate from our Albuquerque pottery studio clone";
    for (const l of ["Hook: Every plate here is painted by hand.", "Captions: Bold", "Shape 1:1"]) {
      const n = variantDownloadName(long, l);
      expect(n.length).toBeLessThanOrEqual(84);
      expect(n.replace(/[:]/g, " ").replace(/\s+/g, " ")).toContain(l.replace(/[:]/g, " ").replace(/\s+/g, " ").replace(/\s+/g, " "));
    }
    expect(variantDownloadName(long, "Captions: Bold")).toMatch(/Captions Bold\.mp4$/);
  });
  it("saves under the video's name", () => {
    expect(downloadName('Tuft: "Pillow" / v2')).toBe("Tuft Pillow v2.mp4");
    expect(downloadName("  ")).toBe("video.mp4");
  });
});

describe("finished download names come from the server's record of which variant made each file", () => {
  const answer = {
    output_file_ids: ["file-aaaaaa", "file-bbbbbb", "file-cccccc"],
    output_versions: { "file-aaaaaa": 2, "file-bbbbbb": 2, "file-cccccc": 2 },
    output_variants: { "file-aaaaaa": { variant_id: "v1", label: "Shape 1:1" }, "file-bbbbbb": { variant_id: "v2", label: "Hook: Cozy up" } },
    head_version: 2,
  };
  it("names a variant's file with its label and never lets two downloads share a name", () => {
    const taken = new Set<string>();
    const names = outputRows(answer).map((r) => [r.fileId, finishedDownloadName("Tea", r, taken)]);
    const byFile = Object.fromEntries(names);
    expect(byFile["file-aaaaaa"]).toBe("Tea Shape 1 1.mp4");
    expect(byFile["file-bbbbbb"]).toBe("Tea Hook Cozy up.mp4".replace("Hook Cozy", "Hook  Cozy").replace("  ", " "));
    expect(new Set(Object.values(byFile)).size).toBe(3);
  });
  it("a file with no recorded variant falls back to its version, uniquely", () => {
    const taken = new Set<string>();
    const rows = outputRows({ output_file_ids: ["aaaaaa11", "bbbbbb22"], output_versions: { aaaaaa11: 2, bbbbbb22: 2 }, head_version: 2 });
    const [a, b] = rows.map((r) => finishedDownloadName("Tea", r, taken));
    expect(a).not.toBe(b);
    expect(rows[0].variantLabel).toBeNull();
  });
});

describe("variant matrix (C6)", () => {
  const label = (id: string) => ({ a: "Look A", b: "Look B" })[id] ?? id;
  it("parses pasted hook lines: trimmed, empties and repeats dropped", () => {
    const text = "  First line  \n\nsecond\r\nFIRST line\n   \nthird";
    expect(parseHookLines(text)).toEqual(["First line", "second", "third"]);
  });
  it("makes hooks x looks variants: 10 hooks and 2 looks are 20", () => {
    const hooks = Array.from({ length: 10 }, (_, i) => `Hook number ${i}`);
    const sets = buildMatrix({ hooks, looks: ["a", "b"], shapes: [] }, label);
    expect(sets).toHaveLength(20);
    expect(matrixSize({ hooks: 10, looks: 2, shapes: 0 })).toBe(20);
    expect(new Set(sets.map((s) => s.label.toLowerCase())).size).toBe(20);
    expect(sets[0]).toEqual({ label: "Hook: Hook number 0 · Captions: Look A", hook_text: "Hook number 0", caption_preset: "a" });
  });
  it("a one-axis row keeps the label the single-row builder makes, so it is the same variant", () => {
    expect(buildMatrix({ hooks: ["Hi"], looks: [], shapes: [] }, label)[0]!.label).toBe("Hook: Hi");
    expect(buildMatrix({ hooks: [], looks: ["a"], shapes: [] }, label)[0]!.label).toBe("Captions: Look A");
    expect(buildMatrix({ hooks: [], looks: [], shapes: ["1:1"] }, label)[0]).toEqual({ label: "Shape 1:1", aspect: "1:1" });
    expect(buildMatrix({ hooks: [], looks: [], shapes: [] }, label)).toEqual([]);
  });
  it("two long hooks that start the same never share a label", () => {
    const long = "x".repeat(60);
    const sets = buildMatrix({ hooks: [`${long} one`, `${long} two`], looks: [], shapes: [] }, label);
    expect(new Set(sets.map((s) => s.label)).size).toBe(2);
  });
  it("counts a running batch and says where it stands; a variant with no event yet is waiting", () => {
    const ids = ["a", "b", "c", "d", "e"];
    const c = batchCounts(ids, { a: { status: "rendered" }, b: { status: "rendering" }, c: { status: "failed" }, d: { status: "queued" } });
    expect(c).toMatchObject({ total: 5, rendered: 1, rendering: 1, failed: 1, queued: 2, finished: 2 });
    expect(batchProgressText(c)).toBe("1 of 5 rendered · 1 rendering · 2 waiting · 1 failed");
  });
  it("zip entries never collide", () => {
    expect(zipEntryNames(["A.mp4", "a.mp4", "B.mp4"])).toEqual(["A.mp4", "a 2.mp4", "B.mp4"]);
    expect(zipFileName("My project")).toBe("My project variants.zip");
  });
});

describe("batch standing from the run record (C6)", () => {
  const now = Date.parse("2026-10-22T12:00:00Z");
  const at = (secondsAgo: number) => new Date(now - secondsAgo * 1000).toISOString();
  it("is running while it beats, stopped when the beat goes quiet, over once the run ended", () => {
    expect(batchStanding(null, now)).toBe("none");
    expect(batchStanding({ status: "processing", createdAt: at(300), heartbeatAt: at(10) }, now)).toBe("running");
    expect(batchStanding({ status: "processing", createdAt: at(300), heartbeatAt: at(200) }, now)).toBe("stopped");
    expect(batchStanding({ status: "completed", createdAt: at(300), heartbeatAt: at(200) }, now)).toBe("over");
  });
  it("a run from before beats existed is judged by its start", () => {
    expect(batchStanding({ status: "processing", createdAt: at(120), heartbeatAt: null }, now)).toBe("running");
    expect(batchStanding({ status: "processing", createdAt: at(3600), heartbeatAt: null }, now)).toBe("stopped");
  });
});
