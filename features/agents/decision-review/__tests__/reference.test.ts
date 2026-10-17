/**
 * The reference check: disagreements lead the table, a Yes/No reads with the
 * probability OF THE ANSWER (a No at P(true) 0.29 is "No 71%"), money reads
 * at the right precision, the quote is read defensively, and the NDJSON run
 * events fold into rows as they arrive.
 */

import { readReviewItem, type JudgeVerdictRow, type ReviewItem } from "../queue";
import {
  EMPTY_RUN,
  answerWithPercent,
  applyRunEvent,
  compareReferenceRows,
  distinctSnippets,
  formatUsd,
  latestPerItem,
  orderReferenceRows,
  readReferenceGroups,
  readReferenceQuote,
  readReferenceVerdictRow,
  referenceView,
  rowAgrees,
  storedFailure,
  type ReferenceResultRow,
  type ReferenceVerdict,
} from "../reference";

function item(id: string, overrides: Partial<JudgeVerdictRow> = {}, meta: Record<string, unknown> = {}): ReviewItem {
  return readReviewItem({
    id,
    judge_key: "agent:a",
    organization_id: "org",
    question: "needs_reply",
    judge_version: 3,
    model: "jev-1.13.0",
    verdict: "false",
    confidence: 0.71,
    authority_verdict: null,
    agreed: null,
    subject_ref_id: "msg",
    created_at: "2026-10-01T00:00:00Z",
    metadata: {
      answer_type: "noul",
      answer: false,
      probability: 0.29,
      p_answer: 0.71,
      options: [
        { key: "true", label: "Yes" },
        { key: "false", label: "No" },
      ],
      method: "native",
      ...meta,
    },
    ...overrides,
  });
}

function ref(itemId: string, overrides: Partial<ReferenceVerdict> = {}): ReferenceVerdict {
  return {
    id: `ref-${itemId}`,
    status: "answered",
    reason: null,
    itemId,
    runId: "run",
    referenceModel: "claude-opus",
    method: "verbalized",
    answer: "false",
    pAnswer: 0.9,
    agree: true,
    costUsd: 0.002,
    latencyMs: 900,
    createdAt: "2026-10-02T00:00:00Z",
    probability: null,
    probabilities: null,
    legend: null,
    rawAnswer: false,
    ...overrides,
  };
}

function row(it: ReviewItem, reference: ReferenceVerdict | null, extra: Partial<ReferenceResultRow> = {}): ReferenceResultRow {
  return { id: it.id, item: it, reference, failure: null, pending: false, snippet: null, ...extra };
}

describe("answer display", () => {
  it("shows a Yes/No with the probability of the answer given", () => {
    const it = item("a");
    expect(answerWithPercent(it.view, it.pAnswer)).toBe("No 71%");
  });

  it("rebuilds the reference's Yes/No distribution from p_answer", () => {
    const it = item("a");
    const view = referenceView(it, ref("a", { answer: "true", pAnswer: 0.8, rawAnswer: true }));
    expect(answerWithPercent(view, null)).toBe("Yes 80%");
    const no = referenceView(it, ref("a", { answer: "false", pAnswer: 0.65 }));
    expect(answerWithPercent(no, null)).toBe("No 65%");
  });

  it("says how the reference answered (never 'method not stated' for a recorded method)", () => {
    expect(referenceView(item("a"), ref("a"))?.method).toBe("verbalized");
    const stored = readReferenceVerdictRow({
      id: "r1",
      subject_ref_id: "a",
      verdict: "false",
      confidence: 0.96,
      model: "claude-sonnet-5-5",
      created_at: "2026-10-17T01:58:09Z",
      metadata: { status: "answered", method: "verbalized", p_answer: 0.96 },
    });
    expect(stored?.method).toBe("verbalized");
  });

  it("reads an unreadable answer as a dash, never a number", () => {
    expect(answerWithPercent(null, 0.5)).toBe("—");
  });
});

