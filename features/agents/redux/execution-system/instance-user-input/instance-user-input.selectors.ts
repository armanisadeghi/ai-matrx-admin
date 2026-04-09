import type { RootState } from "@/lib/redux/store";

export const selectUserInputText =
  (conversationId: string) =>
  (state: RootState): string =>
    state.instanceUserInput.byConversationId[conversationId]?.text ?? "";

export const selectUserInputContentBlocks =
  (conversationId: string) =>
  (state: RootState): Array<Record<string, unknown>> | null =>
    state.instanceUserInput.byConversationId[conversationId]?.contentBlocks ?? null;

export const selectHasUserInput =
  (conversationId: string) =>
  (state: RootState): boolean => {
    const entry = state.instanceUserInput.byConversationId[conversationId];
    if (!entry) return false;
    return (
      entry.text.trim().length > 0 || (entry.contentBlocks?.length ?? 0) > 0
    );
  };
