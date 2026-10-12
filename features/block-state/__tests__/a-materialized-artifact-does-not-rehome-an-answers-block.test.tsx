/**
 * @jest-environment jsdom
 *
 * A questionnaire answered in a chat reply keeps its answers across a reload.
 * The server materializes the questionnaire into a canvas item and the
 * persisted reply then carries that item's id; the block must STILL be held by
 * the reply (`message` row), or the answers saved before the reload are
 * orphaned and the reply reloads empty.
 * Use case: answer "Q1: What are you launching?", Submit, reload the chat.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const setBlockState = jest.fn(async (args: Record<string, unknown>) => ({
  id: "row-1",
  entity_type: args.entityType,
  entity_id: args.entityId,
  block_key: args.blockKey,
  kind: args.kind,
  scope: args.scope,
  state: args.patch,
  state_version: 1,
  sent_version: 0,
  metadata: null,
}));
jest.mock("../blockStateService", () => ({
  ...jest.requireActual("../blockStateService"),
  setBlockState: (a: Record<string, unknown>) => setBlockState(a),
  listConversationBlockStates: jest.fn(async () => []),
  listEntityBlockStates: jest.fn(async () => []),
  listStagedBlockStates: jest.fn(async () => []),
}));
// The chip is not under test here (it needs the chat store); the WRITE target is.
jest.mock("../redux/blockChipThunk", () => ({ syncBlockChip: () => async () => {} }));
jest.mock("@/lib/redux/selectors/userSelectors", () => ({ selectUserId: () => "user-1" }));

import { blockStatesReducer } from "../redux/blockStatesSlice";
import { BlockStateHost } from "../BlockStateContext";
import { useBlockState } from "../useBlockState";
import { canvasItemIdForHost } from "../hostEntity";

const MESSAGE = "11111111-1111-4111-8111-111111111111";
const CONVERSATION = "22222222-2222-4222-8222-222222222222";
const CANVAS_ITEM = "33333333-3333-4333-8333-333333333333";

function Answer() {
  const { patch } = useBlockState<{ formState: Record<string, string> }>();
  return <button onClick={() => patch({ formState: { Q1: "my launch" } })}>answer</button>;
}

async function answerAs(props: { mode: "inline" | "artifact" | "canvas"; messageId?: string; conversationId?: string }) {
  setBlockState.mockClear();
  const store = configureStore({ reducer: { blockStates: blockStatesReducer } as never });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <Provider store={store}>
        <BlockStateHost
          kind="questionnaire"
          messageId={props.messageId}
          conversationId={props.conversationId}
          blockIndex={0}
          canvasItemId={canvasItemIdForHost({ ...props, artifactId: CANVAS_ITEM })}
          content={{ q: 1 }}
        >
          <Answer />
        </BlockStateHost>
      </Provider>,
    );
  });
  jest.useFakeTimers();
  await act(async () => {
    container.querySelector("button")!.click();
  });
  await act(async () => {
    jest.advanceTimersByTime(1500);
  });
  jest.useRealTimers();
  act(() => root.unmount());
  return setBlockState.mock.calls.map((c) => c[0] as { entityType: string; entityId: string });
}

it("saves a chat reply's questionnaire on the reply even when the reply carries a canvas item id", async () => {
  const writes = await answerAs({ mode: "artifact", messageId: MESSAGE, conversationId: CONVERSATION });
  expect(writes.length).toBeGreaterThan(0);
  for (const w of writes) {
    expect(w.entityType).toBe("message");
    expect(w.entityId).toBe(MESSAGE);
  }
});

it("still lets the canvas pane and a message-less surface hold state on the canvas item", () => {
  expect(canvasItemIdForHost({ mode: "canvas", artifactId: CANVAS_ITEM, messageId: MESSAGE, conversationId: CONVERSATION })).toBe(CANVAS_ITEM);
  expect(canvasItemIdForHost({ mode: "inline", artifactId: CANVAS_ITEM })).toBe(CANVAS_ITEM);
  expect(canvasItemIdForHost({ mode: "inline", artifactId: "not-materialized", messageId: MESSAGE, conversationId: CONVERSATION })).toBeNull();
});
