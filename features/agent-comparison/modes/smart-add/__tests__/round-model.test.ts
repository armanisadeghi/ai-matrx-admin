/**
 * The real-round bench's parsing and scoring, on the shapes the live round produced
 * (run 075eef1c, 2026-10-16: holder outputs, conversation variables, decision answers).
 */
import {
  buildItems,
  buildRoundSetup,
  costlyMiss,
  emptyRoundBench,
  holderEntity,
  holderIdentity,
  holderPayload,
  holderWeThink,
  jevAnswer,
  jevLabel,
  questionOptions,
  readDecisionCell,
  readJevRun,
  readRoundBench,
  readSteps,
  roundCellsToRun,
  roundInputs,
  scoreRound,
  unreadableSteps,
  type RoundBench,
  type RoundEvent,
  type RoundItem,
} from "../round-model";
import { readBench } from "../model";
import type { MatrixCell } from "../../matrix/types";

const md = (json: string) => [{ __kind: "markdown", text: "```json\n" + json + "\n```" }];

const ev = (p: Partial<RoundEvent>): RoundEvent => ({
  node_id: null,
  event_type: "node_started",
  duration_ms: null,
  error_message: null,
  conversation_id: null,
  failed_conversation_id: null,
  cost_usd: null,
  content: null,
  ...p,
});

const CANDIDATE =
  "Platform:\nlinkedin\n\nHandle:\nlindsay-ostrom-1587b858\n\nAddress:\nhttps://www.linkedin.com/in/lindsay-ostrom-1587b858\n\nName the search result shows:\nLindsay Ostrom";

const WE_CANDIDATES = JSON.stringify({
  items: [
    { key: "social:linkedin:a", url: "https://www.linkedin.com/in/a", type: "account", display_name: "Lindsay A", snippet: "Recruiter" },
    { key: "social:instagram:pinchofyum", url: "https://instagram.com/pinchofyum", type: "account", display_name: "Pinch of Yum" },
  ],
});

const EVENTS: RoundEvent[] = [
  ev({ node_id: "we_think", event_type: "node_started" }),
  ev({
    node_id: "we_think",
    event_type: "node_completed",
    duration_ms: 7163,
    content: [
      {
        __kind: "brand_we_think",
        suggestions: [
          { key: "social:linkedin:a", choice: "ask_later", probability: 0.5, relation_key: null },
          { key: "social:instagram:pinchofyum", choice: "preferred", probability: 0.9, relation_key: null },
        ],
      },
    ],
  }),
  ev({ node_id: "we_think", event_type: "node_cost", conversation_id: "conv-we", cost_usd: 0.0075 }),
  ev({ node_id: "identity_match_1", event_type: "node_started" }),
  ev({
    node_id: "identity_match_1",
    event_type: "node_failed",
    error_message: "This agent spent more than its approval limit last time, so it was not run.",
    failed_conversation_id: "conv-id1",
  }),
  ev({ node_id: "identity_match_2", event_type: "node_completed", duration_ms: 5000, content: md('{"is_this_us":{"answer":"no","probability":0.9},"relation":{"answer":"none_of_these","probability":0.8}}') }),
  ev({ node_id: "identity_match_2", event_type: "node_cost", conversation_id: "conv-id2", cost_usd: 0.0277 }),
  ev({ node_id: "entity_kind", event_type: "node_completed", duration_ms: 71259, content: md('{"entity_kind": "person_with_business", "probability": 0.8}') }),
  ev({ node_id: "entity_kind", event_type: "node_cost", conversation_id: "conv-ek", cost_usd: 0.0436 }),
  ev({ node_id: "probe", event_type: "node_completed" }),
];

const VARS = new Map<string, Record<string, unknown>>([
  ["conv-we", { candidates: WE_CANDIDATES, known_facts: "Confirmed by the person:\n- name: Lindsay Ostrom", confirmed_identity: "Website confirmed as ours:\npinchofyum.com", exclusions: "[NONE]", __agent_user_input__: "" }],
  ["conv-id1", { candidate: CANDIDATE, known_brand: "Confirmed by the person: {}", rules_read: "Fixed rules say:\nlikely", __agent_user_input__: "" }],
  ["conv-id2", { candidate: CANDIDATE.replace("1587b858", "28358329"), known_brand: "kb", rules_read: "rr" }],
  ["conv-ek", { known_facts: "kf", profiles: "", rules_read: "rr", site_identity: "", started_as: "person", what_was_typed: "" }],
]);

