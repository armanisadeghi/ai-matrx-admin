import {
  decisionQuestionPayload,
  newQuestion,
  criteriaRowsAsJson,
  questionErrors,
  type DecisionQuestion,
} from "./decision-form";
import { decisionRequestFor } from "./decision-api";
import { readDecisionResult } from "./decision-result";

const choiceQuestion: DecisionQuestion = {
  id: "choice-id",
  name: "route",
  type: "choice",
  instructions: "Choose the best route.",
  instructionsMode: "text",
  instructionsJson: "{}",
  criteriaMode: "rows",
  criteriaJson: "{}",
  criteria: [
    { key: "ship", description: "Ship it" },
    { key: "hold", description: "Wait" },
  ],
};

describe("native decision request contract", () => {
  it("rejects invalid JSON Choice and Noul schemas before a request can spend", () => {
    const invalidChoice: DecisionQuestion = {
      ...choiceQuestion,
      criteriaMode: "json",
      criteriaJson: '{"": "missing key"}',
    };
    const invalidNoul: DecisionQuestion = {
      ...choiceQuestion,
      type: "noul",
      criteriaMode: "json",
      criteriaJson: '{"true": "yes", "maybe": "no"}',
      criteria: { true: "yes", false: "no" },
    };

    expect(questionErrors([invalidChoice])).toContain(
      "“route” needs at least two named choices.",
    );
    expect(questionErrors([invalidNoul])).toContain(
      "“route” Noul criteria must contain exactly “true” and “false”.",
    );
  });

  it("preserves an offering pin as offering_id and nulls blank option descriptions", () => {
    const payload = decisionQuestionPayload({
      ...choiceQuestion,
      criteria: [
        { key: "ship", description: "" },
        { key: "hold", description: "Wait" },
      ],
    });
    expect(payload).toEqual({
      type: "choice",
      instructions: "Choose the best route.",
      criteria: { ship: null, hold: "Wait" },
    });
    expect(
      decisionRequestFor({
        model: "jev-1.13.0",
        offeringId: "offering-1",
        state: { customer: "A" },
        questions: { route: payload ?? {} },
      }),
    ).toMatchObject({ offering_id: "offering-1" });
  });

  it("keeps every returned answer shape, including score legends", () => {
    const result = readDecisionResult({
      type: "decision_result",
      execution_id: "execution-1",
      request_id: "request-1",
      provider_request_id: null,
      model: "jev-1.13.0",
      answers: {
        route: {
          type: "choice",
          choice: "ship",
          probabilities: { ship: 0.8, hold: 0.2 },
          confidence: 0.8,
        },
        priority: {
          type: "score",
          score: 2,
          probabilities: { low: 0.1, high: 0.9 },
          confidence: 0.9,
          legend: { 2: { label: "High" } },
        },
        proceed: { type: "noul", noul: 1 },
      },
      usage: { input_tokens: 12, output_tokens: 8 },
      cost_usd: 0.00001,
      offering_id: "offering-1",
      route: "native",
    });
    expect(result?.answers.priority).toMatchObject({
      type: "score",
      legend: { 2: { label: "High" } },
    });
    expect(result?.requestId).toBe("request-1");
  });
});

describe("adding questions", () => {
  // A second question used to reuse the first one's name ("decision"), which
  // the duplicate-name check then refused with no way out.
  it("gives every new question a name no other question has", () => {
    const first = newQuestion("choice");
    const second = newQuestion("choice", [first]);
    const third = newQuestion("choice", [first, second]);
    expect(new Set([first.name, second.name, third.name]).size).toBe(3);
    expect(questionErrors([first, second, third]).some((message) => message.includes("repeated"))).toBe(false);
  });
  it("says a question is needed when there are none", () => {
    expect(questionErrors([])).toContain("Add at least one question.");
  });
});

describe("score levels and the JSON view", () => {
  it("drops a blank level instead of sending an empty string", () => {
    const base = newQuestion("score");
    if (base.type !== "score") throw new Error("expected a score question");
    const score: DecisionQuestion = { ...base, instructions: "Rate it", criteria: ["low", "", "high"] };
    expect(decisionQuestionPayload(score)?.criteria).toEqual(["low", "high"]);
  });
  it("shows the typed options when switching rows to JSON", () => {
    const base = newQuestion("choice");
    if (base.type !== "choice") throw new Error("expected a choice question");
    const choice: DecisionQuestion = { ...base, criteria: [{ key: "approve", description: "" }, { key: "deny", description: "Not eligible" }] };
    expect(JSON.parse(criteriaRowsAsJson(choice))).toEqual({ approve: null, deny: "Not eligible" });
  });
});
