/**
 * The Agent Builder helper reads the whole agent and the whole test panel.
 *
 * Real use (Arman, 2026-10-13, "Brand Basics Fact Finder"): the helper beside
 * the builder saw a 200-char slice of the system prompt and none of the user
 * message template, and could not tell the run that already happened from what
 * the next Send would submit. These bundles are what it now reads in full.
 */

import { createChatStore } from "@ai-matrx/chat/store/create-chat-store";
import { mergePartialAgent, setAgentFetchStatus } from "@ai-matrx/chat/agents/redux/agent-definition/slice";
import {
  initInstanceVariables,
  setUserVariableValues,
  stampSubmittedFirstTurnValues,
} from "@ai-matrx/chat/agents/redux/execution-system/instance-variable-values/instance-variable-values.slice";
import { initInstanceUserInput, setUserInputText } from "@ai-matrx/chat/agents/redux/execution-system/instance-user-input/instance-user-input.slice";
import { hydrateMessages, type MessageRecord } from "@ai-matrx/chat/agents/redux/execution-system/messages/messages.slice";
import { setFocus, setInputFocus } from "@ai-matrx/chat/agents/redux/execution-system/conversation-focus/conversation-focus.slice";
import type { ChatRootState } from "@ai-matrx/chat/store/root-state";

jest.mock("@/components/cost/pointsRate", () => ({ currentPointsRate: () => 20_000 }));
jest.mock("@/features/scopes/service/associationsService", () => ({ associationsService: {} }));
jest.mock("@/features/agents/run-review/responseFeedbackService", () => ({ fetchLatestFeedback: jest.fn() }));

import {
  DEFINITION_BUNDLE_MAX,
  buildAgentDefinitionBundle,
  buildTestPanelBundle,
} from "../agentBuilderContextBundle";

const AGENT = "6f0c1b8e-3c55-4b5e-9a0e-2d8f1f9a7c11";
const RAN = "11111111-1111-4111-8111-111111111111";
const NEXT = "22222222-2222-4222-8222-222222222222";
const SYSTEM = "Final check before you answer:\n- Every fact has a real source & a <url>.";
const USER_TEMPLATE = "Find the basic facts for this brand.\nKNOWN BRAND NAME(S): {{brand_names}}";

function msg(id: string, conversationId: string, role: "user" | "assistant", text: string, position: number): MessageRecord {
  return {
    id,
    conversationId,
    agentId: AGENT,
    role,
    content: [{ type: "text", text }],
    contentHistory: null,
    userContent: null,
    position,
    source: "test",
    status: "complete",
    isVisibleToModel: true,
    isVisibleToUser: true,
    metadata: {},
    createdAt: new Date(2026, 9, 13, 12, position).toISOString(),
    deletedAt: null,
  } as MessageRecord;
}

function makeState(systemText = SYSTEM): ChatRootState {
  const store = createChatStore();
  store.dispatch(
    mergePartialAgent({
      id: AGENT,
      name: "Brand Basics Fact Finder",
      modelId: "gemini-3-8-flash",
      settings: { temperature: 0.2 },
      tools: [],
      autoToolsDisabled: false,
      autoContextDisabled: true,
      contextPolicies: [],
      variableDefinitions: [
        { name: "brand_names", defaultValue: "", required: true },
        { name: "evidence", defaultValue: "" },
      ],
      messages: [
        { role: "system", content: [{ type: "text", text: systemText }] },
        { role: "user", content: [{ type: "text", text: USER_TEMPLATE }] },
      ],
    } as Parameters<typeof mergePartialAgent>[0]),
  );
  store.dispatch(setAgentFetchStatus({ id: AGENT, status: "full" }));

  const defs = [
    { name: "brand_names", defaultValue: "", required: true },
    { name: "evidence", defaultValue: "" },
  ];
  // The run that already happened.
  store.dispatch(initInstanceVariables({ conversationId: RAN, definitions: defs }));
  store.dispatch(setUserVariableValues({ conversationId: RAN, values: { brand_names: "Full Spectrum Search Group" } }));
  store.dispatch(stampSubmittedFirstTurnValues({ conversationId: RAN } as never));
  store.dispatch(
    hydrateMessages({
      conversationId: RAN,
      messages: [
        msg("m1", RAN, "user", "Look them up please", 1),
        msg("m2", RAN, "assistant", '{"brand_name":"Full Spectrum Search Group"}', 2),
      ],
    }),
  );
  // The fresh composer the next Send submits.
  store.dispatch(initInstanceVariables({ conversationId: NEXT, definitions: defs }));
  store.dispatch(setUserVariableValues({ conversationId: NEXT, values: { brand_names: "Acme Staffing" } }));
  store.dispatch(initInstanceUserInput({ conversationId: NEXT } as never));
  store.dispatch(setUserInputText({ conversationId: NEXT, text: "Try the second brand" }));
  store.dispatch(setFocus({ surfaceKey: `agent-builder:${AGENT}`, conversationId: RAN }));
  store.dispatch(setInputFocus({ surfaceKey: `agent-builder:${AGENT}`, conversationId: NEXT } as never));
  return store.getState() as unknown as ChatRootState;
}

describe("agent builder bundles", () => {
  it("carries every message template verbatim, the switches, and NO TOOLS", () => {
    const bundle = buildAgentDefinitionBundle(makeState(), AGENT, null)!;
    expect(bundle).toContain(`<message index="0" role="system">${SYSTEM}</message>`);
    expect(bundle).toContain(`<message index="1" role="user">${USER_TEMPLATE}</message>`);
    expect(bundle).toContain("NO TOOLS");
    expect(bundle).toContain('automatic_injection="on"');
    expect(bundle).toContain('automatic_context="off"');
    expect(bundle).toContain('name="brand_names"');
    expect(bundle).toContain('required="true"');
  });

  it("stays under its inline ceiling when the prompt is huge, and says it clipped", () => {
    const bundle = buildAgentDefinitionBundle(makeState("x".repeat(200_000)), AGENT, null)!;
    expect(bundle.length).toBeLessThanOrEqual(DEFINITION_BUNDLE_MAX);
    expect(bundle).toContain('clipped="true"');
    expect(bundle).toContain('total_chars="200000"');
    expect(bundle).toContain(`<message index="1" role="user">${USER_TEMPLATE}</message>`);
  });

  it("separates what the last run was sent from what the next Send submits", () => {
    const bundle = buildTestPanelBundle(makeState(), AGENT, {
      rating: "up",
      overall: 4,
      scores: { accuracy: 5 },
      comment: null,
    })!;
    const next = bundle.slice(bundle.indexOf("<next_send"), bundle.indexOf("</next_send>"));
    const last = bundle.slice(bundle.indexOf("<last_run"), bundle.indexOf("</last_run>"));
    expect(next).toContain(`conversation_id="${NEXT}"`);
    expect(next).toContain("Acme Staffing");
    expect(next).toContain("<typed_text>Try the second brand</typed_text>");
    expect(next).not.toContain("Full Spectrum");
    expect(last).toContain(`conversation_id="${RAN}"`);
    expect(last).toContain("Full Spectrum Search Group");
    expect(last).toContain("Look them up please");
    expect(last).not.toContain("Acme Staffing");
    expect(last).toContain('thumbs="up"');
    expect(last).toContain('overall_of_5="4"');
  });
});