const BRAND = { website: "pinchofyum.com", name: "Pinch of Yum", place: "Minneapolis", accounts: "instagram.com/pinchofyum", entryKind: "person" as const };

function captured(): RoundBench {
  const steps = readSteps(EVENTS);
  return {
    ...emptyRoundBench(),
    brand: BRAND,
    runId: "run-1",
    agents: { identity: "jev-id", entity: "jev-ek", we_think: "jev-we" },
    captured: true,
    holderCalls: steps.map((s) => s.call),
    items: buildItems(steps, VARS, BRAND),
  };
}

describe("round inputs", () => {
  it("confirms what the person typed, as Smart Add does", () => {
    const inputs = roundInputs(BRAND);
    expect(inputs.website).toBe("https://pinchofyum.com");
    expect(inputs.entry_kind).toBe("person");
    expect(inputs.confirmed).toEqual({
      name: "Pinch of Yum",
      domain: "pinchofyum.com",
      location: "Minneapolis",
      handles: ["pinchofyum"],
      links: ["instagram.com/pinchofyum", "https://pinchofyum.com"],
    });
    expect(inputs.woken).toEqual({ name: "Pinch of Yum", location: "Minneapolis" });
    expect(inputs.socials).toEqual([{ handle_or_url: "instagram.com/pinchofyum" }]);
  });
});

describe("reading the holder", () => {
  it("reads a fenced JSON answer and a kind block", () => {
    expect(holderPayload(md('{"entity_kind":"business"}'))).toEqual({ entity_kind: "business" });
    expect(holderPayload([{ __kind: "brand_we_think", suggestions: [] }])).toEqual({ __kind: "brand_we_think", suggestions: [] });
    expect(holderPayload([{ __kind: "markdown", text: "no json here" }])).toBeNull();
  });

  it("maps identity yes / no / unanswerable", () => {
    expect(holderIdentity({ is_this_us: { answer: "yes", probability: 0.9 } })?.value).toBe("ours");
    expect(holderIdentity({ is_this_us: { answer: "no" }, relation: { answer: "founder" } })).toMatchObject({ value: "not_ours", detail: "founder" });
    expect(holderIdentity({ is_this_us: { answer: "unanswerable", probability: null } })?.value).toBe("cant_tell");
  });

  it("maps entity kinds; anything else cannot tell", () => {
    expect(holderEntity({ entity_kind: "person_with_business" })?.value).toBe("person_with_business");
    expect(holderEntity({ entity_kind: "needs_person" })?.value).toBe("cant_tell");
  });

  it("maps we-think choices: preferred and alias are ours", () => {
    const m = holderWeThink({ suggestions: [{ key: "a", choice: "preferred" }, { key: "b", choice: "alias" }, { key: "c", choice: "related", relation_key: "founder" }] });
    expect(m.get("a")?.value).toBe("ours");
    expect(m.get("b")?.value).toBe("ours");
    expect(m.get("c")).toMatchObject({ value: "related", detail: "related · founder" });
  });
});

