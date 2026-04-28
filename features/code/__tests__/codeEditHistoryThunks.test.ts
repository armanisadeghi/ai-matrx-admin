/**
 * Recording-thunk tests: messageId race + chronological-revert math.
 */

import historyReducer, {
  type CodeEditHistoryState,
} from "../redux/codeEditHistorySlice";
import {
  __flushDeferredForTests,
  __resetDeferredForTests,
  recordPatchAcceptedThunk,
} from "../redux/codeEditHistoryThunks";
import { revertMessageThunk } from "../redux/codeEditUndoRevert";
import type { FileIdentity } from "../utils/fileIdentity";

// ── Minimal store harness — we only need the few slices the thunks read.
interface ActiveRequest {
  requestId: string;
  conversationId: string;
}

interface MessageRecord {
  id: string;
  role: "assistant" | "user";
  _streamRequestId?: string;
}

interface MessagesEntry {
  byId: Record<string, MessageRecord>;
  orderedIds: string[];
}

interface MockState {
  codeEditHistory: CodeEditHistoryState;
  codeTabs: {
    byId: Record<string, { id: string; content: string }>;
    activeId: string | null;
  };
  activeRequests: { byRequestId: Record<string, ActiveRequest> };
  messages: { byConversationId: Record<string, MessagesEntry> };
}

function makeStore(initial: Partial<MockState> = {}) {
  let state: MockState = {
    codeEditHistory: historyReducer(undefined, { type: "@@INIT" }),
    codeTabs: { byId: {}, activeId: null },
    activeRequests: { byRequestId: {} },
    messages: { byConversationId: {} },
    ...initial,
  };
  const dispatch = jest.fn((action: unknown) => {
    if (typeof action === "function") {
      // thunk
      return (action as (d: typeof dispatch, g: () => MockState) => unknown)(
        dispatch,
        () => state,
      );
    }
    state = {
      ...state,
      codeEditHistory: historyReducer(
        state.codeEditHistory,
        action as Parameters<typeof historyReducer>[1],
      ),
    };
    return action;
  });
  return {
    dispatch,
    getState: () => state,
    setState: (mutator: (s: MockState) => MockState) => {
      state = mutator(state);
    },
  };
}

const ID: FileIdentity = {
  adapter: "library",
  path: "library:/foo.ts",
  libraryFileId: "lib-1",
};

describe("recordPatchAcceptedThunk — messageId race", () => {
  beforeEach(() => {
    __resetDeferredForTests();
  });

  it("dispatches synchronously when the message already exists", () => {
    const store = makeStore({
      activeRequests: {
        byRequestId: {
          "req-1": { requestId: "req-1", conversationId: "conv-1" },
        },
      },
      messages: {
        byConversationId: {
          "conv-1": {
            byId: {
              "msg-1": {
                id: "msg-1",
                role: "assistant",
                _streamRequestId: "req-1",
              },
            },
            orderedIds: ["msg-1"],
          },
        },
      },
    });
    store.dispatch(
      recordPatchAcceptedThunk({
        requestId: "req-1",
        fileIdentity: ID,
        beforeContent: "B",
        afterContent: "A",
        patchId: "p1",
        blockIndex: 0,
        search: "s",
        replace: "r",
      }) as unknown,
    );
    expect(store.getState().codeEditHistory.byMessage["msg-1"]).toHaveLength(1);
  });

  it("defers when the message hasn't been reserved yet, drains on flush", () => {
    const store = makeStore({
      activeRequests: {
        byRequestId: {
          "req-1": { requestId: "req-1", conversationId: "conv-1" },
        },
      },
      messages: {
        byConversationId: {
          "conv-1": { byId: {}, orderedIds: [] },
        },
      },
    });
    store.dispatch(
      recordPatchAcceptedThunk({
        requestId: "req-1",
        fileIdentity: ID,
        beforeContent: "B",
        afterContent: "A",
        patchId: "p1",
        blockIndex: 0,
        search: "s",
        replace: "r",
      }) as unknown,
    );
    // Nothing yet — the message wasn't there.
    expect(store.getState().codeEditHistory.byMessage["msg-1"]).toBeUndefined();

    // Server reservation arrives.
    store.setState((s) => ({
      ...s,
      messages: {
        byConversationId: {
          "conv-1": {
            byId: {
              "msg-1": {
                id: "msg-1",
                role: "assistant",
                _streamRequestId: "req-1",
              },
            },
            orderedIds: ["msg-1"],
          },
        },
      },
    }));
    __flushDeferredForTests(store.getState);
    expect(store.getState().codeEditHistory.byMessage["msg-1"]).toHaveLength(1);
  });
});

