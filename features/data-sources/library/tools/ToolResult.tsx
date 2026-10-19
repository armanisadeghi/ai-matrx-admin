"use client";

/**
 * The result of one Tool call, as its kind (the platform's one answer viewer), where the answer came from and — for builders — the raw data the agent would get. The call is a
 * durable record: this panel only READS it, so a closed tab, a slow source or a refresh never loses
 * a paid answer. No price shows here: a result is work being done.
 */

import { useState } from "react";
import { CircleAlert, Clock, PackageOpen } from "lucide-react";
import { Badge, Button, EmptyState, SegmentedControl } from "@ai-matrx/design-system/controls";
import { isCallRunning, type ToolCallView } from "@ai-matrx/agents/tools";
import { ResultJson } from "@ai-matrx/chat/tool-call-visualization/result-fields/ResultJson";

import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { AnswerValueView } from "@/components/official/structured-value/AnswerValueView";
import { ToolResultTableBar } from "@/features/tool-result-tables/ToolResultTableBar";

type Pane = "answer" | "raw";

/** The words a source gave for finding nothing ("That account doesn't exist."), or null when it gave none. */
function emptyReason(view: ToolCallView): string | null {
  return view.error?.message ?? null;
}

export function ToolResult({
  view,
  clientError,
  onRunAgain,
  onCancel,
  onReopen,
  showRaw = true,
}: {
  view: ToolCallView | null;
  /** The call could not be sent or read at all (nothing reached the server). */
  clientError: string | null;
  onRunAgain: () => void;
  onCancel: () => void;
  /** Read the saved call again (after a lost connection). */
  onReopen?: () => void;
  /** Builders see the raw data beside the answer; a marketer's look-up leaves it out. */
  showRaw?: boolean;
}) {
  const [pane, setPane] = useState<Pane>("answer");

  if (clientError && !view) {
    return (
      <div data-tool-result="client-error">
        <EmptyState
          icon={<CircleAlert className="h-5 w-5" />}
          title="That didn't go through"
          line={clientError}
          action={
            <span className="inline-flex items-center gap-1">
              <Button variant="outline" onClick={onRunAgain}>
                Try again
              </Button>
              <ErrorAlchemyMenu error={clientError} />
            </span>
          }
        />
      </div>
    );
  }
  if (!view) {
    return (
      <div data-tool-result="idle" className="flex h-full min-h-48 items-center justify-center rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        The answer shows up here
      </div>
    );
  }

  if (clientError && isCallRunning(view.status)) {
    return (
      <div data-tool-result="lost-touch">
        <EmptyState
          icon={<CircleAlert className="h-5 w-5" />}
          title="Lost touch with this call"
          line={clientError}
          action={
            onReopen ? (
              <Button variant="outline" onClick={onReopen}>
                Reopen it
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  if (isCallRunning(view.status)) {
    return (
      <div data-tool-result="running" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Clock className="h-4 w-4 animate-pulse text-primary" aria-hidden />
          {view.stage_label ?? "Working on it"}
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-primary/60" />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {view.stage === "done" || view.stage === "storing" ? null : (
            <Button variant="quiet" className="ml-auto" onClick={onCancel}>
              Stop
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (view.status === "needs_approval") {
    return (
      <div data-tool-result="needs-approval">
        <EmptyState icon={<CircleAlert className="h-5 w-5" />} title="Waiting for your OK" line={view.approval?.what_it_buys ?? "This will cost more than usual."} />
      </div>
    );
  }

  if (view.status === "empty") {
    // Set when the source named a reason ("That account doesn't exist.").
    const why = emptyReason(view);
    return (
      <div data-tool-result="empty">
        <EmptyState icon={<PackageOpen className="h-5 w-5" />} title="Nothing found" line="You weren't charged." />
        {why ? (
          <p className="mt-1 text-center text-sm text-foreground" data-tool-empty-why="">
            {why}
          </p>
        ) : null}
        <div className="mt-3 flex justify-center">
          <Button variant="outline" onClick={onRunAgain}>
            Change and try again
          </Button>
        </div>
      </div>
    );
  }

  if (view.status !== "succeeded") {
    return (
      <div data-tool-result={view.status}>
        <EmptyState
          icon={<CircleAlert className="h-5 w-5" />}
          title={view.status === "refused" ? "Not run" : view.status === "cancelled" ? "Stopped" : "That didn't work"}
          line={view.error?.message ?? (view.status === "cancelled" ? "You weren't charged." : "Try again in a moment.")}
          action={
            <span className="inline-flex items-center gap-1">
              <Button variant="outline" onClick={onRunAgain}>
                Try again
              </Button>
              {view.status === "failed" || view.status === "refused" ? <ErrorAlchemyMenu error={view.error?.message ?? view.status} /> : null}
            </span>
          }
        />
      </div>
    );
  }

  return (
    <div data-tool-result="succeeded" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {showRaw && view.raw != null ? (
          <SegmentedControl<Pane>
            aria-label="View"
            value={pane}
            onValueChange={setPane}
            data={[
              { value: "answer", label: "Answer" },
              { value: "raw", label: "Raw data" },
            ]}
          />
        ) : null}
        <span className="ml-auto flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground" data-tool-cost="">
          {view.cache !== "none" ? <Badge tone="neutral">Saved answer</Badge> : null}
          {view.display_source ? <Badge tone="neutral">{view.display_source}</Badge> : null}
        </span>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        {showRaw && pane === "raw" && view.raw != null ? (
          <div data-kind-source="explicit">
            <ResultJson data={view.raw} showSource />
          </div>
        ) : (
          <AnswerValueView value={view.output} emptyText="The answer came back empty." />
        )}
      </div>
      <ToolResultTableBar callId={view.call_id} toolId={view.tool_id} toolName={view.display_name} output={view.output} finishedAt={view.finished_at} />
      {view.ignored_filters.length > 0 ? (
        <p className="text-xs text-muted-foreground" data-tool-ignored="">
          Not used by this Tool: {view.ignored_filters.map((f) => f.label).join(", ")}
        </p>
      ) : null}
    </div>
  );
}