describe("capturing a round", () => {
  it("reads every judgment step: status, conversation, time, cost", () => {
    const calls = readSteps(EVENTS).map((s) => s.call);
    expect(calls.map((c) => c.step)).toEqual(["identity_match_1", "identity_match_2", "entity_kind", "we_think"]);
    expect(calls[0]).toMatchObject({ status: "failed", conversationId: "conv-id1", cost: 0 });
    expect(calls[0].error).toMatch(/approval limit/);
    expect(calls[1]).toMatchObject({ status: "completed", conversationId: "conv-id2", durationMs: 5000, cost: 0.0277 });
  });

  it("builds items with the holder's own variables, a failed holder step still replayable", () => {
    const b = captured();
    expect(b.items.map((i) => i.id)).toEqual([
      "identity:identity_match_1",
      "identity:identity_match_2",
      "entity",
      "we:social:linkedin:a",
      "we:social:instagram:pinchofyum",
    ]);
    const id1 = b.items[0];
    expect(id1.holder).toBeNull();
    expect(id1.variables).toEqual({ candidate: CANDIDATE, known_brand: "Confirmed by the person: {}", rules_read: "Fixed rules say:\nlikely" });
    expect(id1.title).toBe("Lindsay Ostrom");
    expect(id1.url).toBe("https://www.linkedin.com/in/lindsay-ostrom-1587b858");
    expect(b.items[1].holder?.value).toBe("not_ours");
    expect(Object.keys(b.items[2].variables).sort()).toEqual(["known_facts", "profiles", "rules_read", "site_identity", "started_as", "what_was_typed"]);
    const we = b.items[4];
    expect(we.holder?.value).toBe("ours");
    expect(JSON.parse(we.variables.item).key).toBe("social:instagram:pinchofyum");
    expect(we.variables.brand_context).toContain("What I've said is NOT us:\n[NONE]");
  });

  it("names steps whose inputs cannot be read instead of dropping them", () => {
    const steps = readSteps([...EVENTS, ev({ node_id: "identity_match_3", event_type: "node_completed", content: md("{}") })]);
    expect(unreadableSteps(steps, VARS)).toEqual(["identity_match_3"]);
    expect(buildItems(steps, VARS, BRAND).some((i) => i.step === "identity_match_3")).toBe(false);
  });

  it("clears an earlier failure when the step is retried and finishes", () => {
    const call = readSteps([
      ev({ node_id: "entity_kind", event_type: "node_failed", error_message: "boom" }),
      ev({ node_id: "entity_kind", event_type: "node_completed", duration_ms: 10, content: md('{"entity_kind":"business"}') }),
    ])[0].call;
    expect(call).toMatchObject({ status: "completed", error: null });
  });

  it("puts each item on its own Jev agent, one cell each", () => {
    const setup = buildRoundSetup(captured());
    expect(setup.rows.variants[0].patch.agent_id).toBe("jev-id");
    expect(setup.rows.variants[2].patch.agent_id).toBe("jev-ek");
    expect(setup.rows.variants[4].patch.agent_id).toBe("jev-we");
    expect(setup.columns.variants).toEqual([{ id: "jev", label: "Jev", patch: {} }]);
    expect(roundCellsToRun(setup)).toHaveLength(5);
  });

  it("is told apart from a wide-net bench", () => {
    const meta = { smart_add_bench: captured() as unknown as Record<string, unknown> };
    expect(readRoundBench(meta)?.items).toHaveLength(5);
    expect(readRoundBench({ smart_add_bench: { brand: {} } })).toBeNull();
    expect(readBench(meta)).not.toBeNull(); // the wide-net page checks isRoundMetadata first
  });
});

describe("reading Jev", () => {
  it("reads P(yes) for is_this_us whatever answer is shown, cut at 0.65 / 0.35", () => {
    const cell = (p: number, a: boolean) =>
      JSON.stringify({ __kind: "decision_answers", answers: { is_this_us: { answer: a, probability: p }, relation: { answer: "founder" } } });
    expect(jevAnswer("identity", readDecisionCell(cell(0.04, false)))).toMatchObject({ value: "not_ours", probability: 0.04, detail: "founder" });
    expect(jevAnswer("identity", readDecisionCell(cell(0.9, true)))?.value).toBe("ours");
    expect(jevAnswer("identity", readDecisionCell(cell(0.5, true)))?.value).toBe("cant_tell");
    expect(jevAnswer("identity", readDecisionCell(cell(0.65, false)))?.value).toBe("ours");
  });

  it("falls back to P(answer) when the store has no P(yes)", () => {
    expect(jevAnswer("identity", { is_this_us: { answer: "false", probability: null, pAnswer: 0.96 } })?.probability).toBeCloseTo(0.04);
  });

  it("maps entity_kind and we-think verdicts", () => {
    expect(jevAnswer("entity", { entity_kind: { answer: "needs_person", probability: null, pAnswer: 0.96 } })?.value).toBe("cant_tell");
    expect(jevAnswer("we_think", { verdict: { answer: "alias", probability: null, pAnswer: 0.8 } })?.value).toBe("ours");
    expect(jevAnswer("we_think", null)).toBeNull();
  });

  it("reads cells, using the answer store when a cell has no text", () => {
    const b = captured();
    const cell = (rowId: string, conv: string, answer: string | undefined): MatrixCell => ({
      entryId: rowId, conversationId: conv, rowId, columnId: "jev", repeat: 0, status: "completed", stalled: false,
      attempt: 1, startedAt: null, finishedAt: null, error: null, request: null, history: [],
      result: { answer, duration_ms: 1200, cost: 0.0001 },
    });
    const run = readJevRun(
      [cell("entity", "c1", JSON.stringify({ answers: { entity_kind: { answer: "person" } } })), cell("we:social:linkedin:a", "c2", undefined)],
      b.items,
      new Map([["c2", { verdict: { answer: "not_us", probability: null, pAnswer: 0.9 } }]]),
    );
    expect(run.answers.get("entity")?.value).toBe("person");
    expect(run.answers.get("we:social:linkedin:a")?.value).toBe("not_us");
    expect(run.durations.get("entity")).toBe(1200);
  });
});

