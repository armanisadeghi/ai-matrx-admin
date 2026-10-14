"use client";

/**
 * ResponseFeedbackBar — Battle's end-of-run card for one column.
 *
 * The card itself is the shared `RunReviewCard` (also under the Agent
 * Builder's test runs). Battle adds only what is Battle's:
 *   - blind tests hide run numbers,
 *   - a cross-column rank (1..N, no ties — the DB enforces uniqueness per
 *     set; we pre-clear the prior holder so the normal flow never races it),
 *   - a Redux mirror of every column's scores for the Runs table and snapshots.
 */

import { toast } from "@/lib/toast";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import type { RootState } from "@/lib/redux/store";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { RunReviewCard } from "@/features/agents/run-review/RunReviewCard";
import { clearRankForOthers } from "@/features/agents/run-review/responseFeedbackService";
import { useCatalogBoundSelector } from "../shared/useCatalogBoundSelector";
import { selectBlindActive } from "../redux/selectors";
import {
  selectActiveBattleColumns,
  selectMountedBattleSetId,
} from "../shared/activeBattleColumns";
import { setFeedbackRank, setFeedbackSnapshot } from "../redux/battleSlice";

/** Other columns re-read their rank when this fires. */
const FEEDBACK_SAVED_EVENT = "agent-comparison:feedback-saved";

/** Sent with "Copy for AI" on an answer card — never shown on screen. */
const ANSWER_COPY = {
  kind: "agent-battle-answer-scores",
  location: "AI Matrx — Agent Battle, one column's answer",
  description:
    "One column's run numbers (tokens, cost, timing) and the person's scores for its answer.",
};

export function ResponseFeedbackBar({ conversationId }: { conversationId: string }) {
  const dispatch = useAppDispatch();
  const userId = useAppSelector(selectUserId);
  const setId = useAppSelector(selectMountedBattleSetId);
  const columns = useCatalogBoundSelector(selectActiveBattleColumns);
  const blind = useAppSelector(selectBlindActive);

  // Ranks other columns hold — a UX hint; collision protection is the DB
  // unique index + the pre-clear in `claim`.
  const otherRanks = useAppSelector((state: RootState) => {
    const out: number[] = [];
    for (const col of columns) {
      if (col.conversationId === conversationId) continue;
      const rank = state.agentComparison.feedbackRanks?.[col.conversationId];
      if (rank != null) out.push(rank);
    }
    return out.join(",");
  });

  // Promise chain, not try/catch: the React Compiler cannot compile value
  // blocks inside a try, and a skipped component memoises nothing.
  const claim = (value: number, requestId: string): Promise<boolean> => {
    if (!setId || !userId) return Promise.resolve(true);
    return clearRankForOthers({
      userId,
      comparisonSetId: setId,
      rank: value,
      exceptConversationId: conversationId,
      exceptRequestId: requestId,
    }).then(
      (cleared) => {
        for (const conv of cleared) {
          dispatch(setFeedbackRank({ conversationId: conv, rank: null }));
        }
        if (cleared.length > 0) {
          window.dispatchEvent(
            new CustomEvent(FEEDBACK_SAVED_EVENT, {
              detail: { conversationId: cleared[0], setId },
            }),
          );
        }
        return true;
      },
      (err: unknown) => {
        toast.error(
          `Couldn't claim rank ${value}: ${err instanceof Error ? err.message : err}`,
        );
        return false;
      },
    );
  };

  return (
    <RunReviewCard
      conversationId={conversationId}
      surface="agent-battle"
      copy={ANSWER_COPY}
      extension={{
        blind,
        comparisonSetId: setId,
        surfaceValue: "model_feedback",
        refreshEvent: FEEDBACK_SAVED_EVENT,
        rank: {
          slots: columns.filter((c) => c.agentId).length,
          takenElsewhere: new Set(
            otherRanks ? otherRanks.split(",").map(Number) : [],
          ),
          claim,
        },
        onSnapshot: (snapshot) => {
          dispatch(
            setFeedbackRank({ conversationId, rank: snapshot?.rank ?? null }),
          );
          dispatch(setFeedbackSnapshot({ conversationId, snapshot }));
        },
        onSaved: (requestId) => {
          // Siblings re-fetch on notification rather than carrying a live
          // Redux mirror of every sibling's feedback row.
          window.dispatchEvent(
            new CustomEvent(FEEDBACK_SAVED_EVENT, {
              detail: { conversationId, requestId, setId },
            }),
          );
        },
      }}
    />
  );
}
