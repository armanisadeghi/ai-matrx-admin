/**
 * RAW IS ONE BOX, FOCUSED OR NOT (Arman, 2026-10-11, on the agent builder's prompt boxes: "we don't
 * need to have it change when it loses focus since the editable version is also now pretty").
 *
 * Raw used to be two components: the textarea while it had the caret, and a highlighted display
 * view the moment it lost focus (a click swapped back). The break this catches: any blur handler
 * that takes the box out of its textarea again — for the system prompt AND a user/assistant message.
 *
 * The real MessageItem / SystemMessage over a real agent-definition store. Stubbed: the page's
 * canvas, menu, toolbar and model hooks around the box (none of them decide which box shows), and
 * the view-mode dropdown, replaced by one button that picks Raw through the same onChange.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

jest.mock("@/features/canvas/host/toolCanvas", () => ({ useToolOpener: () => () => undefined }));
jest.mock("@/features/canvas/host/agent/agentEditHistoryKind", () => ({ agentEditHistoryInput: {} }));
jest.mock("@/features/ai-models/hooks/useModels", () => ({ useModelFull: () => null }));
jest.mock("@/features/agents/hooks/useAgentUndoRedo", () => ({
  useAgentUndoRedo: () => ({ canUndo: false, canRedo: false, undo: () => undefined, redo: () => undefined, undoHint: "", redoHint: "" }),
}));
jest.mock("@/features/agents/hooks/useAgentBuilderSurfaceScope", () => ({ useAgentBuilderSurfaceScope: () => () => ({}) }));
jest.mock("@/features/agents/components/builder/message-builders/agentPromptMenu", () => ({
  agentPromptMenuSections: () => [],
  useAgentBuilderMenuActions: () => ({}),
}));
jest.mock("@/features/prompt-blocks/usePromptBlockEditing", () => ({
  usePromptBlockEditing: () => ({
    nodes: null,
    highlight: null,
    menuProps: {},
    toolbarButton: null,
    noteTyping: () => undefined,
    menuSections: () => [],
  }),
}));
jest.mock("@ai-matrx/context-menu/react", () => ({
  EditableContextMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock("@/features/agents/components/builder/message-builders/MessageItemButtons", () => ({ MessageItemButtons: () => null }));
jest.mock("@/features/agents/components/builder/message-builders/system-instructions/SystemMessageButtons", () => ({
  SystemMessageButtons: () => null,
}));
jest.mock("@/features/agents/components/builder/message-builders/system-instructions/SystemPromptOptimizer", () => ({
  SystemPromptOptimizer: () => null,
}));
jest.mock("@/features/agents/components/builder/message-builders/PromptAssist", () => ({
  PromptWriteBox: () => <div data-testid="prompt-write-box" />,
  insertPromptText: () => undefined,
  PromptFormatButtons: () => null,
  goToBuilderSection: () => undefined,
  usePromptInsertSources: () => ({ variables: [], kinds: null, kindSchema: () => null, contextItems: [], loadKinds: () => undefined }),
}));
jest.mock("@/features/agents/components/builder/message-builders/AddBlockButton", () => ({
  BlockList: () => null,
  offeredBlockTypes: () => [],
}));
jest.mock("@ai-matrx/rich-editor/format/PromptInsertMenu", () => ({ PromptInsertMenu: () => null }));
jest.mock("@ai-matrx/rich-editor/format/PromptFixReview", () => ({ PromptFixReview: () => null }));
jest.mock("@ai-matrx/rich-editor/format/useTextareaFormatting", () => ({ useTextareaFormatting: () => undefined }));
jest.mock("@ai-matrx/chat/agents/message-flags/MessageFlagToggles", () => ({ MessageFlagToggles: () => null }));
jest.mock("@/features/agents/message-flags/useMessageFlags", () => ({
  useMessageFlags: () => ({ flags: [], states: {}, onToggle: () => undefined }),
}));
jest.mock("@ai-matrx/rich-content/levels/RichContent", () => ({ RichContent: () => null }));
jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: () => null,
  SelectItem: () => null,
  SelectTriggerLegacy: () => null,
  SelectValue: () => null,
}));
jest.mock("@/features/agents/components/builder/message-builders/MessageViewModeMenu", () => {
  const actual = jest.requireActual("@/features/agents/components/builder/message-builders/MessageViewModeMenu");
  return {
    ...actual,
    // The dropdown's Raw item, as one button: the same onChange the menu calls ("edit" puts the caret in).
    MessageViewModeMenu: ({ onChange }: { onChange: (mode: string) => void }) => (
      <button type="button" data-test-pick-raw onClick={() => onChange("edit")}>
        Raw
      </button>
    ),
  };
});

import { agentDefinitionWithBuilderReducer } from "@/features/agents/redux/agent-builder.slice";
import { mergePartialAgent } from "@ai-matrx/chat/agents/redux/agent-definition/slice";
import { MessageItem } from "../message-builders/MessageItem";
import { SystemMessage } from "../message-builders/system-instructions/SystemMessage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const AGENT_ID = "4b8e2f61-9c3d-4a7e-b5f2-1d6c9e0a3b47";
const SYSTEM = "You are the front desk at Harbor Dental.\n\n## Booking\nOffer the next two open slots for {{situation}}.";
const USER = "I chipped a tooth on {{situation}} and need to come in this week.";

function makeStore() {
  const store = configureStore({
    reducer: { agentDefinition: agentDefinitionWithBuilderReducer },
    middleware: (gdm) => gdm({ serializableCheck: false, immutableCheck: false }),
  });
  store.dispatch(
    mergePartialAgent({
      id: AGENT_ID,
      name: "Harbor Dental front desk",
      variableDefinitions: [{ name: "situation" }],
      tools: [],
      messages: [
        { role: "system", content: [{ type: "text", text: SYSTEM }] },
        { role: "user", content: [{ type: "text", text: USER }] },
      ],
    } as unknown as Parameters<typeof mergePartialAgent>[0]),
  );
  return store;
}

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

it.each([
  ["the system prompt", () => <SystemMessage agentId={AGENT_ID} />, SYSTEM],
  ["a user message", () => <MessageItem agentId={AGENT_ID} messageIndex={1} />, USER],
])("Raw on %s stays the same textarea after it loses focus", (_label, element, text) => {
  const store = makeStore();
  act(() => root.render(<Provider store={store}>{element()}</Provider>));
  act(() => (container.querySelector("[data-test-pick-raw]") as HTMLButtonElement).click());
  const box = container.querySelector("textarea");
  expect(box?.value).toBe(text);
  act(() => {
    box!.focus();
    box!.blur();
  });
  // Let any deferred blur work (the context-menu guard's timeout) run.
  act(() => jest.runOnlyPendingTimers());
  const after = container.querySelector("textarea");
  expect(after).toBe(box);
  expect(after?.value).toBe(text);
});

beforeAll(() => jest.useFakeTimers());
afterAll(() => jest.useRealTimers());
