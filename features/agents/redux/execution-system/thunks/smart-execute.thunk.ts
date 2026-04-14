import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AppDispatch, RootState } from "@/lib/redux/store";
import {
  selectAutoClearWithConversationHistory,
  selectConversationMode,
} from "../selectors/aggregate.selectors";
import { executeInstance } from "./execute-instance.thunk";
import { executeChatInstance } from "./execute-chat-instance.thunk";
import { startNewConversationAndExecute } from "./create-instance.thunk";
import { abortConversation } from "./abort-registry";
import { setInstanceStatus } from "../execution-instances";
import { setRequestStatus } from "../active-requests/active-requests.slice";

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
    const conversationMode = selectConversationMode(conversationId)(state);

    if (autoClearWithHistory) {
      await dispatch(
        startNewConversationAndExecute({
          currentConversationId: conversationId,
          surfaceKey,
        }),
      );
    } else if (conversationMode === "chat") {
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
  },
);
