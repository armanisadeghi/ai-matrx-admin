"use client";

import { Loader2, Play, RefreshCw, Scale } from "lucide-react";
import { CostDoor } from "@/components/cost/CostDoor";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ProTextarea } from "@/components/official/ProTextarea";
import { ModelListDropdown } from "@ai-matrx/agents/models/react";
import { useModels } from "@/features/ai-models/hooks/useModels";
import {
  firstDecisionModelId,
  resolvePreferredDecisionModel,
} from "@/features/ai-models/preferredDecisionModel";
import { useOrganizationRequired } from "@/features/organizations/useOrganizationRequired";
import { OrganizationContextNotice } from "@/features/organizations/components/OrganizationRequiredNotice";
import { useAppDispatch } from "@/lib/redux/hooks";
import { DecisionQuestionEditor } from "./DecisionQuestionEditor";
import {
  decisionQuestionPayload,
  looksLikeJson,
  readTypedValue,
  questionErrors,
  type DecisionQuestion,
} from "./decision-form";
import { loadDecision, runDecision } from "./decision-api";
import type { DecisionResultView } from "./decision-result";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { ReadFailure } from "@ai-matrx/design-system";
import { ALL_DECISIONS_REVIEW_HREF } from "@/features/agents/decision-review/service";
import { PropertyRow } from "@ai-matrx/design-system/controls";
import { ListTapButton, ShareTapButton } from "@ai-matrx/design-system/tap-target/buttons";
import RouteHeader from "@/features/shell/components/header/RouteHeader";

