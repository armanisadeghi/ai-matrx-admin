"use client";

/**
 * A battle's outcome on cases — the ONE view every battle surface shows (Agent Studio's Battle tab,
 * the Agent Battle page's server run): the winner line, then each case with every setup's verdict
 * and a vote per answer (`agent.cmp_response_feedback`, filed with the surface that asked).
 */

import { useState, type ReactNode } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Badge, Button } from "@ai-matrx/design-system/controls";
import { ShimmerText } from "@/components/loaders/ShimmerText";
import { saveFeedback, type FeedbackRating } from "@/features/agents/run-review/responseFeedbackService";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { useAppSelector } from "@/lib/redux/hooks";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { VERDICT_META } from "../verdicts";
import type { TestResultView } from "../types";
import { answerRows, type BattleVotes, type PairwiseVerdict, type RunSetupBody } from "../battle";

export function OutcomeCard({
  children,
  tone,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: "success" | "warning" }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-md border bg-card p-2 text-xs",
        tone === "success" ? "border-success/40" : tone === "warning" ? "border-warning/40" : "border-border",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function BattleOutcome({
  results,
  cases,
  setups,
  labelOf,
  runId,
  line,
  tone,
  footer,
  surface,
  pairwise,
  votes: controlledVotes,
  onVote,
}: {
  results: TestResultView[];
  cases: readonly { id: string; label?: string | null }[];
  setups: readonly RunSetupBody[];
  labelOf: (key: string) => string;
  runId: string;
  line: string;
  tone?: "success" | "warning";
  footer?: ReactNode;
  /** Filed on each vote (`metadata.surface`), e.g. `agent_studio_battle`, `agent_battle_server`. */
  surface: string;
  /** The battle's pairwise verdict (which answer was better per case), when the run has one. */
  pairwise?: PairwiseVerdict | null;
  /** Controlled votes (the caller counts them in its verdict); internal when omitted. */
  votes?: BattleVotes;
  onVote?: (resultId: string, rating: "up" | "down") => void;
}) {
  const userId = useAppSelector(selectUserId);
  const [ownVotes, setVotes] = useState<Record<string, FeedbackRating>>({});
  const votes: Record<string, FeedbackRating | undefined> = controlledVotes ?? ownVotes;
  const vote = async (r: TestResultView, rating: FeedbackRating) => {
    if (!userId || !r.conversationId) return;
    try {
      await saveFeedback({
        userId,
        conversationId: r.conversationId,
        requestId: r.userRequestIds[r.userRequestIds.length - 1] ?? null,
        rating,
        comment: null,
        metadata: { surface, test_run_id: runId, test_result_id: r.id, setup_key: r.setupKey, case_id: r.caseId },
      });
      setVotes((v) => ({ ...v, [r.id]: rating }));
      if (rating === "up" || rating === "down") onVote?.(r.id, rating);
    } catch (e) {
      toast.error("The vote did not save", { description: e instanceof Error ? e.message : String(e) });
    }
  };
  const shown = answerRows(results).filter((r) => r.door !== "parity");
  const caseIds = [...new Set(shown.map((r) => r.caseId))];
  const caseLabel = (id: string) => cases.find((c) => c.id === id)?.label || "Case";
  return (
    <div className="flex flex-col gap-1.5" data-testid="battle-outcome">
      <OutcomeCard tone={tone}>
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 text-sm font-medium text-foreground" data-testid="battle-winner">
            {line}
          </span>
          {footer}
        </div>
      </OutcomeCard>
      {caseIds.map((id) => (
        <OutcomeCard key={id} data-testid="battle-case">
          <span className="truncate font-medium text-foreground">{caseLabel(id)}</span>
          <PairLine verdict={pairwise?.cases.find((c) => c.caseId === id) ?? null} labelOf={labelOf} />
          {setups.map((setup) => {
            const r = shown.find((x) => x.caseId === id && x.setupKey === setup.key);
            if (!r) return null;
            const meta = r.verdict ? VERDICT_META[r.verdict] : null;
            const mine = votes[r.id];
            return (
              <div key={r.id} className="flex h-7 items-center gap-1.5">
                <span className="w-20 shrink-0 truncate text-muted-foreground">{labelOf(r.setupKey)}</span>
                <span className="min-w-0 flex-1">
                  {meta ? <Badge tone={meta.tone}>{meta.label}</Badge> : <ShimmerText text="Judging" />}
                </span>
                <Button
                  variant="quiet"
                  icon={<ThumbsUp className={mine === "up" ? "text-primary" : undefined} />}
                  aria-label={`Good answer, ${labelOf(r.setupKey)}`}
                  aria-pressed={mine === "up"}
                  disabled={!r.conversationId}
                  onClick={() => void vote(r, "up")}
                />
                <Button
                  variant="quiet"
                  icon={<ThumbsDown className={mine === "down" ? "text-destructive" : undefined} />}
                  aria-label={`Bad answer, ${labelOf(r.setupKey)}`}
                  aria-pressed={mine === "down"}
                  disabled={!r.conversationId}
                  onClick={() => void vote(r, "down")}
                />
              </div>
            );
          })}
        </OutcomeCard>
      ))}
    </div>
  );
}

/** One case's pairwise result: who gave the better answer and the judge's one-line why. */
function PairLine({
  verdict,
  labelOf,
}: {
  verdict: PairwiseVerdict["cases"][number] | null;
  labelOf: (key: string) => string;
}) {
  if (!verdict) return null;
  if (verdict.winner === null) return <ShimmerText text="Comparing answers" />;
  if (verdict.winner === "none") return <Badge tone="warning">Judge gave no verdict</Badge>;
  const head = verdict.winner === "tie" ? "Even" : `${labelOf(verdict.winner)} better`;
  const rounds = verdict.judge.challenger + verdict.judge.baseline + verdict.judge.ties;
  const rationale = verdict.byVote ? "Your vote" : verdict.rationales[0] ?? "";
  // The judge's rationale for a win, not a failure.
  const judgeNotes = verdict.rationales.join("\n");
  return (
    <div className="flex min-w-0 items-center gap-1.5" data-testid="battle-case-pair">
      <Badge tone={verdict.winner === "tie" ? "neutral" : "info"}>{head}</Badge>
      {rounds > 1 && !verdict.byVote ? (
        <span className="shrink-0 text-muted-foreground">
          {Math.max(verdict.judge.challenger, verdict.judge.baseline)}/{rounds}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate text-muted-foreground" title={judgeNotes}>
        {rationale}
      </span>
    </div>
  );
}