describe("agreement and order", () => {
  it("prefers the stored agree flag, else compares answers", () => {
    const it = item("a");
    expect(rowAgrees(row(it, ref("a", { agree: false })))).toBe(false);
    expect(rowAgrees(row(it, ref("a", { agree: null, answer: "false" })))).toBe(true);
    expect(rowAgrees(row(it, ref("a", { agree: null, answer: "true" })))).toBe(false);
    expect(rowAgrees(row(it, null))).toBeNull();
  });

  it("puts disagreements first, then failures, pending, agreements; low confidence first", () => {
    const agreeLow = row(item("agree-low", { confidence: 0.2 }), ref("agree-low"));
    const agreeHigh = row(item("agree-high", { confidence: 0.9 }), ref("agree-high"));
    const disagreeHigh = row(item("dis-high", { confidence: 0.95 }), ref("dis-high", { agree: false }));
    const disagreeLow = row(item("dis-low", { confidence: 0.4 }), ref("dis-low", { agree: false }));
    const failed = row(item("failed"), null, {
      failure: { itemId: "failed", question: null, error: "timeout", status: "failed" },
    });
    const pending = row(item("pending"), null, { pending: true });
    const ordered = orderReferenceRows([agreeHigh, pending, agreeLow, failed, disagreeHigh, disagreeLow]);
    expect(ordered.map((r) => r.id)).toEqual([
      "dis-low",
      "dis-high",
      "failed",
      "pending",
      "agree-low",
      "agree-high",
    ]);
    expect(compareReferenceRows(disagreeLow, agreeLow)).toBeLessThan(0);
  });
});

describe("money", () => {
  it("formats cost at a readable precision", () => {
    expect(formatUsd(null)).toBe("—");
    expect(formatUsd(0)).toBe("$0.00");
    expect(formatUsd(0.00004)).toBe("<$0.0001");
    expect(formatUsd(0.0042)).toBe("$0.0042");
    expect(formatUsd(0.125)).toBe("$0.13");
    expect(formatUsd(1234.4)).toBe("$1,234");
  });
});

describe("quote", () => {
  it("reads the server's quote", () => {
    const quote = readReferenceQuote({
      item_count: 2,
      reference_model: { id: "m1", name: "Claude Opus" },
      estimated_cost_usd: 0.031,
      items: [{ item_id: "a", question: "needs_reply" }, { item_id: "b" }, { nope: 1 }],
      max_items: 20,
    });
    expect(quote).toEqual({
      itemCount: 2,
      referenceModel: { id: "m1", name: "Claude Opus" },
      estimatedCostUsd: 0.031,
      items: [
        { itemId: "a", question: "needs_reply" },
        { itemId: "b", question: null },
      ],
      skippedExisting: 0,
      inFlight: 0,
      unbuildable: [],
      maxCostUsd: null,
      maxItems: 20,
    });
  });

  it("reads in-flight, unbuildable and the retry-bounded cost", () => {
    const quote = readReferenceQuote({
      item_count: 1,
      reference_model: { id: "m1", name: "Claude Sonnet" },
      estimated_cost_usd: 0.01,
      max_cost_usd: 0.03,
      in_flight: 2,
      unbuildable: [{ item_id: "c", question: "q", reason: "has non-text input the reference cannot see" }, { x: 1 }],
      items: [{ item_id: "a", question: "q" }],
      max_items: 5,
    });
    expect(quote.inFlight).toBe(2);
    expect(quote.maxCostUsd).toBe(0.03);
    expect(quote.unbuildable).toEqual([
      { itemId: "c", question: "q", reason: "has non-text input the reference cannot see" },
    ]);
    expect(quote.maxItems).toBe(5);
  });

  it("refuses a quote that is not an object", () => {
    expect(() => readReferenceQuote("nope")).toThrow();
  });
});

describe("stored rows", () => {
  it("reads a decision_reference row and keeps the newest per item", () => {
    const older = readReferenceVerdictRow({
      id: "r1",
      subject_ref_id: "a",
      verdict: "true",
      confidence: null,
      model: null,
      created_at: "2026-10-01T00:00:00Z",
      metadata: { p_answer: 0.6, agree: false, reference_model: { name: "Opus" }, cost_usd: 0.01 },
    });
    const newer = readReferenceVerdictRow({
      id: "r2",
      subject_ref_id: "a",
      verdict: "false",
      confidence: null,
      model: "opus",
      created_at: "2026-10-03T00:00:00Z",
      metadata: { p_answer: 0.7, agree: true },
    });
    expect(older?.referenceModel).toBe("Opus");
    expect(older?.costUsd).toBe(0.01);
    const latest = latestPerItem([older as ReferenceVerdict, newer as ReferenceVerdict]);
    expect(latest.get("a")?.id).toBe("r2");
    expect(
      readReferenceVerdictRow({
        id: "x",
        subject_ref_id: null,
        verdict: null,
        confidence: null,
        model: null,
        created_at: "",
        metadata: null,
      }),
    ).toBeNull();
  });
});

