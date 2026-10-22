"use client";

import { useEffect, useState } from "react";
import Link from "@/components/navigation/AppLink";
import { ExternalLink, ThumbsDown, ThumbsUp, X } from "lucide-react";
import {
  Badge,
  Button,
  PropertyRow,
  RegionSkeleton,
} from "@ai-matrx/design-system/controls";
import { Card, CardContent } from "@ai-matrx/design-system";
import { formatDurationMs } from "@ai-matrx/kit/format";
import { conversationHref } from "@/features/hindsight/subject-doors";
import { TestCaseInputs } from "@/features/agents/components/samples/TestCaseInputs";
import type { AgentVariableDeclaration } from "@/features/agents/samples/service";
import { fetchJudgeVerdict } from "../service";
import { agreeWithJudge } from "../agreement";
import {
  OUTCOME_META,
  OUTCOME_STATUS_LABEL,
  VERDICT_META,
  doorLabel,
  judgeAsShown,
  judgeMeta,
} from "../verdicts";
import type {
  AgentTestSeat,
  CheckResultView,
  JudgeVerdictView,
  OutcomeJudgeView,
  TestCaseView,
  TestResultView,
} from "../types";
import { TestCost } from "./TestCost";

/** Hidden text never reaches the page: its length and, when stored, the matched window. */
function hiddenText(check: CheckResultView): string {
  const size =
    check.redactedChars === null
      ? "Hidden"
      : `Hidden (${check.redactedChars} characters)`;
  return check.matchWindow ? `${size}: …${check.matchWindow}…` : size;
}

