import type { RootState } from "@/lib/redux/store";
import type { MessagePart } from "@/types/python-generated/stream-events";

/**
 * The current text input for this instance.
 * Returns "" when no entry exists — safe because "" is a string literal
 * (always the same reference), so ?? "" does not cause new-reference churn.
 */
export const selectUserInputText =
  (conversationId: string) =>
  (state: RootState): string =>
    state.instanceUserInput.byConversationId[conversationId]?.text ?? "";

/**
 * The message parts for this instance.
 * Returns undefined when no entry exists — guard in component.
 * Never use ?? [] here: that creates a new array reference on every call
 * when the entry is missing, causing a re-render on every dispatch.
 */
export const selectUserInputMessageParts =
  (conversationId: string) =>
  (state: RootState): MessagePart[] | undefined =>
    state.instanceUserInput.byConversationId[conversationId]?.messageParts ??
    undefined;

/**
 * Character count of the current text input.
 * Returns a primitive number — stable reference, no array/object churn.
 * Used by AgentTextarea to decide whether to show the expand button.
 */
export const selectInputCharCount =
  (conversationId: string) =>
  (state: RootState): number =>
    state.instanceUserInput.byConversationId[conversationId]?.text?.length ?? 0;

export const selectHasUserInput =
  (conversationId: string) =>
  (state: RootState): boolean => {
    const entry = state.instanceUserInput.byConversationId[conversationId];
    if (!entry) return false;
    return (
      entry.text.trim().length > 0 || (entry.messageParts?.length ?? 0) > 0
    );
  };