describe("stored rows without an answer", () => {
  const base = {
    subject_ref_id: "a",
    verdict: "",
    confidence: null,
    model: "claude-sonnet-5-5",
    created_at: "2026-10-04T00:00:00Z",
  };

  it("a refusal survives a reload with its reason and never reads as agree", () => {
    const refused = readReferenceVerdictRow({
      ...base,
      id: "r",
      metadata: { status: "unanswerable", reason: "the report does not say", agree: true },
    }) as ReferenceVerdict;
    expect(refused.status).toBe("unanswerable");
    expect(refused.answer).toBeNull();
    expect(refused.agree).toBeNull();
    expect(storedFailure(refused)).toEqual({
      itemId: "a",
      question: null,
      error: "the report does not say",
      status: "unanswerable",
    });
    expect(rowAgrees(row(item("a"), refused))).toBeNull();
  });

  it("a live claim is pending, not a failure", () => {
    const claim = readReferenceVerdictRow({
      ...base,
      id: "p",
      metadata: { status: "pending", run_id: "run" },
    }) as ReferenceVerdict;
    expect(claim.status).toBe("pending");
    expect(storedFailure(claim)).toBeNull();
  });

  it("an older row without a status is an answer", () => {
    const old = readReferenceVerdictRow({ ...base, id: "o", verdict: "true", metadata: { agree: true } });
    expect(old?.status).toBe("answered");
    expect(old?.answer).toBe("true");
  });
});

describe("live run", () => {
  it("a live row carries the distribution and the model that answered", () => {
    const state = applyRunEvent(EMPTY_RUN, {
      event: "data",
      data: {
        type: "decision_reference_item",
        run_id: "r",
        item_id: "i1",
        question: "q",
        reference_answer: "reject",
        reference_verdict: "reject",
        reference_p: 0.8,
        reference_probabilities: { keep: 0.2, reject: 0.8 },
        reference_legend: null,
        item_verdict: "keep",
        agree: false,
        already_checked: true,
        model: "claude-sonnet-5-5-20261001",
        method: "verbalized",
        cost_usd: 0.001,
        latency_ms: 800,
      },
    });
    expect(state.verdicts.i1).toMatchObject({
      status: "answered",
      method: "verbalized",
      probabilities: { keep: 0.2, reject: 0.8 },
      referenceModel: "claude-sonnet-5-5-20261001",
    });
  });

  it("reads why an item has no answer", () => {
    const state = applyRunEvent(EMPTY_RUN, {
      event: "data",
      data: {
        type: "decision_reference_item_failed",
        run_id: "r",
        item_id: "i2",
        question: "q",
        error: "another reference run is checking this answer right now",
        status: "in_flight",
      },
    });
    expect(state.failures.i2?.status).toBe("in_flight");
  });

  it("reads the server's typed data payloads", () => {
    let state = applyRunEvent(EMPTY_RUN, {
      event: "data",
      data: {
        type: "decision_reference_run_started",
        run_id: "r",
        agent_id: "a",
        item_count: 1,
        skipped_existing: 0,
        reference_model: { id: "m", name: "Opus" },
        judge_key: "reference:model:Opus",
      },
    });
    expect(state.runId).toBe("r");
    state = applyRunEvent(state, {
      event: "data",
      data: {
        type: "decision_reference_item",
        run_id: "r",
        item_id: "i1",
        question: "q",
        reference_id: "ref-1",
        reference_answer: 2.4,
        reference_verdict: "2",
        reference_p: 0.6,
        item_verdict: "3",
        agree: false,
        cost_usd: 0.001,
        latency_ms: 800,
      },
    });
    expect(state.verdicts.i1).toMatchObject({ id: "ref-1", answer: "2", agree: false, rawAnswer: 2.4 });
    state = applyRunEvent(state, {
      event: "data",
      data: { type: "decision_reference_item_failed", run_id: "r", item_id: "i2", question: "q", error: "boom" },
    });
    expect(state.failures.i2?.error).toBe("boom");
    state = applyRunEvent(state, {
      event: "data",
      data: { type: "decision_reference_run_done", run_id: "r", done: 1, failed: 1, agreement_rate: 0, cost_usd: 0.001 },
    });
    expect(state.finished).toBe(true);
  });

  it("folds the stream into results as items finish", () => {
    let state = applyRunEvent(EMPTY_RUN, {
      event: "run_started",
      data: { run_id: "run-1", item_count: 2, reference_model: { id: "m", name: "Opus" } },
    });
    expect(state.itemCount).toBe(2);
    expect(state.referenceModel).toBe("Opus");
    state = applyRunEvent(state, {
      event: "reference_item_failed",
      data: { item_id: "a", question: "q", error: "rate limited" },
    });
    expect(state.failures.a?.error).toBe("rate limited");
    state = applyRunEvent(state, {
      event: "reference_item",
      data: { item_id: "a", reference_answer: true, reference_p: 0.8, agree: false, cost_usd: 0.003 },
    });
    expect(state.failures.a).toBeUndefined();
    expect(state.verdicts.a?.answer).toBe("true");
    expect(state.verdicts.a?.runId).toBe("run-1");
    state = applyRunEvent(state, { event: "something_else", data: {} });
    state = applyRunEvent(state, {
      event: "run_done",
      data: { run_id: "run-1", done: 1, failed: 1, agreement_rate: 0, cost_usd: 0.003 },
    });
    expect(state.finished).toBe(true);
    expect(state.summary).toEqual({
      done: 1,
      failed: 1,
      unanswerable: 0,
      inFlight: 0,
      agreementRate: 0,
      costUsd: 0.003,
    });
  });

  it("records a stream-level error", () => {
    const state = applyRunEvent(EMPTY_RUN, { event: "error", data: { message: "Not allowed" } });
    expect(state.error).toBe("Not allowed");
  });
});

