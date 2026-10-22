import { latestInspectionOf, subjectRefOf, type InspectionRow } from "../latest-inspection";

const clean = {
  schemaVersion: 1, viewport: { w: 1440, h: 900, dpr: 1 }, theme: "light", box: { w: 100, h: 50 }, container: { w: 100, h: 50 },
  text: [], overlaps: [], outOfBounds: [], crossings: [], labelOnLine: [], contrast: [], contrastUnknown: [], consoleErrors: [],
};
const row = (id: string, round: number, measurements: unknown, shot: string | null = null): InspectionRow => ({
  id, subject_ref: subjectRefOf("c1"), round, measurements, screenshot_file_id: shot, created_at: `2026-10-22T0${round}:00:00Z`,
});

describe("latest shape inspection", () => {
  it("is null when the component was never inspected", () => {
    expect(latestInspectionOf([])).toBeNull();
  });

  it("reads only the newest round and counts the problems each capture found", () => {
    const dirty = { ...clean, text: [{ id: "t", text: "x", px: 12, box: { x: 0, y: 0, w: 1, h: 1 }, clipped: true, truncated: false }], overlaps: [{ a: "a", b: "b", area: 4 }] };
    const latest = latestInspectionOf([
      row("old", 1, { "1440:light": dirty }, "f-old"),
      row("a", 2, { "1440:light": clean }, "f1"),
      row("b", 2, { "390:dark": dirty }, "f2"),
    ])!;
    expect(latest.round).toBe(2);
    expect(latest.captures.map((c) => [c.where, c.problems, c.screenshotFileId])).toEqual([
      ["dark 390px", 2, "f2"],
      ["light 1440px", 0, "f1"],
    ]);
    expect(latest.problems).toBe(2);
    expect(latest.failed).toBe(0);
  });

  it("says a capture could not run instead of counting it as clean", () => {
    const latest = latestInspectionOf([row("a", 1, { "1440:light": { error: "the browser was unreachable" } })])!;
    expect(latest.captures[0]).toMatchObject({ problems: null, error: "the browser was unreachable" });
    expect(latest.failed).toBe(1);
    expect(latest.problems).toBe(0);
  });
});
