"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, X } from "lucide-react";
import {
  Badge,
  Button,
  PropertyRow,
  RegionSkeleton,
} from "@ai-matrx/design-system/controls";
import { Card, CardContent } from "@ai-matrx/design-system";
import { conversationHref } from "@/features/hindsight/subject-doors";
import { TestCaseInputs } from "@/features/agents/components/samples/TestCaseInputs";
import type { AgentVariableDeclaration } from "@/features/agents/samples/service";
import { fetchJudgeVerdict } from "../service";
import { OUTCOME_META, VERDICT_META, doorLabel } from "../verdicts";
import type {
  AgentTestSeat,
  CheckResultView,
  JudgeVerdictView,
  TestCaseView,
  TestResultView,
} from "../types";
import { TestCost } from "./TestCost";

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
          value={check.expected}
          missing={check.expected === null ? "Hidden" : undefined}
          meta={check.expectedSource || undefined}
        />
        <PropertyRow
          label="Actual"
          value={check.observed}
          missing={check.observedRedacted ? "Hidden" : "Nothing"}
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

function JudgeSection({ id }: { id: string }) {
  const [judge, setJudge] = useState<JudgeVerdictView | null | undefined>(
    undefined,
  );
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
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
        meta={judge.model ?? undefined}
      />
      <PropertyRow
        label="Reasoning"
        value={judge.reasoning}
        missing="None given"
      />
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
            meta={result.doorReason ?? undefined}
          />
          <PropertyRow
            label="Cost"
            value={<TestCost cents={totalCents} seat={seat} />}
          />
          {seat === "admin" ? (
            <>
              <PropertyRow
                label="Identity"
                value={result.identityMode}
                missing="Unknown"
              />
              <PropertyRow
                label="Origin"
                value={result.originClass}
                missing="Unknown"
              />
            </>
          ) : null}
          <PropertyRow
            label="Duration"
            value={
              result.durationMs === null
                ? null
                : `${(result.durationMs / 1000).toFixed(1)} s`
            }
            missing="Not measured"
          />
          <PropertyRow
            label="Setup"
            value={result.setupKey}
            meta={result.repeat > 1 ? `Repeat ${result.repeat}` : undefined}
          />
        </div>

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

        {result.judgeVerdictId ? (
          <JudgeSection id={result.judgeVerdictId} />
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
