"use client";

/**
 * One workflow step that is not an AI call (Smart Add's `socials` lookup, a data shaper…): what it
 * got back from outside (RAW, every vendor answer as received), what it PASSED ON to the next step,
 * and its DISPLAY.
 */

import { useEffect, useState } from "react";
import { ErrorNotice } from "@ai-matrx/design-system";
import { AnswerValueView } from "@/components/official/structured-value/AnswerValueView";
import { resolveRunValue } from "@/features/workflow-runtime/transport/run-values";
import { fetchStepOutput, type NodeOutcomeRow } from "./ai-watch-data-reads";
import { DataPane } from "./DataPane";
import { CutTrail } from "./RunDataSection";
import { RawEntryView } from "./RawEntryView";
import { cutLine, readRawCapture, sizeLabel } from "./raw-data";

export function StepDataView({ step }: { step: NodeOutcomeRow }) {
  const capture = readRawCapture(step.metadata);
  const [output, setOutput] = useState<unknown>(undefined);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    fetchStepOutput(step.id)
      .then((value) => resolveRunValue(step.run_id, value))
      .then(
        (value) => live && setOutput(value),
        (e: unknown) => live && setError(e instanceof Error ? e.message : String(e)),
      );
    return () => {
      live = false;
    };
  }, [step.id, step.run_id]);
  const outputText = output === undefined ? null : JSON.stringify(output);
  const stepError = step.error == null ? null : typeof step.error === "string" ? step.error : JSON.stringify(step.error);
  return (
    <div className="flex flex-col gap-2 p-2 text-xs" data-testid="ai-watch-step-data">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{step.node_id}</span>
        <span className="text-muted-foreground">
          step {step.step}
          {step.attempt > 1 ? ` · attempt ${step.attempt}` : ""}
          {step.duration_ms != null ? ` · ${step.duration_ms.toLocaleString()} ms` : ""}
          {step.output_kind ? ` · ${step.output_kind}` : ""}
        </span>
      </div>
      {error ? <ErrorNotice title="The step's output could not be read" message={error} /> : null}
      {stepError ? <ErrorNotice title="The step failed" message={stepError} /> : null}
      {capture && capture.raw.length ? (
        capture.raw.map((e, i) => <RawEntryView key={i} entry={e} />)
      ) : (
        <DataPane tier="raw" title="What came back from outside" size="size unknown" open>
          <div className="text-muted-foreground">
            {capture ? "Nothing came back to keep" : "No outside answer kept for this step (none was made, or it ran before raw capture existed)"}
          </div>
        </DataPane>
      )}
      <CutTrail lines={(capture?.cuts ?? []).map(cutLine)} />
      <DataPane
        tier="passed"
        title="Output the next step received"
        size={sizeLabel(outputText?.length ?? null)}
        value={output === undefined ? undefined : output}
        open
      >
        {output === undefined && !error ? <div className="text-muted-foreground">Loading the output</div> : null}
      </DataPane>
      {output !== undefined && output !== null ? (
        <DataPane tier="display" title="As shown" size={sizeLabel(outputText?.length ?? null)}>
          <AnswerValueView value={output} kind={step.output_kind} density="inline" />
        </DataPane>
      ) : null}
    </div>
  );
}
