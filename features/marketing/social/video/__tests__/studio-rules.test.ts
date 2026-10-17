import { dragonLairComposition, editWordOps, type PatchOp } from "@ai-matrx/media/video";

import { describeTheirs, historyFromRows, rebasePending } from "../conflict";
import { summarizeEstimate, estimateLabel } from "../estimate";
import { brandNameIn } from "../hook-brand";
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
