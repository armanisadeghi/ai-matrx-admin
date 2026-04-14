import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AppDispatch, RootState } from "@/lib/redux/store";
import {
  selectAutoClearWithConversationHistory,
  selectConversationMode,
} from "../selectors/aggregate.selectors";
import { executeInstance } from "./execute-instance.thunk";
import { executeChatInstance } from "./execute-chat-instance.thunk";
import { startNewConversationAndExecute } from "./create-instance.thunk";

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
      console.log("[smartExecute] autoClearWithHistory", autoClearWithHistory);
      await dispatch(
        startNewConversationAndExecute({
          currentConversationId: conversationId,
          surfaceKey,
        }),
      );
    } else if (conversationMode === "chat") {
      console.log(
        "[smartExecute] conversationMode === 'chat'",
        conversationMode,
      );
      await dispatch(executeChatInstance({ conversationId }));
    } else {
      console.log(
        "[smartExecute] conversationMode === 'agent'",
        conversationMode,
      );
      await dispatch(executeInstance({ conversationId }));
    }
  },
);