describe("the scoreboard", () => {
  it("counts right, wrong, can't tell, no answer and the costly misses against truth only", () => {
    const items: RoundItem[] = ["a", "b", "c", "d", "e"].map((id) => ({
      id, judgment: "we_think", title: id, url: null, detail: "", variables: {}, step: "we_think", holder: null,
    }));
    const said: Record<string, string | undefined> = { a: "ours", b: "ours", c: "ask_later", d: "not_us" };
    const truth = { a: { value: "ours" }, b: { value: "not_us" }, c: { value: "ours" }, d: { value: "ours" }, e: { value: "related" } };
    const sc = scoreRound("we_think", items, truth, (i) => (said[i.id] ? { value: said[i.id] as string, detail: null, probability: null } : null), [
      { durationMs: 100, cost: 0.01 },
      { durationMs: 300, cost: 0.02 },
    ]);
    expect(sc).toMatchObject({ marked: 5, right: 1, wrong: 2, cantTell: 1, missing: 1, costly: [1, 1], calls: 2 });
    expect(sc.cost).toBeCloseTo(0.03);
    expect(sc.p50).toBe(300);
  });

  it("ask later is right when the person also says ask later", () => {
    const items: RoundItem[] = [{ id: "x", judgment: "we_think", title: "x", url: null, detail: "", variables: {}, step: "we_think", holder: null }];
    const sc = scoreRound("we_think", items, { x: { value: "ask_later" } }, () => ({ value: "ask_later", detail: null, probability: null }), []);
    expect(sc.right).toBe(1);
  });

  it("names the costly misses per judgment", () => {
    expect(costlyMiss("identity", "ours", "not_ours")).toBe(0);
    expect(costlyMiss("identity", "not_ours", "ours")).toBe(1);
    expect(costlyMiss("entity", "business", "person_with_business")).toBe(0);
    expect(costlyMiss("entity", "person", "business")).toBe(1);
    expect(costlyMiss("entity", "person", "person_with_business")).toBeNull();
  });
});

describe("labels and questions", () => {
  it("labels is_this_us as true/false and adds the relation when not ours", () => {
    expect(jevLabel("identity", { value: "ours" })).toEqual([{ question: "is_this_us", answer: "true" }]);
    expect(jevLabel("identity", { value: "not_ours", relation: "founder" })).toEqual([
      { question: "is_this_us", answer: "false" },
      { question: "relation", answer: "founder" },
    ]);
    expect(jevLabel("we_think", { value: "related" })).toEqual([{ question: "verdict", answer: "related" }]);
  });

  it("reads a question's options from the agent's decision_questions part", () => {
    const messages = [
      { role: "user", content: [{ type: "text", text: "x" }, { type: "decision_questions", questions: [{ name: "relation", criteria: { founder: "f", none_of_these: "n" } }] }] },
    ];
    expect(questionOptions(messages, "relation")).toEqual(["founder", "none_of_these"]);
    expect(questionOptions(messages, "missing")).toEqual([]);
  });
});
