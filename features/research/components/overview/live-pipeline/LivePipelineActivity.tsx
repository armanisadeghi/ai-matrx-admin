"use client";

import { useEffect, useMemo } from "react";
import { AlertTriangle, AlertCircle, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResearchTopic } from "../../../types";
import type { TypedStreamEvent } from "@/types/python-generated/stream-events";
import type {
  UsePipelineProgressResult,
  StageKind,
} from "../../../hooks/usePipelineProgress";
import { useCostSummary } from "../../../hooks/useCostSummary";
import { MetricsStrip } from "./MetricsStrip";
import { QuotaStrip } from "./QuotaStrip";
import { CompletedStageStrip } from "./CompletedStageStrip";
import { ActivityFeed } from "./ActivityFeed";
import { SearchStageView } from "./stages/SearchStageView";
import { ScrapeStageView } from "./stages/ScrapeStageView";
import { AnalyzeStageView } from "./stages/AnalyzeStageView";
import { SynthesizeStageView } from "./stages/SynthesizeStageView";
import { ReportStageView } from "./stages/ReportStageView";

interface Props {
  pipeline: UsePipelineProgressResult;
  topic: ResearchTopic | null | undefined;
  topicId: string;
  /** Whether the underlying stream is currently open. */
  isStreaming: boolean;
  /** Live LLM chunk text (for synthesis preview). */
  streamingText: string;
  /** Stream-level error string. */
  error: string | null;
  /** Raw events for the activity feed. */
  rawEvents: TypedStreamEvent[];
  onCancel: () => void;
  onClose: () => void;
  /** Optional callback when a verdict is applied (for refreshing topic state). */
  onSourceUpdated?: () => void;
}

const STAGE_ORDER: StageKind[] = [
  "search",
  "scrape",
  "analyze",
  "synthesize",
  "report",
];

/**
 * Live activity dashboard. Rendered BELOW the PipelineOrchestra (which owns
 * the header + per-stage rail above). This component focuses on the
 * "what's happening right now" detail: metric strips, the active stage card,
 * collapsed pills for completed stages, warnings, and the raw activity feed.
 *
 * Auto-collapse rule: only the active / partial / failed stage renders as a
 * full card. Already-complete stages collapse into thin clickable strips so
 * they don't crowd out the work that's still in flight.
 */
