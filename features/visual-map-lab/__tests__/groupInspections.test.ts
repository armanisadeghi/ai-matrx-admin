import { groupInspections, firstInspection } from "../service";

const row = (id: string, subject_ref: string, created_at: string, extra: Record<string, unknown> = {}) => ({
  id, subject_type: "visual_map", subject_ref, round: 0, spec: { diagram_type: "sequence", meta: { title: "T " + id } },
  measurements: {}, diagnostics: [], screenshot_file_id: null, organization_id: "o", created_at, metadata: {}, ...extra,
});

describe("saved inspections group by subject", () => {
  it("one list row per subject, newest row, counted, screenshot flagged if any row has one", () => {
    const rows = groupInspections([
      row("a", "s1", "2026-10-21T10:00:00Z"),
      row("b", "s1", "2026-10-21T11:00:00Z", { screenshot_file_id: "f" }),
      row("c", "s2", "2026-10-21T09:00:00Z"),
    ]);
    expect(rows).toHaveLength(2);
    const s1 = rows.find((r) => r.subject === "s1")!;
    expect(s1.id).toBe("inspection:b");
    expect(s1.detail).toBe("2 saved rows");
    expect(s1.hasScreenshot).toBe(true);
    expect(s1.type).toBe("sequence");
  });
  it("finds the first inspection.v1 inside a viewport map", () => {
    const v1 = { schemaVersion: 1, text: [] };
    expect(firstInspection({ "1440:dark": { error: "x" }, "800:light": v1 })).toEqual({ key: "800:light", inspection: v1 });
    expect(firstInspection({})).toBeNull();
  });
});
