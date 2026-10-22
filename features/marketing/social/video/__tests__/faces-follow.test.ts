import { applyPatch, dragonLairComposition, type Composition } from "@ai-matrx/media/video";
import { CAPTION_PRESET_IDS, CAPTION_SAMPLE_LOOP_FRAMES, captionSampleHtml } from "@ai-matrx/media/video/engine";

import { facesCostLine } from "../estimate";

const line = (capability: string, points: number | null) => ({ capability, points }) as never;

describe("facesCostLine", () => {
  it("sums the faces lines in points and ignores other capabilities", () => {
    expect(facesCostLine({ lines: [line("faces", 100.4), line("faces", 205.2), line("tts", 900)] })).toBe("Face tracking 306 points");
  });
  it("says only 'Face tracking' when no price is known, null when nothing needs it", () => {
    expect(facesCostLine({ lines: [line("faces", null)] })).toBe("Face tracking");
    expect(facesCostLine({ lines: [line("tts", 5)] })).toBeNull();
  });
});

describe("follow the speaker on the published schema", () => {
  it("the engine accepts follow: speaker on a caption style and keeps it", () => {
    const doc = dragonLairComposition() as Composition;
    const track = Object.keys(doc.tracks.captions)[0]!;
    const r = applyPatch(doc, { baseVersion: doc.version, ops: [{ op: "set", path: ["tracks", "captions", track, "style"], value: { preset: CAPTION_PRESET_IDS[0], follow: "speaker" } }] } as never);
    expect(r.ok).toBe(true);
    if (r.ok) expect((r.doc as Composition).tracks.captions[track]?.style.follow).toBe("speaker");
  });
});

describe("caption look library", () => {
  it("has sixteen looks and each draws a sample on every loop frame", () => {
    expect(CAPTION_PRESET_IDS.length).toBe(16);
    for (const id of CAPTION_PRESET_IDS) {
      expect(captionSampleHtml(id, 0).length).toBeGreaterThan(0);
      expect(captionSampleHtml(id, CAPTION_SAMPLE_LOOP_FRAMES - 1).length).toBeGreaterThan(0);
    }
  });
});
