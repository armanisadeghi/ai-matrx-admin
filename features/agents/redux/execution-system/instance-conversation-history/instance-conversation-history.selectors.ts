import type { RootState } from "@/lib/redux/store";
import type {
  ConversationTurn,
  ConversationMode,
} from "./instance-conversation-history.slice";

const EMPTY_TURNS: ConversationTurn[] = [];

export const selectConversationTurns =
  (instanceId: string) =>
  (state: RootState): ConversationTurn[] =>
    state.instanceConversationHistory.byInstanceId[instanceId]?.turns ??
    EMPTY_TURNS;

export const selectConversationMode =
  (instanceId: string) =>
  (state: RootState): ConversationMode =>
    state.instanceConversationHistory.byInstanceId[instanceId]?.mode ?? "agent";

export const selectStoredConversationId =
  (instanceId: string) =>
  (state: RootState): string | null =>
    state.instanceConversationHistory.byInstanceId[instanceId]
      ?.conversationId ?? null;

export const selectTurnCount =
  (instanceId: string) =>
  (state: RootState): number =>
    state.instanceConversationHistory.byInstanceId[instanceId]?.turns.length ??
    0;

export const selectHasConversationHistory =
  (instanceId: string) =>
  (state: RootState): boolean =>
    (state.instanceConversationHistory.byInstanceId[instanceId]?.turns.length ??
      0) > 0;

export const selectLoadedFromHistory =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.instanceConversationHistory.byInstanceId[instanceId]
      ?.loadedFromHistory ?? false;
