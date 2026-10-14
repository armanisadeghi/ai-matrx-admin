"use client";

/**
 * RunReviewCard — the end-of-run card under an agent's last completed answer.
 *
 * ONE component for every surface that runs an agent and wants the person to
 * see what the run took and say how good it was: Agent Battle (every column)
 * and the Agent Builder's test panel. A surface mounts it in
 * `AgentConversationColumn`'s `afterMessages` slot; the card itself only
 * appears once the last run has fully landed (rating half an answer is
 * pointless).
 *
 * Shows:
 *   - usage tiles             — tokens, cost, time to first token, server time.
 *                                Cost is points for everyone; a system admin
 *                                clicks the tile to see dollars beside it.
 * Captures:
 *   - rating (thumbs)         — quick shorthand; auto-fills unrated metrics
 *   - overall (1-5)           — the headline score everyone scans first
 *   - per-metric scores       — accuracy / relevance / completeness / etc
 *   - comment                 — free-form note
 *   - rank (1..N)             — only when the surface supplies `rank` (Battle)
 *
 * Persistence: `saveFeedback` upserts by (user, conversation, request_id) into
 * `agent.cmp_response_feedback`; the row's `metadata.surface` says where it was
 * given. Surface-specific behaviour (blind tests, cross-column ranks, mirroring
 * into a surface's Redux) comes in through `RunReviewExtension` — never a fork.
 */