describe("revertMessageThunk — chronological math", () => {
  it("requires confirmation when later messages also touched the file", () => {
    // Build a state where msg-1 (Jan 1) and msg-2 (Jan 2) both edited
    // the same file. revertMessage(msg-1) should require confirmation.
    let state = historyReducer(undefined, { type: "@@INIT" });
    const apply = (messageId: string, content: string, ts: string) => {
      state = historyReducer(state, {
        type: "codeEditHistory/recordPatchApplied",
        payload: {
          messageId,
          conversationId: "conv-1",
          fileIdentity: ID,
          beforeContent: "BEFORE",
          afterContent: content,
          patchId: `${messageId}:0`,
          blockIndex: 0,
          search: "S",
          replace: "R",
        },
      });
      // Backdate appliedAt so chronology is deterministic. Reducer
      // output is Immer-frozen, so we deep-copy through JSON before
      // mutating, which is fine for plain JSON-able snapshot data.
      const cloned: typeof state = JSON.parse(JSON.stringify(state));
      const stamp = (s: { messageId: string; appliedAt: string }) =>
        s.messageId === messageId ? { ...s, appliedAt: ts } : s;
      cloned.byConversation["conv-1"] = (
        cloned.byConversation["conv-1"] ?? []
      ).map(stamp) as (typeof cloned.byConversation)["conv-1"];
      cloned.byMessage[messageId] = (cloned.byMessage[messageId] ?? []).map(
        stamp,
      ) as (typeof cloned.byMessage)[string];
      const fileKey = `${ID.adapter}:${ID.path}`;
      cloned.byFile[fileKey] = (cloned.byFile[fileKey] ?? []).map(
        stamp,
      ) as (typeof cloned.byFile)[string];
      state = cloned;
    };
    apply("msg-1", "AFTER-1", "2026-01-01T00:00:00Z");
    apply("msg-2", "AFTER-2", "2026-01-02T00:00:00Z");

    const store = makeStore({ codeEditHistory: state });
    const outcome = store.dispatch(
      revertMessageThunk({ messageId: "msg-1" }) as unknown,
    ) as ReturnType<ReturnType<typeof revertMessageThunk>>;

    expect(outcome.requiresConfirmation).toBeDefined();
    expect(outcome.requiresConfirmation!.laterMessageIds).toEqual(["msg-2"]);
    expect(outcome.mutated).toBe(false);
  });

  it("does not require confirmation when there are no later messages", () => {
    let state = historyReducer(undefined, { type: "@@INIT" });
    state = historyReducer(state, {
      type: "codeEditHistory/recordPatchApplied",
      payload: {
        messageId: "msg-1",
        conversationId: "conv-1",
        fileIdentity: ID,
        beforeContent: "BEFORE",
        afterContent: "AFTER",
        patchId: "msg-1:0",
        blockIndex: 0,
        search: "S",
        replace: "R",
      },
    });
    const store = makeStore({ codeEditHistory: state });
    const outcome = store.dispatch(
      revertMessageThunk({ messageId: "msg-1" }) as unknown,
    ) as ReturnType<ReturnType<typeof revertMessageThunk>>;
    expect(outcome.requiresConfirmation).toBeUndefined();
  });
});