function CheckRow({ check }: { check: CheckResultView }) {
  const meta = OUTCOME_META[check.outcome];
  return (
    <div className="flex flex-col gap-2 border-t border-border py-3 first:border-t-0">
      <div className="flex items-center gap-2">
        <Badge tone={meta.tone}>{meta.label}</Badge>
        <span className="type-title">{check.title}</span>
        {!check.required ? <Badge>Optional</Badge> : null}
        {check.canFail === false ? (
          <Badge tone="warning">Cannot fail</Badge>
        ) : null}
      </div>
      {check.proves ? (
        <span className="type-secondary text-muted-foreground">
          {check.proves}
        </span>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <PropertyRow
          label="Expected"
          value={check.expectedRedacted ? hiddenText(check) : check.expected}
          missing={!check.expectedRedacted && !check.expected ? "Nothing" : undefined}
          meta={check.expectedSource || undefined}
        />
        <PropertyRow
          label="Actual"
          value={check.observedRedacted ? hiddenText(check) : check.observed}
          missing={!check.observedRedacted && !check.observed ? "Nothing" : undefined}
          meta={check.truncated ? "Shortened" : undefined}
        />
      </div>
      {check.reason ? (
        <span className="type-secondary text-muted-foreground">
          {check.reason}
        </span>
      ) : null}
    </div>
  );
}

/** What the result's stored outcome says about the judge: advisory, or not fed every fact. */
function JudgeOutcomeRows({ judge }: { judge: OutcomeJudgeView }) {
  return (
    <>
      {judge.advisory ? (
        <PropertyRow
          label="Advisory"
          value={judge.advisoryReason ?? "Below the agreement bar"}
        />
      ) : null}
      {judge.fedOk === false ? (
        <PropertyRow
          label="Judge input"
          value="Missing expected facts"
          meta={judge.missingFacts.join(", ") || undefined}
        />
      ) : null}
    </>
  );
}

/** Agree / Disagree with the judge: one click, stored on the server, attributed to the person. */
function JudgeAgreement({ resultId, agreed }: { resultId: string; agreed: boolean | null }) {
  const [value, setValue] = useState<boolean | null>(agreed);
  const [saving, setSaving] = useState<boolean | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const answer = async (agree: boolean) => {
    setSaving(agree);
    setFailed(null);
    try {
      setValue(await agreeWithJudge(resultId, agree));
    } catch (error: unknown) {
      setFailed(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(null);
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="type-label">Your call</span>
      <Button
        variant={value === true ? "outline" : "quiet"}
        icon={<ThumbsUp />}
        aria-pressed={value === true}
        disabled={saving !== null}
        onClick={() => void answer(true)}
      >
        {saving === true ? "Saving…" : "Agree"}
      </Button>
      <Button
        variant={value === false ? "outline" : "quiet"}
        icon={<ThumbsDown />}
        aria-pressed={value === false}
        disabled={saving !== null}
        onClick={() => void answer(false)}
      >
        {saving === false ? "Saving…" : "Disagree"}
      </Button>
      {failed ? <span className="text-destructive type-meta">{failed}</span> : null}
    </div>
  );
}

function JudgeSection({
  id,
  resultId,
  outcome,
}: {
  id: string | null;
  resultId: string;
  outcome: OutcomeJudgeView | null;
}) {
  const [judge, setJudge] = useState<JudgeVerdictView | null | undefined>(
    undefined,
  );
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    let live = true;
    fetchJudgeVerdict(id)
      .then((row) => live && setJudge(row))
      .catch(
        (error: unknown) =>
          live &&
          setFailed(error instanceof Error ? error.message : String(error)),
      );
    return () => {
      live = false;
    };
  }, [id]);
  if (!id) {
    if (!outcome) return null;
    return (
      <>
        <PropertyRow
          label="Judge"
          value={outcome.verdict}
          missing={outcome.verdict ? undefined : "No verdict"}
          meta={judgeMeta(null, outcome)}
        />
        <JudgeOutcomeRows judge={outcome} />
      </>
    );
  }
  if (failed) return <PropertyRow label="Judge" value={failed} />;
  if (judge === undefined)
    return (
      <RegionSkeleton
        shape="rows"
        count={2}
        aria-label="Loading the judge's verdict"
      />
    );
  if (judge === null)
    return <PropertyRow label="Judge" missing="Not readable" />;
  return (
    <>
      <PropertyRow
        label="Judge"
        value={judge.verdict}
        meta={judgeMeta(judge.model, outcome)}
      />
      {outcome ? <JudgeOutcomeRows judge={outcome} /> : null}
      <PropertyRow
        label="Reasoning"
        value={judge.reasoning}
        missing={judge.reasoning ? undefined : "None given"}
      />
      {judge.verdict ? <JudgeAgreement resultId={resultId} agreed={judge.agreed} /> : null}
    </>
  );
}

/**
 * One result: every check (expected vs actual, where the expected came from),
 * the case's inputs, the judge, the door, cost and the doors to the
 * conversation and (admin) the request. Doors and identity are API mechanics,
 * so they show here and on admin pages only (PLAN §7).
 */
export function ResultDetail({
  result,
  testCase,
  declarations,
  seat,
  onClose,
}: {
  result: TestResultView;
  testCase: TestCaseView | null;
  declarations: readonly AgentVariableDeclaration[];
  seat: AgentTestSeat;
  onClose: () => void;
}) {
  const verdict = result.verdict ? VERDICT_META[result.verdict] : null;
  const audience = seat === "admin" ? "admin" : "product";
  const totalCents =
    result.runCostCents === null && result.judgeCostCents === null
      ? null
      : (result.runCostCents ?? 0) + (result.judgeCostCents ?? 0);
  return (
    <Card>
      <CardContent gap="md">
        <div className="flex items-center gap-2">
          {verdict ? (
            <Badge tone={verdict.tone}>{verdict.label}</Badge>
          ) : (
            <Badge>Pending</Badge>
          )}
          <span className="type-title min-w-0 truncate">
            {testCase?.label ?? "Test case"}
          </span>
          <Button
            variant="quiet"
            aria-label="Close result"
            icon={<X />}
            onClick={onClose}
            className="ml-auto"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <PropertyRow
            label="Door"
            value={doorLabel(result.door)}
            meta={seat === "admin" ? result.doorReason : undefined}
          />
          <PropertyRow
            label="Cost"
            value={<TestCost cents={totalCents} seat={seat} inline />}
          />
          {seat === "admin" ? (
            <>
              <PropertyRow
                label="Identity"
                value={result.identityMode}
                missing={result.identityMode ? undefined : "Unknown"}
              />
              <PropertyRow
                label="Origin"
                value={result.originClass}
                missing={result.originClass ? undefined : "Unknown"}
              />
            </>
          ) : null}
          <PropertyRow
            label="Duration"
            value={
              result.durationMs === null
                ? null
                : formatDurationMs(result.durationMs)
            }
            missing={result.durationMs === null ? "Not measured" : undefined}
          />
          <PropertyRow
            label="Setup"
            value={result.setupKey}
            meta={result.repeat > 1 ? `Repeat ${result.repeat}` : undefined}
          />
        </div>

        {result.verdictReason ? (
          <PropertyRow label="Why" value={result.verdictReason} />
        ) : null}
        {result.outcome && result.outcome.status !== "completed" ? (
          <PropertyRow
            label="Outcome"
            value={
              OUTCOME_STATUS_LABEL[result.outcome.status] ??
              result.outcome.status
            }
            meta={result.outcome.message ?? undefined}
          />
        ) : null}
        {result.blockedBy ? (
          <PropertyRow
            label="Blocked by"
            value={[result.blockedBy.gate, result.blockedBy.kind]
              .filter(Boolean)
              .join(" · ")}
          />
        ) : null}
        {result.error ? (
          <PropertyRow label="Error" value={result.error} />
        ) : null}

        <div className="flex flex-wrap gap-2">
          {result.conversationId ? (
            <Button asChild variant="outline" iconEnd={<ExternalLink />}>
              <Link
                href={conversationHref(result.conversationId, audience)}
                target="_blank"
                rel="noopener"
              >
                Conversation
              </Link>
            </Button>
          ) : null}
          {seat === "admin"
            ? result.userRequestIds.map((requestId, index) => (
                <Button
                  key={requestId}
                  asChild
                  variant="outline"
                  iconEnd={<ExternalLink />}
                >
                  <Link
                    href={`/administration/chat/cx-dashboard/requests/${requestId}`}
                    target="_blank"
                    rel="noopener"
                  >
                    {result.userRequestIds.length > 1
                      ? `Request, turn ${index + 1}`
                      : "Request"}
                  </Link>
                </Button>
              ))
            : null}
        </div>

        <div className="flex flex-col">
          <span className="type-label">Checks</span>
          {result.checks.length === 0 ? (
            <PropertyRow label="Checks" missing="None recorded" />
          ) : (
            result.checks.map((check) => (
              <CheckRow key={check.id} check={check} />
            ))
          )}
        </div>

        {result.judgeVerdictId || result.outcome?.judge ? (
          <JudgeSection
            id={result.judgeVerdictId}
            resultId={result.id}
            outcome={judgeAsShown(result.outcome?.judge ?? null, result.verdict)}
          />
        ) : null}

        {testCase ? (
          <div className="flex flex-col gap-2">
            <span className="type-label">Inputs</span>
            <TestCaseInputs
              conversationId={
                result.conversationId ?? `test-case:${testCase.id}`
              }
              userInput={testCase.userInput}
              inputContent={[]}
              variables={testCase.variables}
              declarations={declarations}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
