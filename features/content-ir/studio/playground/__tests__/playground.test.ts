import { judgeDemo, imageProbe, RENDER_GRACE_MS } from "../demo-health";
import { streamFrames, partialFrame } from "../stream-frames";
import { PLAYGROUND_DEMOS } from "../demos";
import { componentSourceGate } from "@ai-matrx/code-runtime/gate";

describe("shape playground", () => {
  it("streams from nothing to the whole value, growing", () => {
    const value = { title: "Spring launch: Field Notes app", items: [{ a: 1 }, { a: 2 }] };
    const frames = streamFrames(value);
    expect(frames[0]).toEqual({});
    expect(frames[frames.length - 1]).toEqual(value);
    expect(frames.some((f) => typeof f.title === "string" && (f.title as string).length < value.title.length)).toBe(true);
    expect(frames.some((f) => Array.isArray(f.items) && (f.items as unknown[]).length === 1)).toBe(true);
    const capped = streamFrames({ items: Array.from({ length: 200 }, (_, i) => i) }, 10);
    expect(capped).toHaveLength(10);
    expect(capped[9]).toEqual({ items: Array.from({ length: 200 }, (_, i) => i) });
    expect(partialFrame(value)).not.toEqual(value);
  });

  it("fails a demo that errored, rendered nothing, or cropped an image", () => {
    const base = { height: 300, standIns: 0, images: { total: 0, broken: 0, cropped: 0 }, errors: [], ageMs: 100 };
    expect(judgeDemo(base).verdict).toBe("pass");
    expect(judgeDemo({ ...base, errors: ["boom"] }).verdict).toBe("fail");
    expect(judgeDemo({ ...base, standIns: 2 }).verdict).toBe("fail");
    expect(judgeDemo({ ...base, height: 0 }).verdict).toBe("pending");
    expect(judgeDemo({ ...base, height: 0, ageMs: RENDER_GRACE_MS }).verdict).toBe("fail");
    expect(judgeDemo({ ...base, images: { total: 1, broken: 0, cropped: 1 } }).verdict).toBe("fail");
    expect(judgeDemo({ ...base, standIns: null, images: null }).verdict).toBe("pass");
  });

  it("calls an image cropped when cover cuts it or a parent clips it", () => {
    const img = { naturalWidth: 1000, naturalHeight: 500, complete: true };
    expect(imageProbe(img, { width: 400, height: 200 }, "contain", { width: 400, height: 200 })).toBe("ok");
    expect(imageProbe(img, { width: 400, height: 400 }, "cover", { width: 400, height: 400 })).toBe("cropped");
    expect(imageProbe(img, { width: 400, height: 200 }, "contain", { width: 400, height: 120 })).toBe("cropped");
    expect(imageProbe({ ...img, naturalWidth: 0 }, { width: 1, height: 1 }, "contain", { width: 1, height: 1 })).toBe("broken");
  });

  it.each(PLAYGROUND_DEMOS.map((d) => [d.slug, d] as const))("%s passes the save gate", (_slug, demo) => {
    expect(demo.slug.startsWith("playground_")).toBe(true);
    expect(componentSourceGate(demo.source, { flavor: null })).toBeNull();
  });

  it("covers every block of the rulebook", () => {
    const covered = new Set(PLAYGROUND_DEMOS.flatMap((d) => d.covers));
    for (const label of [
      "Streaming", "Header copy", "Export", "Panel grid", "Sortable list", "Tag list",
      "save_item_state", "Run in window", "saveAs text", "Image chain", "KindImage",
      "open_file", "share_file", "Web link", "mailto", "tel", "recharts", "motion",
      "date-fns", "lodash", "react-katex", "xlsx", "react-pdf", "three", "Applets helpers",
      "Dialog", "Popover", "Tooltip", "Container queries",
    ]) {
      expect(covered.has(label)).toBe(true);
    }
  });
});
