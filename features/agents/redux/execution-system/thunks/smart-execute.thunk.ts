import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AppDispatch, RootState } from "@/lib/redux/store";
import {
  selectAutoClearWithConversationHistory,
  selectApiEndpointMode,
} from "../selectors/aggregate.selectors";
import { executeInstance } from "./execute-instance.thunk";
import { executeChatInstance } from "./execute-chat-instance.thunk";
import { startNewConversationAndExecute } from "./create-instance.thunk";
import { abortConversation } from "./abort-registry";
import { setInstanceStatus } from "../conversations";
import { setRequestStatus } from "../active-requests/active-requests.slice";
import {
  markInputSubmitted,
  resetSubmissionPhase,
} from "../instance-user-input/instance-user-input.slice";

interface SmartExecuteArgs {
  conversationId: string;
  surfaceKey?: string;
}

export const smartExecute = createAsyncThunk<
  void,
  SmartExecuteArgs,
  { state: RootState; dispatch: AppDispatch }
>(
  "instances/smartExecute",
  async ({ conversationId, surfaceKey }, { getState, dispatch }) => {
    const state = getState();

    const autoClearWithHistory =
      selectAutoClearWithConversationHistory(conversationId)(state);
    const apiEndpointMode = selectApiEndpointMode(conversationId)(state);

    // Phase 1 — capture the current text + userValues so we can re-apply after
    // a reset, but keep the textarea visible until the server confirms that
    // cx_user_request has been persisted (handled in process-stream).
    const userValues =
      state.instanceVariableValues?.byConversationId[conversationId]
        ?.userValues ?? {};
    dispatch(markInputSubmitted({ conversationId, userValues }));

    if (autoClearWithHistory) {
      await dispatch(
        startNewConversationAndExecute({
          currentConversationId: conversationId,
          surfaceKey,
        }),
      );
    } else if (apiEndpointMode === "manual") {
      await dispatch(executeChatInstance({ conversationId }));
    } else {
      await dispatch(executeInstance({ conversationId }));
    }
  },
);

export const cancelExecution = createAsyncThunk<
  void,
  string,
  { state: RootState; dispatch: AppDispatch }
>(
  "instances/cancelExecution",
  async (conversationId, { getState, dispatch }) => {
    abortConversation(conversationId);

    const state = getState();
    const requestIds = state.activeRequests?.byConversationId[conversationId];
    if (requestIds && requestIds.length > 0) {
      const latestRequestId = requestIds[requestIds.length - 1];
      dispatch(
        setRequestStatus({ requestId: latestRequestId, status: "cancelled" }),
      );
    }
    dispatch(setInstanceStatus({ conversationId, status: "cancelled" }));
    // Return the input phase to idle so the user can edit/re-submit without
    // appearing stuck in "pending". Keep any `text` they had in place.
    dispatch(resetSubmissionPhase(conversationId));
  },
);