export function LivePipelineActivity({
  pipeline,
  topic,
  topicId,
  isStreaming,
  streamingText,
  error,
  rawEvents,
  onCancel,
  onClose,
  onSourceUpdated,
}: Props) {
  const { state, derived } = pipeline;

  /**
   * Stages with any meaningful activity. Filters out untouched "pending"
   * stages so they don't appear as empty placeholders.
   */
  const visibleStages = useMemo(
    () =>
      STAGE_ORDER.filter((kind) => {
        const s = state.stages[kind];
        return (
          s.status !== "pending" ||
          s.itemOrder.length > 0 ||
          s.infoMessage != null ||
          s.totals.started > 0 ||
          s.totals.succeeded > 0
        );
      }),
    [state],
  );

  /**
   * For each visible stage, decide whether to render it as a full card or
   * a collapsed strip. Completed stages always collapse — a stage that
   * finished cleanly doesn't need to keep its detail card open while later
   * work is in flight (or after the run is done). Failed/partial stages
   * stay full so the user can see what went wrong.
   */
  const stageRender = useMemo(() => {
    return visibleStages.map((kind) => {
      const s = state.stages[kind];
      const collapsed = s.status === "complete";
      return { kind, collapsed };
    });
  }, [visibleStages, state]);

  const { data: costSummary, refetch: refetchCosts } = useCostSummary(topicId);

  useEffect(() => {
    if (state.completedAt != null) {
      void refetchCosts();
    }
  }, [state.completedAt, refetchCosts]);

  const authoritativeCost =
    state.completedAt != null && costSummary
      ? costSummary.total_estimated_cost_usd
      : null;

  const isPipelineDone = state.completedAt != null && !isStreaming;

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm overflow-hidden">
      {/* Slim status bar — replaces the fat PipelineHeader. The orchestra
          above already shows the controls + per-stage rail; this just
          provides minimal context + a close affordance once done. */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/40 bg-muted/20">
        {isStreaming ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
            <span className="text-[11px] font-medium text-foreground">
              {state.activeStage
                ? `${state.activeStage[0].toUpperCase()}${state.activeStage.slice(1)}…`
                : "Working…"}
            </span>
            {derived.etaSeconds != null && (
              <span className="text-[10px] text-muted-foreground tabular-nums">
                ~{derived.etaSeconds}s remaining
              </span>
            )}
            <button
              onClick={onCancel}
              className="ml-auto inline-flex items-center gap-1 h-6 px-2 rounded-md text-[10px] font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-[11px] font-medium text-foreground">
              Last run
            </span>
            {state.startedAt && state.completedAt && (
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {Math.max(
                  1,
                  Math.round((state.completedAt - state.startedAt) / 1000),
                )}
                s total
              </span>
            )}
            <button
              onClick={onClose}
              className="ml-auto inline-flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-3 w-3" />
            </button>
          </>
        )}
      </div>

      <MetricsStrip
        state={state}
        derived={derived}
        authoritativeCostUsd={authoritativeCost}
      />
      <QuotaStrip topic={topic} state={state} derived={derived} />

      <div className="p-3 space-y-3">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <span className="text-xs text-destructive">{error}</span>
          </div>
        )}

        {state.infos.some((i) => i.level === "warning") && (
          <div className="space-y-1">
            {state.infos
              .filter((i) => i.level === "warning")
              .slice(-3)
              .map((info) => (
                <div
                  key={info.id}
                  className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-2.5 py-1.5"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-700 dark:text-amber-400 min-w-0">
                    <span className="font-semibold">{info.code}:</span>{" "}
                    {info.message}
                  </div>
                </div>
              ))}
          </div>
        )}

        <div className={cn("grid gap-3", "lg:grid-cols-[minmax(0,1fr)_320px]")}>
          <div className="space-y-2 min-w-0">
            {stageRender.length === 0 && isStreaming && (
              <div className="rounded-lg border border-dashed border-border/60 bg-card/30 px-4 py-6 text-center text-xs text-muted-foreground">
                Connecting to backend… first events arriving shortly.
              </div>
            )}

            {stageRender.map(({ kind, collapsed }) => {
              const stage = state.stages[kind];

              if (collapsed) {
                return <CompletedStageStrip key={kind} stage={stage} />;
              }

              if (kind === "search") {
                return (
                  <SearchStageView
                    key="search"
                    state={state}
                    topicId={topicId}
                    ratePerSec={derived.rate}
                    etaSeconds={derived.etaSeconds}
                    iterationMode={state.iterationMode}
                  />
                );
              }
              if (kind === "scrape") {
                return (
                  <ScrapeStageView
                    key="scrape"
                    state={state}
                    topicId={topicId}
                    ratePerSec={derived.rate}
                    etaSeconds={derived.etaSeconds}
                    onSourceUpdated={onSourceUpdated}
                  />
                );
              }
              if (kind === "analyze") {
                return (
                  <AnalyzeStageView
                    key="analyze"
                    state={state}
                    derived={derived}
                    ratePerSec={derived.rate}
                    etaSeconds={derived.etaSeconds}
                  />
                );
              }
              if (kind === "synthesize") {
                return (
                  <SynthesizeStageView
                    key="synthesize"
                    state={state}
                    ratePerSec={derived.rate}
                    etaSeconds={derived.etaSeconds}
                    streamingText={streamingText}
                    isStreaming={isStreaming}
                  />
                );
              }
              if (kind === "report") {
                return (
                  <ReportStageView
                    key="report"
                    state={state}
                    topicId={topicId}
                    ratePerSec={derived.rate}
                    etaSeconds={derived.etaSeconds}
                  />
                );
              }
              return null;
            })}

            {/* When the whole pipeline is done and only collapsed pills
                remain, surface a small celebratory summary line. */}
            {isPipelineDone &&
              stageRender.every((s) => s.collapsed) &&
              stageRender.length > 0 && (
                <div className="text-[11px] text-muted-foreground italic px-1">
                  All stages complete. Click any pill above to expand details.
                </div>
              )}
          </div>

          <ActivityFeed
            rawEvents={rawEvents}
            state={state}
            className="lg:sticky lg:top-2"
          />
        </div>
      </div>
    </div>
  );
}
