/**
 * Watch AI shows ONE run's own data (forcing tests over recorded frames).
 *
 * The two captures are real `context_analysis` frames of two turns of one conversation
 * (fixtures/two-turns-context-analysis.json). Red before green (2026-10-13): the old window
 * took EVERY `context_analysis` on a request's timeline (`selectWireCaptures`), replaced live
 * captures with however many snapshots the record held, and bound the record by a 5-second
 * window over the conversation's reservations — each `it` below fails against that behaviour
 * (proved by planting it back into watch-run-truth.ts; WB progress notes).
 */
import fixture from "./fixtures/two-turns-context-analysis.json";
import type { ActiveRequest } from "@ai-matrx/chat/agents/types/request.types";
import type { MandateRunData } from "@ai-matrx/agents/generated/stream-events";
import {
  chooseRequestSource,
  mandateIdentity,
  runCaptures,
  type WireCapture,
} from "../watch-run-truth";

const [TURN_1, TURN_2] = fixture.captures as WireCapture[];
const ID_1 = TURN_1.request_id as string;
const ID_2 = TURN_2.request_id as string;

const requestWith = (captures: WireCapture[], over: Partial<ActiveRequest> = {}): ActiveRequest =>
  ({
    requestId: "client-1",
    conversationId: TURN_1.conversation_id,
    status: "streaming",
    timeline: captures.map((c) => ({ kind: "unknown", seq: 0, timestamp: "", originalEvent: "context_analysis", rawData: c })),
    ...over,
  }) as unknown as ActiveRequest;

describe("Watch AI shows one run's own data", () => {
  it("a capture from another request on the same wire is a nested run, never 'Call 2'", () => {
    const r = runCaptures([requestWith([TURN_1, TURN_2])], ID_1);
    expect(r.own.map((c) => c.requestId)).toEqual([ID_1]);
    expect(r.children.map((c) => c.requestId)).toEqual([ID_2]);
  });

  it("two turns a second apart in one conversation each show only their own call", () => {
    const one = runCaptures([requestWith([TURN_1], { requestId: "a" })], ID_1);
    const two = runCaptures([requestWith([TURN_2], { requestId: "b" })], ID_2);
    expect(one.own).toHaveLength(1);
    expect(two.own).toHaveLength(1);
    expect(one.own[0].requestId).toBe(ID_1);
    expect(two.own[0].requestId).toBe(ID_2);
  });

  it("a rejoin replay of the same call counts once", () => {
    const r = runCaptures([requestWith([TURN_1, TURN_1])], ID_1);
    expect(r.own).toHaveLength(1);
    expect(r.repeats).toBe(1);
  });

  it("a resume's second request is the same run: its calls join, labelled per attempt", () => {
    const retry = { ...TURN_1, attempt: 2 };
    const r = runCaptures([requestWith([TURN_1]), requestWith([retry], { requestId: "resumed" })], ID_1);
    expect(r.own.map((c) => [c.attempt, c.superseded])).toEqual([
      [1, true],
      [2, false],
    ]);
  });

  it("fewer recorded snapshots never replace the live capture; the gap is an error", () => {
    const second = { ...TURN_1, iteration: 2 };
    const own = runCaptures([requestWith([TURN_1, second])], ID_1).own;
    const snap = [{ id: "s1", iteration: 1, provider: "openai", requestPayload: { model: "gpt-5.4" }, responsePayload: { ok: 1 } }];
    const src = chooseRequestSource(own, snap);
    expect(src.source).toBe("live");
    expect(src.calls).toHaveLength(2);
    expect(src.calls[0].body).toEqual(TURN_1.body);
    expect(src.mismatch).toEqual({ captured: 2, recorded: 1 });
  });

  it("the recorded copy is shown only where no capture exists, and says so", () => {
    const snap = [{ id: "s1", iteration: 1, provider: "openai", requestPayload: { model: "gpt-5.4" }, responsePayload: null }];
    expect(chooseRequestSource([], snap).source).toBe("recorded");
    expect(chooseRequestSource([], []).source).toBe("none");
  });

  it("the mandate is the run's own frame — a frame naming another run, or none, is not", () => {
    const frame = { type: "mandate_run", mandate_key: "applets.build", door: "chat_start", request_id: ID_1 } as MandateRunData;
    expect(mandateIdentity([requestWith([], { mandateRun: frame })], null, ID_1)).toEqual({ frame, from: "stream" });
    expect(mandateIdentity([requestWith([], { mandateRun: frame })], null, ID_2).frame).toBeNull();
    // A continuation turn of a mandate conversation: no frame anywhere → not a mandate run.
    expect(mandateIdentity([requestWith([], { mandateRun: null })], null, ID_2)).toEqual({ frame: null, from: null });
    expect(mandateIdentity([], frame, ID_1)).toEqual({ frame, from: "record" });
  });
});
