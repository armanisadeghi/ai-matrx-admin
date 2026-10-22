/**
 * What "Run again" re-runs: every value the shown run's first turn was sent with, and what the
 * person typed on it. The Studio SEEDS its runs (a case, the sample, a previous Run again), so
 * those values are host values; reading only the person's own values re-ran with no inputs and
 * the launch was refused (live 2026-10-21, agent c6c4862b, "Fill in amount, customer_name, …").
 */

import {
  selectHostSubmittedFirstTurnValues,
  selectOwnSubmittedFirstTurnValues,
} from "@ai-matrx/chat/agents/redux/execution-system/instance-variable-values/instance-variable-values.selectors";
import { selectConversationMessages } from "@ai-matrx/chat/agents/redux/execution-system/messages/messages.selectors";
import { rerunSeedFrom, type StudioMessageRecord } from "./studio-state";

type ChatState = Parameters<ReturnType<typeof selectOwnSubmittedFirstTurnValues>>[0];

export function runAgainSeed(
  state: ChatState,
  conversationId: string,
): { variables: Record<string, string>; userInput: string } | null {
  const values = {
    ...(selectHostSubmittedFirstTurnValues(conversationId)(state) as Record<string, unknown>),
    ...(selectOwnSubmittedFirstTurnValues(conversationId)(state) as Record<string, unknown>),
  };
  const messages = selectConversationMessages(conversationId)(state as never) as StudioMessageRecord[];
  return rerunSeedFrom(values, messages);
}
