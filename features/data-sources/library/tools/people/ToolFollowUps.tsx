"use client";

/**
 * What comes after an answer, one visible press at a time (lane L12b). The champion for this job, Clay,
 * hides a waterfall of paid steps inside a table; here each step is a button that says what it costs,
 * runs right under the answer it grew from, and shows its own cost. Found is never verified: an email a
 * finder returns says "Found, not confirmed yet" until the email check says otherwise.
 */

import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { ToolActionApprovalDialog } from "@ai-matrx/chat/action-requests/hooks/useToolAction";
import type { ScreenRunApproval } from "@ai-matrx/chat/action-requests/screen-run";
import { Button } from "@ai-matrx/design-system/controls";
import { toolPriceText, type ToolCallView } from "@ai-matrx/agents/tools";

import { ToolResult } from "../ToolResult";
import { useToolCall } from "../useToolCall";
import { useToolRunForm } from "../useToolRunForm";
import type { NextStep, PeopleJobKey } from "./lookupPlan";

export interface FollowUp {
  id: string;
  jobKey: PeopleJobKey;
  inputs: Record<string, string>;
}

/** One next step as a button, with the price its Tool states before anything is pressed. */
export function NextStepButton({ step, started, onPick }: { step: NextStep; started: boolean; onPick: () => void }) {
  const form = useToolRunForm(step.jobKey);
  const price = form.data ? toolPriceText({ price_hint_points: form.data.facts.priceHintPoints }) : null;
  return (
    <Button
      variant="outline"
      onClick={onPick}
      disabled={started || form.isLoading || !form.data}
      icon={<ArrowRight className="h-4 w-4" />}
      data-next-step={step.jobKey}
    >
      {step.label}
      {price ? <span className="ml-1.5 text-muted-foreground">{price}</span> : null}
    </Button>
  );
}

/** The next steps of an answer. A step already pressed stays in place, greyed, so the page reads as a trail. */
export function NextSteps({ steps, started, onPick }: { steps: NextStep[]; started: ReadonlySet<string>; onPick: (step: NextStep) => void }) {
  if (steps.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" data-next-steps="">
      <span className="text-xs text-muted-foreground">Next</span>
      {steps.map((step) => (
        <NextStepButton key={`${step.jobKey}:${JSON.stringify(step.inputs)}`} step={step} started={started.has(`${step.jobKey}:${JSON.stringify(step.inputs)}`)} onPick={() => onPick(step)} />
      ))}
    </div>
  );
}

/** One follow-up Tool call, run once as it opens, under the answer it grew from. */
export function FollowUpCard({ followUp, onView }: { followUp: FollowUp; onView: (id: string, view: ToolCallView | null) => void }) {
  const form = useToolRunForm(followUp.jobKey);
  const toolId = form.data?.facts.toolId ?? "";
  const call = useToolCall(toolId);
  const started = useRef(false);

  useEffect(() => {
    if (!form.data || !toolId || started.current) return;
    started.current = true;
    void call.run(followUp.inputs);
    // The press that opened this card is the one consent; it runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.data, toolId]);

  useEffect(() => {
    onView(followUp.id, call.view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call.view]);

  const approval = call.view?.status === "needs_approval" ? (call.view.approval as ScreenRunApproval | null) : null;
  const title = form.data?.facts.displayName ?? "Working on it";
  return (
    <section className="flex flex-col gap-2" data-follow-up={followUp.jobKey}>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <ToolResult
        view={call.view}
        clientError={call.clientError}
        onRunAgain={() => void call.run(followUp.inputs)}
        onCancel={call.stop}
      />
      {approval ? (
        <ToolActionApprovalDialog
          approval={approval}
          onSettled={(answer) => {
            if (answer.spendApprovalId) void call.run(followUp.inputs, {}, answer.spendApprovalId);
            else call.clear();
          }}
        />
      ) : null}
    </section>
  );
}
