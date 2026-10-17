/**
 * THE PEEK'S "TEST VALUE" IS WHAT THE TEST PANEL SHOWS (live defect, 2026-10-17).
 *
 * The prompt boxes read only the values the person had TYPED into the Test panel. A Dropdown that
 * showed "bug" (its default) in the panel read "No value yet" in the Peek, no chip picked. The boxes
 * now read the panel's merged values (typed, else context, else default) from the conversation the
 * panel's composer is bound to — the real chat store, the real hook, the real Peek model.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { createChatStore } from "@ai-matrx/chat/store/create-chat-store";
import {
  initInstanceVariables,
  setUserVariableValues,
} from "@ai-matrx/chat/agents/redux/execution-system/instance-variable-values/instance-variable-values.slice";
import { setInputFocus } from "@ai-matrx/chat/agents/redux/execution-system/conversation-focus/conversation-focus.slice";
import { variablePeekModel } from "@ai-matrx/rich-content/display/chat-markdown/matrx-variables/VariablePeek";
import { variableNeedsValue } from "@ai-matrx/rich-content/editor/core/variables";

jest.mock("@/components/cost/pointsRate", () => ({ currentPointsRate: () => 20_000 }));
jest.mock("@/features/scopes/service/associationsService", () => ({ associationsService: {} }));
jest.mock("@/features/agents/run-review/responseFeedbackService", () => ({ fetchLatestFeedback: jest.fn() }));
jest.mock("@/features/content-ir/registry/kind-catalog", () => ({
  catalogResolver: () => null,
  listAllKinds: () => [],
  listCompiledKinds: () => [],
}));
jest.mock("@ai-matrx/context-menu/react", () => ({ EditableContextMenu: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock("@ai-matrx/rich-content/editor/editor/RichEditor", () => ({ __esModule: true, default: () => null }));

import { promptVariableDefinitions, useTestPanelValues } from "../message-builders/PromptAssist";

const AGENT = "6f0c1b8e-3c55-4b5e-9a0e-2d8f1f9a7c11";
const CONVERSATION = "22222222-2222-4222-8222-222222222222";

const DEFS = [
  { name: "filed_type", label: "Filed Type", defaultValue: "bug", required: true, customComponent: { type: "select", options: ["bug", "feature", "other"] } },
  { name: "route", label: "Route", defaultValue: "", required: true },
  { name: "comments", label: "Comments", defaultValue: "" },
] as never[];

function panel() {
  const store = createChatStore();
  store.dispatch(initInstanceVariables({ conversationId: CONVERSATION, definitions: DEFS as never }));
  store.dispatch(setInputFocus({ surfaceKey: `agent-builder:${AGENT}`, conversationId: CONVERSATION } as never));
  return store;
}

async function read(store: ReturnType<typeof panel>): Promise<Readonly<Record<string, unknown>> | null> {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  let seen: Readonly<Record<string, unknown>> | null = null;
  const Probe = () => {
    seen = useTestPanelValues(AGENT);
    return null;
  };
  const root = createRoot(document.createElement("div"));
  await act(async () => root.render(<Provider store={store as never}><Probe /></Provider>));
  await act(async () => root.unmount());
  return seen;
}

const peek = (values: Readonly<Record<string, unknown>> | null, name: string) => {
  const declared = promptVariableDefinitions(DEFS as never, [], undefined, values).find((d) => d.name === name)!;
  return { declared, model: variablePeekModel({ name, displayName: declared.label ?? name, state: "declared", declared, token: `{{${name}}}` } as never) };
};

it("a Dropdown the panel shows at its default is that value in the Peek, the chip picked", async () => {
  const values = await read(panel());
  expect(values).toMatchObject({ filed_type: "bug" });
  const { model } = peek(values, "filed_type");
  expect(model.previewLabel).toBe("Test value");
  expect(model.preview).toMatchObject({ kind: "choices", picked: ["bug"] });
});

it("a value the person typed wins over the default", async () => {
  const store = panel();
  store.dispatch(setUserVariableValues({ conversationId: CONVERSATION, values: { filed_type: "feature" } }));
  const { model } = peek(await read(store), "filed_type");
  expect(model.preview).toMatchObject({ kind: "choices", picked: ["feature"] });
});

it("a required variable with no value and no default is amber; one the panel fills is not", async () => {
  const values = await read(panel());
  expect(variableNeedsValue(peek(values, "route").declared)).toBe(true);
  expect(peek(values, "route").model.status).toMatchObject({ tone: "warning" });
  expect(variableNeedsValue(peek(values, "filed_type").declared)).toBe(false);
  const typed = panel();
  typed.dispatch(setUserVariableValues({ conversationId: CONVERSATION, values: { route: "https://aimatrx.com/data-v2" } }));
  expect(variableNeedsValue(peek(await read(typed), "route").declared)).toBe(false);
});

it("claims no value before the panel has a conversation", async () => {
  const store = createChatStore();
  expect(await read(store as never)).toBeNull();
  expect(variableNeedsValue(peek(null, "route").declared)).toBe(false);
});