export function DecisionPlayground() {
  const dispatch = useAppDispatch();
  const { organizationState, retry } = useOrganizationRequired();
  const params = useSearchParams();
  const [model, setModel] = useState<string | null>(null);
  const [offeringId, setOfferingId] = useState<string | undefined>();
  const [state, setState] = useState("");
  const [questions, setQuestions] = useState<DecisionQuestion[]>([]);
  // What is missing shows only after someone presses Run — never on load,
  // and Run is never disabled for it.
  const [showIssues, setShowIssues] = useState(false);
  const [result, setResult] = useState<DecisionResultView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recovering, setRecovering] = useState(false);
  // The saved decision's read failure (the URL's execution_id), separate from a run's failure.
  const [recoverError, setRecoverError] = useState<string | null>(null);
  const [recoverAttempt, setRecoverAttempt] = useState(0);
  const executionId = params.get("execution_id");
  // The model that loads when nobody picked one: the settings ladder's
  // `agents.model_prefs.decision_default_model` (org → user, nearest wins),
  // else the catalog's first decision model, else nothing — and the ready
  // check says "Choose a decision model" out loud. Never hard-coded.
  const catalog = useModels();
  const [defaultApplied, setDefaultApplied] = useState(false);
  const [defaultUnavailable, setDefaultUnavailable] = useState(false);

  useEffect(() => {
    if (defaultApplied || organizationState !== "ready" || !catalog.isReady) return;
    let active = true;
    void resolvePreferredDecisionModel().then((preferred) => {
      if (!active) return;
      setDefaultApplied(true);
      const fallback = firstDecisionModelId(catalog.models);
      const initial = preferred?.modelId ?? fallback;
      if (initial) {
        setModel((current) => {
          if (current) return current;
          // The preferred model's class loads with it; the fallback runs
          // its own preferred class.
          if (preferred?.offeringId) setOfferingId(preferred.offeringId);
          return initial;
        });
      } else {
        setDefaultUnavailable(true);
      }
    });
    return () => {
      active = false;
    };
  }, [catalog.isReady, catalog.models, defaultApplied, organizationState]);

  useEffect(() => {
    if (!executionId || organizationState !== "ready") return;
    let active = true;
    const recover = async () => {
      setRecovering(true);
      setRecoverError(null);
      try {
        const savedResult = await loadDecision(dispatch, executionId);
        if (active) setResult(savedResult);
      } catch (reason) {
        if (active)
          setRecoverError(
            reason instanceof Error
              ? reason.message
              : "This saved decision could not be loaded.",
          );
      } finally {
        if (active) {
          setRecovering(false);
        }
      }
    };
    void recover();
    return () => {
      active = false;
    };
  }, [dispatch, executionId, organizationState, recoverAttempt]);

  // JSON is detected, never switched: typed JSON is sent as JSON.
  const stateValue = readTypedValue(state);
  // A Set: two blank options must not list the same message twice.
  const validationErrors = Array.from(new Set([
    ...(organizationState === "ready"
      ? []
      : ["Your organization is still loading."]),
    ...(model
      ? []
      : [
          defaultUnavailable
            ? "Choose a decision model. No default is set and the catalog has no decision model to fall back on."
            : "Choose a decision model.",
        ]),
    ...(state.trim() ? [] : ["Describe the situation."]),
    ...questionErrors(questions),
  ]));

  const run = () => {
    if (busy) return;
    if (
      organizationState !== "ready" ||
      validationErrors.length > 0 ||
      !model
    ) {
      setShowIssues(true);
      return;
    }
    setShowIssues(false);
    setBusy(true);
    setError(null);
    const payloadQuestions: Record<string, Record<string, unknown>> = {};
    for (const question of questions) {
      const payload = decisionQuestionPayload(question);
      if (!payload) {
        setBusy(false);
        setError("Fix the question details before running this decision.");
        return;
      }
      payloadQuestions[question.name.trim()] = payload;
    }
    void runDecision(dispatch, {
      model,
      offeringId,
      state: stateValue,
      questions: payloadQuestions,
    })
      .then(setResult)
      .catch((reason: unknown) => {
        setError(
          reason instanceof Error
            ? reason.message
            : "The decision did not complete.",
        );
      })
      .finally(() => setBusy(false));
  };

  const shareHref = result
    ? `?execution_id=${encodeURIComponent(result.executionId)}`
    : undefined;

  return (
    <>
      <RouteHeader
        left={
          <span className="flex min-w-0 items-center gap-2 pl-2">
            <Scale className="size-4 shrink-0 text-primary" />
            <span className="truncate text-sm font-medium text-foreground">
              Decisions
            </span>
          </span>
        }
        right={
          <>
            {shareHref && (
              <ShareTapButton
                variant="transparent"
                href={shareHref}
                tooltip="Link to this result"
                ariaLabel="Link to this result"
              />
            )}
            <ListTapButton
              variant="transparent"
              href={`${ALL_DECISIONS_REVIEW_HREF}?source=model`}
              label="Review answers"
              ariaLabel="Review answers"
            />
          </>
        }
      />
      <div className="h-full w-full overflow-y-auto overscroll-contain bg-textured">
        <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 pb-10 pt-[calc(var(--shell-header-h)+1rem)] xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.75fr)]">
          <main className="min-w-0 space-y-6">
            <section className="space-y-2.5">
              <StepLabel step={1}>The situation</StepLabel>
              <ProTextarea
                value={state}
                onChange={(event) => setState(event.target.value)}
                placeholder="Describe the situation, as text or JSON"
                aria-label="Decision state"
                autoGrow
                minHeight={140}
                maxHeight={360}
                className={looksLikeJson(state) ? "font-mono text-sm" : "text-sm"}
              />
            </section>
            <section className="space-y-2.5">
              <StepLabel step={2}>
                {questions.length === 0 ? "What do you want to know?" : "Questions"}
              </StepLabel>
              <DecisionQuestionEditor
                questions={questions}
                onChange={setQuestions}
              />
            </section>
            <section className="space-y-3 rounded-xl border border-border bg-card p-4">
              <StepLabel step={3}>Run it</StepLabel>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <ModelListDropdown
                  value={model}
                  onValueChange={(modelId) => {
                    setModel(modelId);
                    setOfferingId(undefined);
                  }}
                  inputModalities={["text"]}
                  outputModalities={["decision"]}
                  selectionPurpose="decision"
                  pinnedOfferingId={offeringId}
                  onOfferingPinChange={setOfferingId}
                  placeholder="Choose a decision model"
                  aria-label="Decision model"
                />
                <Button
                  icon={busy ? <Loader2 className="animate-spin" /> : <Play />}
                  variant="primary"
                  type="button"
                  onClick={run}
                  disabled={busy}
                >
                  {busy ? "Running decision…" : "Run decision"}
                </Button>
              </div>
              {showIssues && validationErrors.length > 0 && (
                <div role="alert" className="rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="font-medium text-foreground">Before it can run</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
                    {validationErrors.map((message, rowIndex, allRows) => (
                      <li key={message}>
                        {message}
                        {rowIndex === allRows.length - 1 && <ErrorAlchemyMenu error={allRows} />}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {error && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-ink">
                  {error}
                  <ErrorAlchemyMenu error={error} />
                </div>
              )}
            </section>
          </main>
          <aside className="min-w-0">
            <OrganizationContextNotice
              state={organizationState}
              what="Decisions"
              onRetry={retry}
              compact
            />
            <DecisionResultCard
              result={result}
              loading={recovering}
              readError={recoverError}
              onRetry={() => setRecoverAttempt((n) => n + 1)}
            />
          </aside>
        </div>
      </div>
    </>
  );
}

function StepLabel({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
      <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs tabular-nums text-primary-ink">
        {step}
      </span>
      {children}
    </h2>
  );
}

function DecisionResultCard({
  result,
  loading,
  readError,
  onRetry,
}: {
  result: DecisionResultView | null;
  loading: boolean;
  /** The saved decision's read failure — shown instead of "No result yet". */
  readError: string | null;
  onRetry: () => void;
}) {
  if (loading)
    return (
      <section className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        <Loader2 className="mr-2 inline size-4 animate-spin" />
        Reconnecting to the saved decision…
      </section>
    );
  if (readError && !result)
    return (
      <ReadFailure
        error={readError}
        what="this saved decision"
        className="m-0"
        onRetry={onRetry}
      />
    );
  if (!result)
    return (
      <section className="rounded-xl border border-dashed border-border bg-muted/30 p-5 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">No result yet</p>
        <p className="mt-1">
          Run a decision to inspect every named answer, distribution, usage, and
          cost here.
        </p>
      </section>
    );
  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {result.source === "live"
            ? "Live decision result"
            : "Recovered decision result"}
        </p>
        <h2 className="mt-1 break-all text-base font-semibold">
          {result.model}
        </h2>
      </div>
      <div className="space-y-2">
        {Object.entries(result.answers).map(([name, answer]) => (
          <AnswerCard key={name} name={name} answer={answer} />
        ))}
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
        <PropertyRow label="Input tokens" value={String(result.inputTokens)} />
        <PropertyRow label="Output tokens" value={String(result.outputTokens)} />
        <PropertyRow
          label="Cost"
          value={<CostDoor usd={result.costUsd} iconOnly />}
        />
        <PropertyRow label="Route" value={result.route ?? "Unavailable"} />
        <PropertyRow label="Execution ID" value={result.executionId} />
        <PropertyRow label="Request ID" value={result.requestId ?? "Unavailable"} />
        <PropertyRow
          label="Provider request"
          value={result.providerRequestId ?? "Unavailable"}
        />
        <PropertyRow label="Offering" value={result.offeringId ?? "Preferred"} />
      </dl>
      <a
        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        href={`?execution_id=${encodeURIComponent(result.executionId)}`}
      >
        <RefreshCw className="size-3.5" />
        Reload this result
      </a>
    </section>
  );
}

function AnswerCard({
  name,
  answer,
}: {
  name: string;
  answer: DecisionResultView["answers"][string];
}) {
  const summary =
    answer.type === "choice"
      ? `Choice: ${answer.choice} · confidence ${(answer.confidence * 100).toFixed(0)}%`
      : answer.type === "score"
        ? `Score: ${answer.score} · confidence ${(answer.confidence * 100).toFixed(0)}%`
        : `How true: ${(answer.noul * 100).toFixed(0)}%`;
  const detail = answer.type === "noul" ? null : answer.probabilities;
  return (
    <article className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="font-medium">{name}</p>
      <p className="mt-1 text-sm">{summary}</p>
      {detail && (
        <div className="mt-2 space-y-1 text-xs">
          <p className="font-medium text-muted-foreground">
            Probability distribution
          </p>
          {Object.entries(detail).map(([label, probability]) => (
            <div
              key={label}
              className="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-2"
            >
              <div className="min-w-0">
                <span className="truncate">{label}</span>
                <div className="mt-1 h-1.5 overflow-hidden rounded bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${Math.max(0, Math.min(100, probability * 100))}%`,
                    }}
                  />
                </div>
              </div>
              <span className="text-right tabular-nums">
                {(probability * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
      {answer.type === "score" && (
        <div className="mt-2 text-xs">
          <p className="font-medium text-muted-foreground">Score legend</p>
          {Object.entries(answer.legend).map(([score, legend]) => (
            <p key={score}>
              {score}:{" "}
              {typeof legend === "string" ? legend : JSON.stringify(legend)}
            </p>
          ))}
        </div>
      )}
      {answer.type === "noul" && (
        <p className="mt-2 text-xs text-muted-foreground">
          {((1 - answer.noul) * 100).toFixed(0)}% false
        </p>
      )}
      <details className="mt-2 text-xs text-muted-foreground">
        <summary className="cursor-pointer">Raw result details</summary>
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap">
          {JSON.stringify(answer, null, 2)}
        </pre>
      </details>
    </article>
  );
}