import { useEffect, useState } from "react";
import {
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Loader2,
  Star,
  Trophy,
  Coins,
  Gauge,
  Timer,
  Zap,
  EyeOff,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { useAppSelector, useAppStore } from "@/lib/redux/hooks";
import type { RootState } from "@/lib/redux/store";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import {
  addUsageTotals,
  fmtCost,
  fmtMs,
  fmtTokens,
  getUserRequestResult,
  requestTtftMs,
  makeSelectConversationRequests,
  type MutableTotals,
} from "@ai-matrx/chat/agents/components/run-controls/panels/shared";
import { cn } from "@/lib/utils";
import {
  fetchLatestFeedback,
  saveFeedback,
  type FeedbackRating,
  type ResponseFeedbackRow,
} from "./responseFeedbackService";
import {
  RESPONSE_FEEDBACK_METRICS,
  type FeedbackMetricDefinition,
} from "./feedbackMetrics";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { CopyButtons } from "@/components/agent-copy/CopyButtons";
import { csvExportItem } from "@/components/agent-copy/export";
import { currentCostUnit } from "@/components/cost/costUnit";
import { useCostDisplay, useSeesDollars } from "@/components/cost/useCostDisplay";
import { AdminCost } from "@/components/cost/AdminCost";
import { formatCount } from "@ai-matrx/kit/format";
import {
  gridMarkdown,
  gridObjects,
  type Grid,
} from "@/features/agent-comparison/shared/tableGrid";

// =============================================================================
// Public contract
// =============================================================================

type Scores = Record<string, number>;

export interface RunReviewSnapshot {
  rating: FeedbackRating;
  overall: number | null;
  rank: number | null;
  scores: Scores;
  comment: string | null;
}

/** What a surface adds on top of the card. Every field is optional. */
export interface RunReviewExtension {
  /** Hide run numbers (they would say which model answered). */
  blind?: boolean;
  /** Saved on the row; ranks are unique within one set. */
  comparisonSetId?: string | null;
  /** Cross-answer ranking (1 = best). Shown only when `slots > 1`. */
  rank?: {
    slots: number;
    /** Ranks another answer holds right now — claiming one swaps it. */
    takenElsewhere: ReadonlySet<number>;
    /** Free the rank on the other answers before this one claims it. False = do not claim. */
    claim: (rank: number, requestId: string) => Promise<boolean>;
  };
  /** Mirror of the saved state, for surfaces that summarise every answer. */
  onSnapshot?: (snapshot: RunReviewSnapshot | null) => void;
  /** Fired after every successful save. */
  onSaved?: (requestId: string) => void;
  /** A window event that means "another answer changed — re-read mine". */
  refreshEvent?: string;
  /** Extra keys saved in the row's `metadata` (beside `scores` and `surface`). */
  metadata?: Record<string, unknown>;
  /** `data-surface-value` for surfaces that register this card as a value. */
  surfaceValue?: string;
}

export interface RunReviewProps {
  conversationId: string;
  /** Saved as `metadata.surface` — where the feedback was given. */
  surface: string;
  /** "Copy for AI" framing: what this card is, and where it sits. */
  copy: { kind: string; location: string; description: string };
  extension?: RunReviewExtension;
}

const THUMBS_UP_DEFAULT_SCORE = 4;
const THUMBS_DOWN_DEFAULT_SCORE = 2;

// =============================================================================
// Outer guard
// =============================================================================

/**
 * Does the minimum reads needed to decide whether the card should appear at
 * all. The inner component mounts only once both the request id AND
 * completion are real, so its hook list is fixed-length across renders.
 */
export function RunReviewCard(props: RunReviewProps) {
  const requests = useAppSelector(
    makeSelectConversationRequests(props.conversationId),
  );
  const lastRequest = requests[requests.length - 1] ?? null;
  const runRequestId = lastRequest?.requestId ?? null;
  // Feedback is filed under the SERVER's id for the run (the user_request
  // id, sent back as X-Request-ID). A live run's own `requestId` is a
  // client-minted `req_*` that no reload can reproduce — a reloaded run is
  // keyed by its user_request id — so feedback keyed by it vanished on reload.
  const feedbackRequestId = lastRequest?.serverRequestId ?? runRequestId;
  const isComplete = lastRequest?.status === "complete";

  if (!runRequestId || !feedbackRequestId || !isComplete) return null;
  return (
    <RunReviewCardInner
      {...props}
      requestId={feedbackRequestId}
      runRequestId={runRequestId}
    />
  );
}

function snapshotOf(row: ResponseFeedbackRow): RunReviewSnapshot {
  return {
    rating: row.rating ?? null,
    overall: row.overall ?? null,
    rank: row.rank ?? null,
    scores: (row.metadata?.scores as Scores | undefined) ?? {},
    comment: row.comment ?? null,
  };
}

// =============================================================================
// Card
// =============================================================================

function RunReviewCardInner({
  conversationId,
  surface,
  copy,
  extension,
  requestId,
  runRequestId,
}: RunReviewProps & {
  /** The durable id feedback is saved and read under. */
  requestId: string;
  /** The in-memory run (activeRequests key) its usage numbers come from. */
  runRequestId: string;
}) {
  const store = useAppStore();
  const userId = useAppSelector(selectUserId);
  const blind = extension?.blind === true;
  const rankExt = extension?.rank;
  const onSnapshot = extension?.onSnapshot;
  const refreshEvent = extension?.refreshEvent;

  const [rating, setRating] = useState<FeedbackRating>(null);
  const [overall, setOverall] = useState<number | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [scores, setScores] = useState<Scores>({});
  const [comment, setComment] = useState("");
  const [commentOpen, setCommentOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savedRequestId, setSavedRequestId] = useState<string | null>(null);
  // Earlier feedback that couldn't be read is said in the status slot — never
  // an unrated-looking card the person might rate over.
  const [feedbackReadError, setFeedbackReadError] = useState<unknown>(null);

  // Hydrate from the server when the request id changes (a new answer landed).
  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    fetchLatestFeedback(userId, conversationId)
      .then((rows) => {
        if (cancelled) return;
        const match = rows.find((r) => r.request_id === requestId);
        const snap = match ? snapshotOf(match) : null;
        setRating(snap?.rating ?? null);
        setOverall(snap?.overall ?? null);
        setRank(snap?.rank ?? null);
        setScores(snap?.scores ?? {});
        setComment(snap?.comment ?? "");
        setSavedRequestId(match ? requestId : null);
        onSnapshot?.(snap);
        setFeedbackReadError(null);
      })
      .catch((err: unknown) => {
        // Quietly, in the card's own status slot — but said.
        if (!cancelled) setFeedbackReadError(err);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, conversationId, requestId, onSnapshot]);

  // Another answer changed (e.g. took our rank) — re-read ours.
  useEffect(() => {
    if (!userId || !refreshEvent) return undefined;
    const handler = () => {
      fetchLatestFeedback(userId, conversationId)
        .then((rows) => {
          const match = rows.find((r) => r.request_id === requestId);
          if (!match) return;
          setRank(match.rank ?? null);
          setOverall(match.overall ?? null);
          onSnapshot?.(snapshotOf(match));
        })
        .catch((err: unknown) => setFeedbackReadError(err));
    };
    window.addEventListener(refreshEvent, handler);
    return () => window.removeEventListener(refreshEvent, handler);
  }, [userId, conversationId, requestId, refreshEvent, onSnapshot]);

  const persist = async (next: {
    rating: FeedbackRating;
    overall: number | null;
    rank: number | null;
    scores: Scores;
    comment: string;
  }) => {
    if (!userId) return;
    setBusy(true);
    const trimmed = next.comment.trim() ? next.comment.trim() : null;
    try {
      await saveFeedback({
        userId,
        conversationId,
        requestId,
        rating: next.rating,
        overall: next.overall,
        rank: next.rank,
        comment: trimmed,
        comparisonSetId: extension?.comparisonSetId ?? null,
        metadata: { ...extension?.metadata, surface, scores: next.scores },
      });
      setSavedRequestId(requestId);
      onSnapshot?.({ ...next, comment: trimmed });
      extension?.onSaved?.(requestId);
    } catch (err) {
      toast.error(
        `Couldn't save feedback: ${err instanceof Error ? err.message : err}`,
      );
    } finally {
      setBusy(false);
    }
  };

  const handleThumbs = (next: "up" | "down") => {
    const newRating = rating === next ? null : next;
    setRating(newRating);
    const defaultScore =
      newRating === "up"
        ? THUMBS_UP_DEFAULT_SCORE
        : newRating === "down"
          ? THUMBS_DOWN_DEFAULT_SCORE
          : null;
    let nextScores = scores;
    let nextOverall = overall;
    if (defaultScore != null) {
      const filled: Scores = { ...scores };
      for (const m of RESPONSE_FEEDBACK_METRICS) {
        if (filled[m.id] == null) filled[m.id] = defaultScore;
      }
      nextScores = filled;
      setScores(filled);
      if (nextOverall == null) {
        nextOverall = defaultScore;
        setOverall(defaultScore);
      }
    }
    void persist({
      rating: newRating,
      overall: nextOverall,
      rank,
      scores: nextScores,
      comment,
    });
  };

  const handleScore = (metricId: string, value: number) => {
    const next = { ...scores };
    if (next[metricId] === value) {
      delete next[metricId];
    } else {
      next[metricId] = value;
    }
    setScores(next);
    void persist({ rating, overall, rank, scores: next, comment });
  };

  const handleOverall = (value: number) => {
    const nextOverall = overall === value ? null : value;
    setOverall(nextOverall);
    void persist({ rating, overall: nextOverall, rank, scores, comment });
  };

  const handleRank = async (value: number) => {
    // Toggle: clicking the rank already held clears it.
    if (rank === value) {
      setRank(null);
      void persist({ rating, overall, rank: null, scores, comment });
      return;
    }
    if (rankExt && !(await rankExt.claim(value, requestId))) return;
    setRank(value);
    void persist({ rating, overall, rank: value, scores, comment });
  };

  // Read at the click, so it is what the person sees right then. A blind run
  // copies only the scores: run numbers would say which model answered.
  const answerGrid = (): Grid => {
    const rows: string[][] = [];
    const usage = blind ? null : readRunUsage(store.getState(), runRequestId);
    if (usage) {
      const unit = currentCostUnit();
      rows.push(
        ["Total tokens", fmtTokens(usage.tokensTotal)],
        ["Input tokens", fmtTokens(usage.tokensInput)],
        ["Cached tokens", fmtTokens(usage.tokensCached)],
        ["Output tokens", fmtTokens(usage.tokensOutput)],
        ["Cost", fmtCost(usage.cost, unit)],
        ["Time to first token", fmtMs(usage.ttftMs)],
        ["Server duration", fmtMs(usage.serverDurationMs)],
      );
    }
    rows.push(["Overall", overall != null ? `${overall} / 5` : "—"]);
    if (rankExt) rows.push(["Rank", rank != null ? `#${rank}` : "—"]);
    rows.push(
      ...RESPONSE_FEEDBACK_METRICS.map((m) => [
        m.label,
        scores[m.id] != null ? `${scores[m.id]} / 5` : "—",
      ]),
      ["Thumbs", rating ?? "—"],
      ["Note", comment || "—"],
    );
    return { headers: ["Metric", "Value"], rows };
  };

  const showRank = rankExt != null && rankExt.slots > 1;

  return (
    <div
      className="border border-border rounded-md bg-card/50 mx-2 my-3 shadow-sm"
      data-surface-value={extension?.surfaceValue}
    >
      {/* Usage strip — hidden during a blind test (cost/speed leak which model
          ran); replaced by a neutral notice so the person knows it's there. */}
      {blind ? <BlindUsageNotice /> : <RunUsageStrip requestId={runRequestId} />}

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/60 bg-muted/30">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          Rate this response
        </span>
        <CopyButtons
          label="This answer"
          size="xs"
          primarySource="table"
          human={() => gridMarkdown(answerGrid())}
          json={() => gridObjects(answerGrid())}
          agent={() => ({
            kind: copy.kind,
            location: copy.location,
            description: copy.description,
            summary: gridMarkdown(answerGrid()),
            data: gridObjects(answerGrid()),
          })}
          export={{ items: [csvExportItem(() => gridObjects(answerGrid()), "CSV")] }}
        />
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => handleThumbs("up")}
          className={cn(
            "h-6 w-6 rounded inline-flex items-center justify-center transition-colors",
            rating === "up"
              ? "bg-emerald-500/20 text-emerald-500"
              : "text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10",
          )}
          title="Quick approve (defaults every unrated metric to 4)"
        >
          <ThumbsUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => handleThumbs("down")}
          className={cn(
            "h-6 w-6 rounded inline-flex items-center justify-center transition-colors",
            rating === "down"
              ? "bg-rose-500/20 text-rose-500"
              : "text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10",
          )}
          title="Quick reject (defaults every unrated metric to 2)"
        >
          <ThumbsDown className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-border mx-0.5" />
        <button
          type="button"
          onClick={() => setCommentOpen((v) => !v)}
          className={cn(
            "h-6 px-1.5 rounded inline-flex items-center gap-1 text-[10px] transition-colors",
            commentOpen
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
          )}
        >
          <MessageSquare className="w-3 h-3" />
          Note
        </button>
        <div className="w-px h-4 bg-border mx-0.5" />
        {busy ? (
          <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
        ) : feedbackReadError != null ? (
          <span className="text-[10px] text-destructive">
            earlier feedback couldn&apos;t load{" "}
            <ErrorAlchemyMenu error={feedbackReadError} size="xs" operation="Load your earlier feedback" />
          </span>
        ) : savedRequestId === requestId ? (
          <span className="text-[10px] text-emerald-500/80">saved</span>
        ) : (
          <span className="text-[10px] text-muted-foreground/60">not saved <ErrorAlchemyMenu /></span>
        )}
      </div>

      {/* Headline row — Overall (+ Rank when the surface ranks answers) */}
      <div className="px-3 py-2 border-b border-border/40 bg-card/30">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[11px] font-semibold text-foreground">
                Overall
              </span>
              <span className="text-[10px] text-muted-foreground/80 truncate">
                · the headline score
              </span>
            </div>
            <div className="mt-1 flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleOverall(n)}
                  title={`${n} / 5`}
                  className={cn(
                    "h-7 w-7 rounded inline-flex items-center justify-center transition-colors",
                    overall != null && n <= overall
                      ? "bg-amber-500/20 text-amber-500"
                      : "text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  <Star
                    className={cn(
                      "w-4 h-4",
                      overall != null && n <= overall && "fill-amber-500",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          {showRank && (
            <div className="shrink-0">
              <div className="flex items-center gap-1.5 justify-end">
                <Trophy className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-semibold text-foreground">
                  Rank
                </span>
                <span className="text-[10px] text-muted-foreground/80">
                  · 1 = best
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1 justify-end">
                {Array.from({ length: rankExt.slots }, (_, i) => i + 1).map((n) => {
                  const takenElsewhere = rankExt.takenElsewhere.has(n);
                  const selected = rank === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => void handleRank(n)}
                      title={
                        selected
                          ? `Clear rank ${n}`
                          : takenElsewhere
                            ? `Rank ${n} (currently on another column — will swap)`
                            : `Set rank ${n}`
                      }
                      className={cn(
                        "h-7 min-w-7 px-2 rounded inline-flex items-center justify-center text-[12px] font-mono font-semibold transition-colors border",
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : takenElsewhere
                            ? "bg-muted/40 text-muted-foreground/50 border-dashed border-border line-through"
                            : "text-foreground border-border hover:bg-muted/50 hover:border-primary/50",
                      )}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Per-metric grid */}
      <div className="px-3 py-2 space-y-1">
        {RESPONSE_FEEDBACK_METRICS.map((metric) => (
          <MetricRow
            key={metric.id}
            metric={metric}
            value={scores[metric.id] ?? null}
            onChange={(v) => handleScore(metric.id, v)}
          />
        ))}
      </div>

      {commentOpen && (
        <div className="px-3 pb-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onBlur={() => void persist({ rating, overall, rank, scores, comment })}
            placeholder="What was good / bad?"
            rows={2}
            className="w-full text-[11px] bg-background border border-border rounded px-2 py-1 text-foreground resize-y focus:outline-none focus:border-primary"
          />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// One metric row — label + 5 buttons
// =============================================================================

function MetricRow({
  metric,
  value,
  onChange,
}: {
  metric: FeedbackMetricDefinition;
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <span className="text-[11px] font-medium text-foreground truncate block">
          {metric.label}
        </span>
        <p
          className="text-[10px] text-muted-foreground/70 truncate"
          title={metric.hint}
        >
          {metric.hint}
        </p>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            title={`${n} / 5`}
            className={cn(
              "h-6 w-6 rounded inline-flex items-center justify-center text-[11px] font-mono transition-colors",
              value != null && n <= value
                ? "bg-amber-500/20 text-amber-500"
                : "text-muted-foreground hover:bg-muted/50",
            )}
          >
            <Star
              className={cn(
                "w-3 h-3",
                value != null && n <= value ? "fill-amber-500" : "",
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Blind-test usage placeholder
// =============================================================================

function BlindUsageNotice() {
  return (
    <div className="px-3 py-2 border-b border-border/60 bg-violet-500/5 flex items-center gap-2">
      <EyeOff className="w-3.5 h-3.5 text-violet-500 shrink-0" />
      <span className="text-[11px] text-muted-foreground">
        Tokens, cost, and speed are hidden during the blind test —{" "}
        <span className="text-violet-500 font-medium">Reveal</span> to compare.
      </span>
    </div>
  );
}

// =============================================================================
// Usage strip — server-reported tokens + cost, client TTFT + total
// =============================================================================

/**
 * One answer's run numbers. Same data source as Battle's Runs comparison table
 * (so the numbers always match): `activeRequests.byRequestId[requestId]`.
 */
function readRunUsage(state: RootState, requestId: string) {
  const req = state.activeRequests.byRequestId[requestId];
  if (!req) return null;
  const totals: MutableTotals = {
    input: 0,
    output: 0,
    cached: 0,
    total: 0,
    cost: 0,
    requests: 0,
  };
  const result = getUserRequestResult(req);
  if (result) {
    addUsageTotals(totals, result.total_usage?.total);
  }
  return {
    tokensInput: totals.input || null,
    tokensCached: totals.cached || null,
    tokensOutput: totals.output || null,
    tokensTotal: totals.total || null,
    cost: totals.cost || null,
    // timing_stats durations are SECONDS on the wire.
    serverDurationMs:
      result?.timing_stats?.total_duration != null
        ? result.timing_stats.total_duration * 1000
        : null,
    // Survives a reload: the server's measurement when this tab did not watch.
    ttftMs: requestTtftMs(req),
    totalClientMs: req.clientMetrics?.totalClientDurationMs ?? null,
  };
}

function RunUsageStrip({ requestId }: { requestId: string }) {
  const { unit: costUnit } = useCostDisplay();
  const seesDollars = useSeesDollars();
  const [dollarsOpen, setDollarsOpen] = useState(false);
  const stats = useAppSelector((state: RootState) =>
    readRunUsage(state, requestId),
  );

  // A complete status without a captured `user_request` result is possible
  // during partial server failures. Hiding cleanly beats showing zeros.
  if (!stats || stats.tokensTotal == null) return null;

  const cost = costParts(fmtCost(stats.cost, costUnit));
  return (
    // Sized by the COLUMN, not the window: five battle columns side by side
    // are each narrow on a wide screen, so the tiles go 2×2 until four fit.
    <div className="@container px-3 py-2 border-b border-border/60 bg-background/60">
      <div className="grid grid-cols-2 @[30rem]:grid-cols-4 gap-2">
        <UsageTile
          icon={<Coins className="w-3 h-3" />}
          label="Tokens"
          primary={fmtTokens(stats.tokensTotal)}
          secondary={tokenBreakdown(stats)}
          tooltip={tokenTooltip(stats)}
          accent="text-primary"
        />
        {/* Points for everyone; a system admin clicks for the dollar cost. */}
        <UsageTile
          icon={<Gauge className="w-3 h-3" />}
          label="Cost"
          primary={cost.primary}
          secondary={cost.secondary}
          tooltip={seesDollars ? "Click for the dollar cost" : cost.tooltip}
          accent="text-emerald-500"
          onClick={seesDollars ? () => setDollarsOpen((v) => !v) : undefined}
          detail={
            seesDollars && dollarsOpen ? <AdminCost usd={stats.cost} /> : undefined
          }
        />
        <UsageTile
          icon={<Zap className="w-3 h-3" />}
          label="TTFT"
          primary={fmtMs(stats.ttftMs)}
          secondary={
            stats.totalClientMs != null
              ? [`total ${fmtMs(stats.totalClientMs)}`]
              : undefined
          }
          tooltip={`Time to first token${stats.totalClientMs != null ? `; whole run ${fmtMs(stats.totalClientMs)} in the browser` : ""}`}
          accent="text-amber-500"
        />
        <UsageTile
          icon={<Timer className="w-3 h-3" />}
          label="Server"
          primary={fmtMs(stats.serverDurationMs)}
          tooltip="Run time as measured on our side"
          accent="text-sky-500"
        />
      </div>
    </div>
  );
}

/** "73k in", "1.4k out": short enough to sit side by side in a narrow tile. */
const compactNumber = (n: number) => formatCount(n, { style: "compact" });

type TokenStats = {
  tokensInput: number | null;
  tokensCached: number | null;
  tokensOutput: number | null;
};

function tokenBreakdown(stats: TokenStats): string[] | undefined {
  const parts: string[] = [];
  if (stats.tokensInput) parts.push(`${compactNumber(stats.tokensInput)} in`);
  if (stats.tokensCached) parts.push(`${compactNumber(stats.tokensCached)} cached`);
  if (stats.tokensOutput) parts.push(`${compactNumber(stats.tokensOutput)} out`);
  return parts.length > 0 ? parts : undefined;
}

function tokenTooltip(stats: TokenStats): string {
  const parts: string[] = [];
  if (stats.tokensInput) parts.push(`${fmtTokens(stats.tokensInput)} in`);
  if (stats.tokensCached) parts.push(`${fmtTokens(stats.tokensCached)} cached`);
  if (stats.tokensOutput) parts.push(`${fmtTokens(stats.tokensOutput)} out`);
  return parts.length > 0 ? `Tokens: ${parts.join(", ")}` : "Tokens";
}

/** "14,378 points" → number on the big line, unit beneath, so the number never truncates. */
function costParts(formatted: string): {
  primary: string;
  secondary?: string[];
  tooltip: string;
} {
  const space = formatted.indexOf(" ");
  if (space < 0) return { primary: formatted, tooltip: `Cost: ${formatted}` };
  return {
    primary: formatted.slice(0, space),
    secondary: [formatted.slice(space + 1)],
    tooltip: `Cost: ${formatted}`,
  };
}

function UsageTile({
  icon,
  label,
  primary,
  secondary,
  tooltip,
  accent,
  onClick,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  primary: string;
  /** Short items; they wrap onto a second line rather than truncate. */
  secondary?: string[];
  tooltip?: string;
  accent: string;
  /** Makes the tile a button (e.g. an admin revealing dollars). */
  onClick?: () => void;
  /** Extra line under the figures, shown when the tile is opened. */
  detail?: React.ReactNode;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "rounded-md border border-border/60 bg-card/60 px-2 py-1.5 min-w-0 text-left",
        onClick && "cursor-pointer hover:border-border hover:bg-muted/40 transition-colors",
      )}
      title={tooltip ?? `${label}: ${primary}`}
    >
      <div className={cn("flex items-center gap-1 text-[9px] uppercase tracking-wider font-semibold", accent)}>
        {icon}
        {label}
      </div>
      <div className="text-[13px] font-mono font-semibold text-foreground mt-0.5 truncate">
        {primary}
      </div>
      {secondary && (
        <div className="flex flex-wrap gap-x-1.5 text-[9px] text-muted-foreground/70 font-mono mt-0.5 leading-tight">
          {secondary.map((part) => (
            <span key={part} className="whitespace-nowrap">
              {part}
            </span>
          ))}
        </div>
      )}
      {detail && (
        <div className="text-[11px] font-mono text-foreground mt-1 pt-1 border-t border-border/50">
          {detail}
        </div>
      )}
    </Tag>
  );
}
