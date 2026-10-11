// A learner is only ever shown their own measurements: no sample/seed rows
// (the report used to fall back to invented Biology/Spanish/Chemistry gains).
// Plus the offer rule — baseline on a fresh deck, post-test at the threshold,
// a skip never asks again.

jest.mock("@/features/education/assessment/data/assessmentService", () => ({
  assessmentService: { listGainResults: jest.fn() },
}));
jest.mock("@/utils/auth/getUserId", () => ({
  getUserId: () => "user-1",
  NotAuthenticatedError: class extends Error {},
}));

import { buildGainReport } from "../learningGainService";
import { decideGainOffer, baselineOfferKey, postOfferKey } from "../gainOffer";
import type { AssessmentResultRow } from "@/features/education/assessment/data/types";

function row(p: Partial<AssessmentResultRow>): AssessmentResultRow {
  return {
    id: p.id ?? "r",
    assessment_id: "a1",
    phase: "baseline",
    status: "completed",
    score_value: 0.4,
    gain_group_id: "g1",
    topic: "Cells",
    source_kind: "deck",
    source_id: "deck-1",
    created_at: "2026-10-01T00:00:00Z",
    completed_at: "2026-10-01T00:05:00Z",
    ...p,
  } as AssessmentResultRow;
}

describe("learning-gain report is honest", () => {
  it("returns an empty report — never fixtures — when nothing was measured", () => {
    const report = buildGainReport([]);
    expect(report.pairs).toEqual([]);
    expect(report.awaitingPost).toEqual([]);
    expect(report.overallDelta).toBeNull();
    expect(JSON.stringify(report)).not.toMatch(/seed|Biology|Spanish|Chemistry/i);
  });

  it("reports a lone real baseline as awaiting its post-test", () => {
    const report = buildGainReport([row({ id: "b1" })]);
    expect(report.pairs).toEqual([]);
    expect(report.awaitingPost.map((r) => [r.id, r.score, r.subjectLabel])).toEqual([
      ["b1", 0.4, "Cells"],
    ]);
  });

  it("ignores an unfinished taking", () => {
    const report = buildGainReport([row({ status: "in_progress", score_value: null })]);
    expect(report.awaitingPost).toEqual([]);
  });

  it("pairs a real baseline with its post", () => {
    const report = buildGainReport([
      row({ id: "b1" }),
      row({ id: "p1", phase: "post", score_value: 0.9, created_at: "2026-10-05T00:00:00Z" }),
    ]);
    expect(report.pairs).toHaveLength(1);
    expect(report.pairs[0].delta).toBeCloseTo(0.5);
    expect(report.awaitingPost).toEqual([]);
  });
});

describe("decideGainOffer", () => {
  const base = { deckId: "deck-1", answered: {}, threshold: 0.8 };

  it("offers a baseline on a fresh deck with none", () => {
    expect(decideGainOffer({ ...base, results: [], studied: 0, masteredPct: 0 })).toEqual({
      kind: "baseline",
    });
  });

  it("never re-offers a skipped baseline, nor one once studying began", () => {
    expect(
      decideGainOffer({
        ...base,
        answered: { [baselineOfferKey("deck-1")]: "x" },
        results: [],
        studied: 0,
        masteredPct: 0,
      }),
    ).toBeNull();
    expect(decideGainOffer({ ...base, results: [], studied: 3, masteredPct: 0 })).toBeNull();
    expect(decideGainOffer({ ...base, results: [], studied: null, masteredPct: null })).toBeNull();
  });

  it("offers the post-test once mastery crosses the threshold", () => {
    const results = [row({})];
    expect(decideGainOffer({ ...base, results, studied: 10, masteredPct: 0.5 })).toBeNull();
    expect(decideGainOffer({ ...base, results, studied: 10, masteredPct: 0.8 })).toEqual({
      kind: "post",
      assessmentId: "a1",
      gainGroupId: "g1",
    });
    expect(
      decideGainOffer({
        ...base,
        answered: { [postOfferKey("deck-1")]: "x" },
        results,
        studied: 10,
        masteredPct: 0.9,
      }),
    ).toBeNull();
    expect(
      decideGainOffer({
        ...base,
        results: [...results, row({ id: "p", phase: "post" })],
        studied: 10,
        masteredPct: 0.9,
      }),
    ).toBeNull();
  });
});
