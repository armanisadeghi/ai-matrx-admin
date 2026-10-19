/**
 * The admin cell detail's pure half: `evidenceProven` must give the same answer
 * as `ai.translation_evidence_proven(jsonb)`, and no evidence entry — of any
 * shape the live table holds — is ever dropped.
 */
import { evidenceProven, normalizeEvidence, readRun, sourceLabel } from "../cellDetail";

describe("evidenceProven mirrors ai.translation_evidence_proven", () => {
  it("is false for nothing, a non-array, or docs only", () => {
    expect(evidenceProven(null)).toBe(false);
    expect(evidenceProven({ kind: "probe", result: "pass" })).toBe(false);
    expect(evidenceProven([{ kind: "doc", result: "copied" }])).toBe(false);
  });
  it("accepts a bare or object outcome of pass/accepted/boundary on probe or replay", () => {
    expect(evidenceProven([{ kind: "probe", result: "accepted" }])).toBe(true);
    expect(evidenceProven([{ kind: "replay", result: { outcome: "boundary" } }])).toBe(true);
    expect(evidenceProven([{ kind: "probe", result: { outcome: "pass", conversation_id: "c" } }])).toBe(true);
  });
  it("any failing probe or replay un-proves it", () => {
    expect(
      evidenceProven([
        { kind: "probe", result: "accepted" },
        { kind: "replay", result: { outcome: "rejected" } },
      ]),
    ).toBe(false);
  });
  it("a probe whose result is a free-form map proves nothing", () => {
    expect(
      evidenceProven([{ kind: "probe", result: { "summary=none": "rejected: …", "summary omitted": "accepted" } }]),
    ).toBe(false);
  });
});

describe("normalizeEvidence keeps every entry", () => {
  it("renders malformed entries (no kind) as key/value", () => {
    const [a, b] = normalizeEvidence([
      { date: "2026-10-18", "model_definition.capabilities.features": "web_search" },
      { date: "2026-10-18", probe: { ok: true } },
    ]);
    expect(a!.kind).toBeNull();
    expect(a!.extra).toEqual([
      ["date", "2026-10-18"],
      ["model_definition.capabilities.features", "web_search"],
    ]);
    expect(b!.extra.map(([k]) => k)).toEqual(["date", "probe"]);
  });
  it("reads kind, at, ref, outcome and the test call's conversation", () => {
    const [e] = normalizeEvidence([
      { kind: "probe", at: "2026-10-04T01:25Z", ref: "x", result: { outcome: "accepted", conversation_id: "conv-1" } },
    ]);
    expect(e).toMatchObject({ kind: "probe", at: "2026-10-04T01:25Z", ref: "x", outcome: "accepted", conversationId: "conv-1" });
    expect(e!.extra).toEqual([]);
  });
  it("keeps a non-object entry", () => {
    expect(normalizeEvidence(["just text"])[0]!.extra).toEqual([["value", "just text"]]);
  });
});

describe("source and run", () => {
  it("names each known source and shows any other value raw", () => {
    expect(sourceLabel("agent")).toBe("Drafting agent");
    expect(sourceLabel("probe")).toBe("Live test");
    expect(sourceLabel("ingest")).toBe("Provider catalog");
    expect(sourceLabel("migration")).toBe("Code change");
    expect(sourceLabel("human")).toBe("human");
  });
  it("reads metadata.run, or null when none was recorded", () => {
    expect(readRun({})).toBeNull();
    expect(readRun({ run: { conversation_id: "c", agent_id: "a" } })).toMatchObject({
      conversation_id: "c",
      agent_id: "a",
      request_id: null,
    });
  });
});
