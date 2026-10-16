/**
 * Agent Evaluation — manual-door parity (PLAN §5.3, CONTRACT door `manual`).
 *
 * The server's test runner (aidream `services/agent_tests/doors.py::build_manual_body`) calls
 * `POST /ai/manual` the way the Agent Builder's Test run does. This test proves the two bodies
 * are the same: for every case in the golden file the runner emitted, the Builder's own
 * `assembleManualRequest` must produce exactly `expected` (conversation_id masked).
 *
 * The golden file is a copy of aidream's
 * `aidream/services/agent_tests/tests/fixtures/manual_door_golden.json`; a pytest there fails when
 * the two copies differ, and another fails when the runner stops producing it.
 */

let __uuidCounter = 0;
jest.mock("uuid", () => ({
  v4: () => `uuid-stub-${++__uuidCounter}`,
}));

jest.mock(
  "@ai-matrx/chat/agents/redux/execution-system/client-capabilities/desktop-presence",
  () => ({
    ...jest.requireActual(
      "@ai-matrx/chat/agents/redux/execution-system/client-capabilities/desktop-presence",
    ),
    getLiveDesktopInstance: jest.fn().mockResolvedValue(null),
  }),
);

import { assembleManualRequest } from "@ai-matrx/chat/agents/redux/execution-system/thunks/execute-manual-instance.thunk";
import creatorDebugReducer from "@/lib/redux/preferences/creatorDebugSlice";
import adminPreferencesReducer from "@/lib/redux/preferences/adminPreferencesSlice";
import userPreferencesReducer from "@/lib/redux/preferences/userPreferencesSlice";
import { editorStateReducer } from "@/features/code-editor/redux/editor-state.slice";
import appContextReducer from "@/lib/redux/slices/appContextSlice";
import { initialChatHostState } from "@ai-matrx/chat/store/chat-host.slice";
import type { ChatRootState } from "@ai-matrx/chat/store/root-state";
import { _resetChatHostForTests, configureChat } from "@ai-matrx/chat/host/configure";
import { createFakeDb } from "@ai-matrx/chat/testing/fake-db";
import golden from "./fixtures/agent-test-manual-door-golden.json";

type GoldenCase = {
  id: string;
  agent: {
    model_id: string;
    messages: Array<{ role: string; content: unknown }>;
    settings: Record<string, unknown>;
    variable_definitions: Array<Record<string, unknown>>;
    prompt_blocks?: string[];
  };
  variables: Record<string, unknown>;
  user_text: string;
  turn: number;
  expected: Record<string, unknown>;
};

const AGENT_ID = golden.agent_id;
const CONVERSATION_ID = "conv-local";
const SERVER_CONVERSATION_ID = "conv-server";

/** The Builder's state for one golden case: the live agent definition, the person's values,
 * the typed text, and (turn 2) one earlier turn on a stored server conversation. */
function stateFor(c: GoldenCase): ChatRootState {
  const organizationId = golden.organization_id;
  const continued = c.turn > 1;
  const history = continued
    ? [
        { id: "m1", role: "user", content: [{ type: "text", text: "earlier" }] },
        { id: "m2", role: "assistant", content: [{ type: "text", text: "earlier answer" }] },
      ]
    : [];
  const byId: Record<string, unknown> = {};
  for (const m of history) {
    byId[m.id] = {
      id: m.id,
      conversationId: CONVERSATION_ID,
      agentId: AGENT_ID,
      role: m.role,
      content: m.content,
      contentHistory: null,
      userContent: null,
      position: 0,
      source: "test",
      status: "active",
      isVisibleToModel: true,
      isVisibleToUser: true,
      metadata: {},
      createdAt: new Date().toISOString(),
      deletedAt: null,
    };
  }
  return {
    conversations: {
      byConversationId: {
        [CONVERSATION_ID]: {
          conversationId: CONVERSATION_ID,
          agentId: AGENT_ID,
          agentType: "user",
          origin: "manual",
          sourceFeature: undefined,
          sourceApp: undefined,
          status: "idle",
          isEphemeral: false,
          initialAgentVersionId: null,
          organizationId: null,
          cacheOnly: true,
          manualServerConversationId: continued ? SERVER_CONVERSATION_ID : undefined,
        },
      },
      allConversationIds: [CONVERSATION_ID],
    },
    agentDefinition: {
      agents: {
        [AGENT_ID]: {
          id: AGENT_ID,
          modelId: c.agent.model_id,
          messages: c.agent.messages,
          tools: [],
          customTools: [],
          mcpServers: [],
          settings: c.agent.settings,
          variableDefinitions: c.agent.variable_definitions,
          contextPolicies: [],
          parentAgentId: null,
          isVersion: false,
          promptBlocks: c.agent.prompt_blocks ?? [],
          _loadedFields: { variableDefinitions: true },
        },
      },
    },
    instanceUIState: {
      byConversationId: {
        [CONVERSATION_ID]: { showPreExecutionGate: false, preExecutionSatisfied: true },
      },
    },
    messages: {
      byConversationId: {
        [CONVERSATION_ID]: {
          conversationId: CONVERSATION_ID,
          apiEndpointMode: "manual",
          byId,
          orderedIds: history.map((m) => m.id),
          title: null,
          description: null,
          keywords: null,
        },
      },
    },
    instanceUserInput: {
      byConversationId: { [CONVERSATION_ID]: { text: c.user_text, messageParts: undefined } },
    },
    instanceResources: { byConversationId: {} },
    instanceContext: { byConversationId: {} },
    instanceVariableValues: {
      byConversationId: {
        [CONVERSATION_ID]: {
          conversationId: CONVERSATION_ID,
          definitions: c.agent.variable_definitions,
          userValues: c.variables,
          scopeValues: {},
        },
      },
    },
    instanceClientTools: { byConversationId: {} },
    creatorDebug: creatorDebugReducer(undefined, { type: "@@INIT" }),
    editorState: editorStateReducer(undefined, { type: "@@INIT" }),
    appContext: {
      ...appContextReducer(undefined, { type: "@@INIT" }),
      organization_id: organizationId,
    },
    chatHost: { ...initialChatHostState, org: { id: organizationId, name: null } },
    adminPreferences: adminPreferencesReducer(undefined, { type: "@@INIT" }),
    instanceModelOverrides: { byConversationId: {}, turnOnlyByConversationId: {} },
    userPreferences: userPreferencesReducer(undefined, { type: "@@INIT" }),
  } as unknown as ChatRootState;
}

/** Keys the Builder adds that describe the browser, not the agent run: the runner has no page,
 * no withheld context and no client tools. Anything else that differs fails the test. */
const CLIENT_ONLY_KEYS = new Set([
  "context_withheld",
  "page_context",
  "context_surfaces",
  "client",
  "tools_replace",
  "source_app",
  "source_feature",
]);

function comparable(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (CLIENT_ONLY_KEYS.has(k)) continue;
    if (v === undefined) continue;
    out[k] = golden.masked.includes(k) ? "<masked>" : v;
  }
  return out;
}

describe("agent tests: the runner's manual door body equals the Builder's", () => {
  beforeEach(() => {
    _resetChatHostForTests();
    configureChat({ db: createFakeDb().db });
  });

  for (const c of golden.cases as GoldenCase[]) {
    test(c.id, async () => {
      const body = await assembleManualRequest(stateFor(c), CONVERSATION_ID);
      expect(body).not.toBeNull();
      expect(comparable(body as unknown as Record<string, unknown>)).toEqual(c.expected);
      if (c.turn > 1) expect((body as { conversation_id: string }).conversation_id).toBe(SERVER_CONVERSATION_ID);
    });
  }
});
