"use client";

/**
 * THE HUMAN GATE, inline on a record's own page — any run waiting on a `decision`
 * question renders here from the waiting-on-you row alone (no run stream needed),
 * and the answer resumes the run through the one `/runs/{id}/resume` door.
 * Renders nothing when the run is not waiting on a gate.
 */

import { useState } from "react";
import { UserCheck } from "lucide-react";
import { useWaitingRuns } from "../discovery/useWaitingRuns";
import { useWorkflowRunControls } from "../hooks/useWorkflowRunControls";
import { DecisionPanel } from "./DecisionPanel";
import { parseDecisionSpec } from "./interrupt-view";

export function HumanGatePanel({ runId, onAnswered }: { runId: string; onAnswered?: () => void }) {
  const waiting = useWaitingRuns();
  const { answerInterrupt } = useWorkflowRunControls();
  const [sending, setSending] = useState(false);
  const row = waiting.rows.find((r) => r.runId === runId && r.kind === "interrupt");
  const spec = row ? parseDecisionSpec(row.decision) : null;
  if (!row || !spec || !row.checkpointId) return null;
  const checkpointId = row.checkpointId;

  const submit = (value: Record<string, unknown>) => {
    setSending(true);
    void answerInterrupt(runId, checkpointId, value)
      .then((ok) => {
        if (ok) {
          waiting.refresh();
          onAnswered?.();
        }
      })
      .finally(() => setSending(false));
  };

  return (
    <section
      data-human-gate={runId}
      className="rounded-xl border border-primary/40 bg-primary/5 p-3"
      aria-label={row.title ?? "Decision needed"}
    >
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <UserCheck className="size-4 text-primary" />
        {row.title ?? "Decision needed"}
      </h3>
      {row.prompt ? <p className="mt-0.5 text-xs text-muted-foreground">{row.prompt}</p> : null}
      <DecisionPanel key={checkpointId} spec={spec} sending={sending} onSubmit={submit} />
    </section>
  );
}
