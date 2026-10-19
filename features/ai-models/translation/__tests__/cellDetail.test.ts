/**
 * The admin cell detail's pure half: `evidenceProven` must give the same answer
 * as `ai.translation_evidence_proven(jsonb)`, and no evidence entry — of any
 * shape the live table holds — is ever dropped.
 */
import {
  evidenceProven,
  jsonEqual,
  proofCurrent,
  normalizeEvidence,
  normalizeTestResult,
  otherMetadata,
  readRun,
  sourceLabel,
} from "../cellDetail";

describe("evidenceProven mirrors ai.translation_evidence_proven", () => {
  it("is false for nothing, a non-array, or docs only", () => {
    expect(evidenceProven(null)).toBe(false);
    expect(evidenceProven({ kind: "probe", result: "pass" })).toBe(false);
    expect(evidenceProven([{ kind: "doc", result: "copied" }])).toBe(false);
  });
  it("accepts a bare or object outcome of pass/accepted/boundary on probe or replay", () => {
    expect(evidenceProven([{ kind: "probe", result: "accepted" }])).toBe(true);
    expect(
      evidenceProven([{ kind: "replay", result: { outcome: "boundary" } }]),
    ).toBe(true);
    expect(
      evidenceProven([
        { kind: "probe", result: { outcome: "pass", conversation_id: "c" } },
      ]),
    ).toBe(true);
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
      evidenceProven([
        {
          kind: "probe",
          result: {
            "summary=none": "rejected: …",
            "summary omitted": "accepted",
          },
        },
      ]),
    ).toBe(false);
  });
});

describe("normalizeEvidence keeps every entry", () => {
  it("renders malformed entries (no kind) as key/value", () => {
    const [a, b] = normalizeEvidence([
      {
        date: "2026-10-18",
        "model_definition.capabilities.features": "web_search",
      },
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
      {
        kind: "probe",
        at: "2026-10-04T01:25Z",
        ref: "x",
        result: { outcome: "accepted", conversation_id: "conv-1" },
      },
    ]);
    expect(e).toMatchObject({
      kind: "probe",
      at: "2026-10-04T01:25Z",
      ref: "x",
      outcome: "accepted",
      conversationId: "conv-1",
    });
    expect(e!.extra).toEqual([]);
  });
  it("a non-string kind or at stays visible as key/value, never 'vanishes'", () => {
    const [e] = normalizeEvidence([
      { kind: 7, at: { day: "2026-10-18" }, ref: "r" },
    ]);
    expect(e!.kind).toBeNull();
    expect(e!.at).toBeNull();
    expect(e!.extra).toEqual([
      ["kind", 7],
      ["at", { day: "2026-10-18" }],
    ]);
  });
  it("keeps a non-object entry", () => {
    expect(normalizeEvidence(["just text"])[0]!.extra).toEqual([
      ["value", "just text"],
    ]);
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
    expect(
      readRun({ run: { conversation_id: "c", agent_id: "a" } }),
    ).toMatchObject({
      conversation_id: "c",
      agent_id: "a",
      request_id: null,
      extra: [],
    });
    expect(
      readRun({ run: { conversation_id: "c", note: 1, at: 5 } })!.extra,
    ).toEqual([
      ["note", 1],
      ["at", 5],
    ]);
  });
  it("shows every metadata key other than run", () => {
    expect(otherMetadata({ run: {}, origin: "x", n: 2 })).toEqual([
      ["origin", "x"],
      ["n", 2],
    ]);
    expect(otherMetadata(null)).toEqual([]);
  });
});

describe("normalizeTestResult renders any reply honestly", () => {
  it("reads a full reply with no problems", () => {
    const r = normalizeTestResult({
      cell_id: "c",
      summary: "2 accepted",
      tested_offerings: 1,
      budget: { per_run: 40, per_day: 150, used_last_24h: 3, allowed_now: 37 },
      stopped_by_budget: false,
      outcomes: [
        {
          offering_id: "o",
          model_name: "M",
          api: "a",
          setting_key: "k",
          label: "max",
          value: "max",
          wire: { a: 1 },
          outcome: "accepted",
          detail: "ok",
          provider_message: null,
          provider_param: null,
          conversation_id: "conv",
          cost_usd: 0.01,
          evidence: "e",
        },
      ],
    });
    expect(r.problems).toEqual([]);
    expect(r.outcomes[0]).toMatchObject({
      label: "max",
      outcome: "accepted",
      conversation_id: "conv",
    });
    expect(r.budget?.per_day).toBe(150);
  });
  it("names a missing budget and outcome list instead of throwing", () => {
    const r = normalizeTestResult({ summary: "x" });
    expect(r.problems).toEqual([
      "The reply has no budget.",
      "The reply has no outcome list.",
    ]);
    expect(r.outcomes).toEqual([]);
  });
  it("a non-object reply or a junk outcome line is named, raw kept", () => {
    expect(normalizeTestResult("nope").problems).toEqual([
      "The server's reply is not an object.",
    ]);
    const r = normalizeTestResult({ summary: "s", budget: {}, outcomes: [3] });
    expect(r.problems).toEqual(["Some outcome lines are not objects."]);
    expect(r.outcomes[0]!.outcome).toBeNull();
  });
  it("a skipped line keeps the server's detail", () => {
    const r = normalizeTestResult({
      summary: "s",
      budget: {},
      outcomes: [
        {
          outcome: "skipped",
          detail:
            "Not tested: today's live-test budget is used up (150 of 150).",
        },
      ],
    });
    expect(r.outcomes[0]).toMatchObject({
      outcome: "skipped",
      detail: expect.stringContaining("150 of 150"),
    });
  });
});

describe("proofCurrent mirrors ai.translation_proof_current", () => {
  const rule = { value_map: { low: "LOW", high: "HIGH" }, default: "LOW" };
  const pass = (extra: Record<string, unknown>) => ({
    kind: "probe",
    result: { outcome: "accepted" },
    ...extra,
  });
  it("counts only server-run tests of exactly this rule", () => {
    expect(
      proofCurrent(
        [
          pass({
            by: "probe",
            for_rule: {
              default: "LOW",
              value_map: { high: "HIGH", low: "LOW" },
            },
          }),
        ],
        rule,
      ),
    ).toBe(true);
    expect(proofCurrent([pass({ by: "agent", for_rule: rule })], rule)).toBe(
      false,
    );
    expect(
      proofCurrent(
        [pass({ by: "probe", for_rule: { ...rule, default: "HIGH" } })],
        rule,
      ),
    ).toBe(false);
    expect(proofCurrent([pass({})], rule)).toBe(false); // unstamped legacy entry
    expect(
      proofCurrent(
        [
          pass({ by: "probe", for_rule: rule }),
          {
            kind: "probe",
            by: "probe",
            for_rule: rule,
            result: { outcome: "observed_accepted" },
          },
        ],
        rule,
      ),
    ).toBe(true);
    expect(
      proofCurrent(
        [
          {
            kind: "probe",
            by: "probe",
            for_rule: rule,
            result: { outcome: "observed_accepted" },
          },
        ],
        rule,
      ),
    ).toBe(false);
  });
  it("compares like jsonb", () => {
    expect(jsonEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true);
    expect(jsonEqual([1, 2], [2, 1])).toBe(false);
    expect(jsonEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false);
  });
});
