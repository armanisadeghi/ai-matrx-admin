"use client";

/**
 * One paid answer on the Look up page: a catalog Tool run as a durable call record, shown as the
 * answer's kind with what it cost, and — for rows — "Save to a table". It starts itself when a new
 * look-up is submitted, or opens the same record again from `callId` after a reload (no second
 * charge). The look-up page holds the sum; this card only reports its own call.
 */

import { useEffect, useRef } from "react";
import { ToolActionApprovalDialog } from "@ai-matrx/chat/action-requests/hooks/useToolAction";
import type { ScreenRunApproval } from "@ai-matrx/chat/action-requests/screen-run";
import type { ToolCallView } from "@ai-matrx/agents/tools";

import { ToolResult } from "@/features/data-sources/library/tools/ToolResult";
import { useToolCall } from "@/features/data-sources/library/tools/useToolCall";

export interface StepSubmission {
  /** Changes with every press of the button, so a card runs once per press. */
  key: string;
  inputs: Record<string, unknown>;
}

export function ResearchStepCard({
  toolId,
  title,
  submission,
  callId,
  onCall,
  onView,
}: {
  toolId: string;
  title: string;
  submission: StepSubmission | null;
  /** A call from an earlier visit: shown again, never re-bought. */
  callId: string | null;
  onCall: (callId: string) => void;
  onView: (view: ToolCallView | null) => void;
}) {
  const call = useToolCall(toolId, onCall);
  const started = useRef<string | null>(null);
  const resumed = useRef<string | null>(null);

  useEffect(() => {
    if (!submission || started.current === submission.key) return;
    started.current = submission.key;
    void call.run({}, submission.inputs);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one run per press
  }, [submission?.key]);

  useEffect(() => {
    if (submission || !callId || resumed.current === callId) return;
    resumed.current = callId;
    call.resume(callId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one read per saved call
  }, [callId, submission]);

  useEffect(() => {
    onView(call.view);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- report each new state of this call
  }, [call.view]);

  const approval = call.view?.status === "needs_approval" ? (call.view.approval as ScreenRunApproval | null) : null;
  // An answer's own view names itself; the title is only for the states that have no view yet.
  const waiting = call.view == null && call.clientError == null && (submission != null || callId != null);

  return (
    <section className="flex min-w-0 flex-col gap-2" data-research-step={title}>
      {call.view?.status === "succeeded" ? null : <h2 className="type-title text-foreground">{title}</h2>}
      {waiting ? (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5" data-research-waiting="">
          <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      ) : (
      <ToolResult
        view={call.view}
        clientError={call.clientError}
        showRaw={false}
        onRunAgain={() => submission && void call.run({}, submission.inputs)}
        onCancel={call.stop}
      />
      )}
      {approval ? (
        <ToolActionApprovalDialog
          approval={approval}
          onSettled={(answer) => {
            if (answer.spendApprovalId && submission) void call.run({}, submission.inputs, answer.spendApprovalId);
            else call.clear();
          }}
        />
      ) : null}
    </section>
  );
}
