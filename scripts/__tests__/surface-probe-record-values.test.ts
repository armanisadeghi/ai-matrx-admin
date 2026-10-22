// scripts/__tests__/surface-probe-record-values.test.ts
//
// W5-B: the probe recorded WHICH values a page supplied but not WHAT they were, so the
// per-surface admin page rendered every situation blank as [Label]. The verdict now carries
// `values` — the page's preview line per supplied value, cut to PROBE_VALUE_MAX_CHARS —
// and never a value the page did not supply, nor anything when the page named another surface.

import { judgeProbe, PROBE_VALUE_MAX_CHARS, type ChainValue, type ProbeRecordInput } from "../lib/surface-probe-judge";

const CHAIN: ChainValue[] = [
  { name: "note_title", label: "Note title", always_available: true, auto_context: true, item_type: "" },
  { name: "content", label: "Content", always_available: false, auto_context: true, item_type: "" },
];

function input(over: Partial<ProbeRecordInput>): ProbeRecordInput {
  return {
    surface: "matrx-user/notes",
    route: "/notes/abc",
    recordId: "abc",
    base: "https://www.aimatrx.com",
    supplied: ["note_title", "content"],
    suppliedEmpty: [],
    surfaceNamed: true,
    signedIn: true,
    probedAs: { email: "admin@admin.com", userId: null, role: "admin" },
    errors: [],
    ...over,
  };
}

describe("surface-probe-record: values", () => {
  it("records each supplied value's text, cut to the cap", () => {
    const long = "x".repeat(PROBE_VALUE_MAX_CHARS + 50);
    const probe = judgeProbe(
      input({ values: { note_title: "Quarterly plan", content: long, stray: "not declared" } }),
      CHAIN,
      "2026-10-22T00:00:00Z",
    );
    expect(probe.values.note_title).toBe("Quarterly plan");
    expect(probe.values.content).toHaveLength(PROBE_VALUE_MAX_CHARS);
    expect(probe.values.content.endsWith("…")).toBe(true);
    expect(probe.values).not.toHaveProperty("stray");
  });

  it("takes values from a label-mode read", () => {
    const probe = judgeProbe(
      input({ supplied: [], byLabel: [{ label: "Note title", line: "Quarterly plan" }, { label: "Content", line: "Empty" }] }),
      CHAIN,
      "2026-10-22T00:00:00Z",
    );
    expect(probe.values).toEqual({ note_title: "Quarterly plan" });
  });

  it("records nothing when the page named another surface", () => {
    const probe = judgeProbe(input({ surfaceNamed: false, values: { note_title: "Quarterly plan" } }), CHAIN, "2026-10-22T00:00:00Z");
    expect(probe.values).toEqual({});
  });
});
