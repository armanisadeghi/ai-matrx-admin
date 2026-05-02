"use client";

import { useMemo } from "react";
import { AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResearchTopic } from "../../../types";
import type { TypedStreamEvent } from "@/types/python-generated/stream-events";
import type { UsePipelineProgressResult } from "../../../hooks/usePipelineProgress";
import { PipelineHeader } from "./PipelineHeader";
import { PipelineRail } from "./PipelineRail";
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

/**
 * Top-level live activity dashboard. Renders header, pipeline rail, metric and
 * quota strips, the active stage view, completed stage accordions, and the
 * activity feed. Replaces the legacy ProgressPanel for all pipeline operations.
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

  /** Stages that have ANY activity — rendered as stacked cards. */
  const visibleStages = useMemo(
    () =>
      (
        ["search", "scrape", "analyze", "synthesize", "report"] as const
      ).filter((kind) => {
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


  const authoritativeCost =
    state.completedAt != null && topic?.cost_summary
      ? topic.cost_summary.total_estimated_cost_usd
      : null;

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm overflow-hidden">
      <PipelineHeader
        state={state}
        isStreaming={isStreaming}
        etaSeconds={derived.etaSeconds}
        onCancel={onCancel}
        onClose={onClose}
      />
      <PipelineRail state={state} />
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

        {/* Quota / info warnings inline (separate from feed for prominence) */}
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

        {/* Stage cards stacked — every stage that has activity renders, not just one. */}
        <div
          className={cn(
            "grid gap-3",
            "lg:grid-cols-[minmax(0,1fr)_320px]",
          )}
        >
          <div className="space-y-3 min-w-0">
            {visibleStages.length === 0 && isStreaming && (
              <div className="rounded-lg border border-dashed border-border/60 bg-card/30 px-4 py-6 text-center text-xs text-muted-foreground">
                Connecting to backend… first events arriving shortly.
              </div>
            )}

            {visibleStages.map((kind) => {
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
          </div>

          {/* Activity feed — right rail on lg, below on smaller screens */}
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
