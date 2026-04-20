import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AppDispatch, RootState } from "@/lib/redux/store";
import { setUserInputText } from "../instance-user-input/instance-user-input.slice";
import { setUserVariableValues } from "../instance-variable-values/instance-variable-values.slice";

/**
 * Restores the most-recently submitted text and userValues for the given
 * conversation. Used by the /build "Re-apply last input" affordance so
 * engineers can resubmit the same request after tweaking model / tools /
 * system prompt without having to re-type or re-select variable values.
 */
export const reapplyLastSubmittedInput = createAsyncThunk<
  void,
  string,
  { state: RootState; dispatch: AppDispatch }
>(
  "instances/reapplyLastSubmittedInput",
  async (conversationId, { getState, dispatch }) => {
    const entry =
      getState().instanceUserInput.byConversationId[conversationId];
    if (!entry || !entry.lastSubmittedText) return;

    if (Object.keys(entry.lastSubmittedUserValues).length > 0) {
      dispatch(
        setUserVariableValues({
          conversationId,
          values: entry.lastSubmittedUserValues,
        }),
      );
    }

    dispatch(
      setUserInputText({
        conversationId,
        text: entry.lastSubmittedText,
        userValues: entry.lastSubmittedUserValues,
      }),
    );
  },
);
