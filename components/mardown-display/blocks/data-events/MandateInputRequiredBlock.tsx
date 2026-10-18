"use client";
import React, { useMemo, useState } from "react";
import { CheckCircle2, MessageCircleQuestion } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { ErrorNotice } from "@ai-matrx/design-system";
import { adoptForeignStream } from "@ai-matrx/chat/agents/redux/execution-system/thunks/adopt-foreign-stream";
import { callApi } from "@/lib/api/call-api";
import { useAppDispatch } from "@/lib/redux/hooks";
import { useOpenLiveRunWindow } from "@/features/overlays/definitions/liveRunWindow.overlay";
import {
  ServedInputFields,
  useServedInputValues,
} from "@/features/workflow-runtime/served-form/ServedInputFields";
import {
  buildSubmission,
  parseServedInput,
  unsatisfiedServedInputs,
  type ServedInput,
} from "@/features/workflow-runtime/served-form/served-input";

export interface MandateInputRequiredBlockProps {
  /** The `mandate_input_required` payload plus the engine-stamped `request_id`. */
  data: Record<string, unknown>;
}

type Phase =
  | { kind: "asking" }
  | { kind: "sending" }
  | { kind: "continued" }
  | { kind: "failed"; message: string };

/**
 * A PAUSED JOB, ANSWERED IN PLACE.
 *
 * A workflow-backed job stops when it needs something only a person can give:
 * a required input nobody supplied, or a question asked mid-run. The server
 * says so with `mandate_input_required` (its sentence + the inputs to ask for,
 * the same served-input shape the start form uses). Continue sends the answer
 * to `POST /mandates/runs/{request_id}/answer`, and the resumed run streams
 * into the floating live-run window like any other run.
 */
export default function MandateInputRequiredBlock({
  data,
}: MandateInputRequiredBlockProps) {
  const dispatch = useAppDispatch();
  const openLiveRunWindow = useOpenLiveRunWindow();
  const requestId = typeof data.request_id === "string" ? data.request_id : null;
  const message = typeof data.message === "string" ? data.message.trim() : "";
  const inputs = useMemo<ServedInput[]>(
    () =>
      (Array.isArray(data.inputs) ? data.inputs : [])
        .map((raw) => parseServedInput(raw))
        .filter((input): input is ServedInput => input !== null),
    [data.inputs],
  );
  const draft = useServedInputValues(inputs);
  const [phase, setPhase] = useState<Phase>({ kind: "asking" });
  const [flagged, setFlagged] = useState<ReadonlySet<string>>(new Set());

  const submit = async () => {
    if (!requestId) return;
    const missing = unsatisfiedServedInputs(inputs, draft.values, draft.touched);
    if (missing.length > 0) {
      setFlagged(new Set(missing.map((input) => input.name)));
      return;
    }
    setFlagged(new Set());
    setPhase({ kind: "sending" });
    const { inputs: values } = buildSubmission(inputs, draft.values, draft.touched);
    const runWindow = openLiveRunWindow({
      instanceId: `mandate-answer-${requestId}`,
      label: "Continuing the job",
      pending: true,
    });
    let adopted = false;
    const consumeStream = dispatch(
      adoptForeignStream({
        onAdopted: ({ requestId: continued }) => {
          adopted = true;
          runWindow.update({ requestId: continued, pending: false });
          setPhase({ kind: "continued" });
        },
      }),
    );
    const result = await dispatch(
      callApi({
        path: "/mandates/runs/{request_id}/answer",
        method: "POST",
        pathParams: { request_id: requestId },
        body: { values, initiation: "user" },
        stream: true,
        consumeStream,
      }),
    );
    if (result.error) {
      if (!adopted) runWindow.close();
      setPhase({ kind: "failed", message: result.error.message });
    }
  };

  if (phase.kind === "continued") {
    return (
      <div className="my-2 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
        <span>Answer sent — the job is continuing.</span>
      </div>
    );
  }

  return (
    <div className="my-2 rounded-lg border border-primary/40 bg-card p-3">
      <div className="mb-2 flex items-start gap-2">
        <MessageCircleQuestion className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-sm font-medium text-foreground">
          {message || "This job is waiting for your answer."}
        </p>
      </div>
      <ServedInputFields
        inputs={inputs}
        values={draft.values}
        onChange={draft.setValue}
        heading=""
        flaggedNames={flagged}
        emptyMessage="Nothing to fill in — continue to resume the job."
      />
      {phase.kind === "failed" ? (
        <ErrorNotice size="inline" className="mt-2" message={phase.message} />
      ) : null}
      {!requestId ? (
        <ErrorNotice
          size="inline"
          className="mt-2"
          message="This pause arrived without its run id, so it cannot be answered here."
        />
      ) : null}
      <div className="mt-3 flex justify-end">
        <Button
          size="sm"
          onClick={() => void submit()}
          disabled={!requestId || phase.kind === "sending"}
        >
          {phase.kind === "sending" ? "Sending…" : "Continue"}
        </Button>
      </div>
    </div>
  );
}
