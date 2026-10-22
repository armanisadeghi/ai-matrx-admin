import { applyPatch, dragonLairComposition, type Composition } from "@ai-matrx/media/video";

import { DEFAULT_BED, musicCostLine, musicForBrief, musicName, musicOfDocument, musicOps, NO_MUSIC } from "../music";

const base = (): Composition => dragonLairComposition() as Composition;
const apply = (doc: Composition, ops: ReturnType<typeof musicOps>): Composition => {
  const r = applyPatch(doc, { baseVersion: doc.version, ops } as never);
  if (!r.ok) throw new Error(JSON.stringify(r));
  return r.doc;
};

describe("music choice", () => {
  it("is exactly {bed} or {file} in the brief, nothing for none", () => {
    expect(musicForBrief(NO_MUSIC)).toBeUndefined();
    expect(musicForBrief({ kind: "bed", mood: "warm", tempo: "medium" })).toEqual({ bed: { mood: "warm", tempo: "medium" } });
    expect(musicForBrief({ kind: "file", file: { fileId: "f", contentHash: "h" }, name: "x.mp3" })).toEqual({ file: { fileId: "f", contentHash: "h" } });
  });
  it("names the choice live", () => {
    expect(musicName(DEFAULT_BED)).toBe("Warm · medium · 96 BPM");
    expect(musicName(NO_MUSIC)).toBe("No music");
  });
  it("prices the bed line", () => {
    const line = { media_id: "music", capability: "music", model: "lyria-3.5", unit: "track", quantity: 1, unit_price_usd: 0.08, cost_usd: 0.08, points: 1600, note: null };
    expect(musicCostLine({ lines: [line], cached: [] })).toBe("Music bed");
    expect(musicCostLine({ lines: [], cached: ["music"] })).toBe("Music bed reused");
    expect(musicCostLine({ lines: [], cached: [] })).toBeNull();
  });
  it("puts a bed on a project, reads it back, and takes it off", () => {
    const withBed = apply(base(), musicOps(base(), { kind: "bed", mood: "calm", tempo: "slow" }, 20));
    expect(withBed.media.music?.request?.alias).toBe("music.default");
    expect(withBed.media.music?.requestHash).toBeTruthy();
    expect(withBed.tracks.audio.music?.media).toBe("music");
    expect(musicOfDocument(withBed as never)).toEqual({ kind: "bed", mood: "calm", tempo: "slow" });
    const swapped = apply(withBed, musicOps(withBed, { kind: "bed", mood: "dramatic", tempo: "fast" }, 20));
    expect(musicOfDocument(swapped as never)).toEqual({ kind: "bed", mood: "dramatic", tempo: "fast" });
    const none = apply(swapped, musicOps(swapped, NO_MUSIC, 20));
    expect(none.media.music).toBeUndefined();
    expect(none.tracks.audio.music).toBeUndefined();
    expect(musicOps(base(), NO_MUSIC, 20)).toEqual([]);
  });

  it("a generated bed (its file landed) still reads as the bed that was chosen", () => {
    const doc = apply(base(), musicOps(base(), { kind: "bed", mood: "warm", tempo: "medium" }, 20));
    const m = doc.media.music as unknown as { source: unknown };
    m.source = { type: "file", fileId: "f1", contentHash: "h1" };
    expect(musicOfDocument(doc as never)).toEqual({ kind: "bed", mood: "warm", tempo: "medium" });
  });
});