describe("reliability vs reference", () => {
  it("reads each calibration group's reference block", () => {
    const groups = readReferenceGroups({
      groups: [
        {
          version: 3,
          question: "needs_reply",
          reference: {
            n: 12,
            agreement_rate: 0.75,
            reference_models: ["opus", ""],
            probability: {
              bins: [{ lower: 0.6, upper: 0.7, count: 4, mean_predicted: 0.65, observed_accuracy: 0.5, gap: -0.15 }],
            },
            confidence: { bins: [] },
          },
        },
        { version: 2, question: "unchecked", reference: null },
        { question: "missing_version", reference: { n: 1 } },
      ],
    });
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ version: 3, n: 12, agreementRate: 0.75, referenceModel: "opus" });
    expect(groups[0].probabilityBins[0].observed_accuracy).toBe(0.5);
    expect(readReferenceGroups({ groups: [] })).toEqual([]);
    expect(readReferenceGroups(null)).toEqual([]);
  });
});

// The live News Relevance Check turns (2026-10-17), as the judged state reads them.
const liveTurn = (signal: string, client: string, clock: string) => [
  `Judge this one news signal against this one client profile and answer the six questions.\n\n## Signal (news_signal)\n${signal}\n\n## Client context (news_client_context)\n${client}\n\n## Run clock (run_generated_at — this is 'now')\n${clock}\n\nAnswer all six questions with calibrated probabilities. Return no prose.`,
];
const CLIENT = '{"__kind": "news_client_context", "company": {"name": "All Green Recycling"}, "topics": ["e-waste recycling"]}';
const REDDIT = liveTurn(
  '{"id": "be4127f9fb284333", "title": "Just FYI, when they say it\'s built to be recycled, it\'s largely marketing.", "lane": "profile_relevance"}',
  CLIENT,
  "2026-10-07T21:10:01Z",
);
const WIRE = liveTurn(
  '{"id": "63857d252704b7dd", "title": "AT-RACK to Highlight Mobile Destruction System | News By Wire", "lane": "profile_relevance"}',
  CLIENT,
  "2026-10-07T21:10:01Z",
);
const AXIOS = liveTurn(
  '{"id": "a4431f85f453ae39", "title": "Namespace raised a $42M Series B \\"led\\" by Scale", "lane": "major_news_unmatched"}',
  CLIENT,
  "2026-10-05T14:10:05Z",
);

describe("state snippet", () => {
  it("names what differs between items, never the shared boilerplate", () => {
    const out = distinctSnippets({ a: REDDIT, b: REDDIT, c: WIRE, d: AXIOS });
    expect(out.a).toBe("Just FYI, when they say it's built to be recycled, it's largely marketing.");
    expect(out.b).toBe(out.a); // two questions of the same turn read the same
    expect(out.c).toBe("AT-RACK to Highlight Mobile Destruction System | News By Wire");
    expect(out.d).toBe('Namespace raised a $42M Series B "led" by Scale');
    expect(Object.values(out).some((v) => v?.startsWith("Judge this one"))).toBe(false);
  });

  it("with one distinct state, still prefers the record's title over the instruction line", () => {
    expect(distinctSnippets({ a: REDDIT }).a).toMatch(/^Just FYI/);
  });

  it("falls back to the first differing line, cut; nothing readable is null", () => {
    const out = distinctSnippets({ a: ["Same intro\nfirst thing " + "x".repeat(200)], b: ["Same intro\nsecond"], c: [] }, 20);
    expect(out.a).toBe(`first thing ${"x".repeat(7)}…`);
    expect(out.b).toBe("second");
    expect(out.c).toBeNull();
  });
});
