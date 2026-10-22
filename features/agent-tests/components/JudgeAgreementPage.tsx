"use client";

/**
 * Judge vs people (Agent Evaluation PLAN §3 Calibration): how often people Agree with the test
 * judge, per judge model and per test case, with Cohen's kappa once there are enough labels.
 * The labels are the Agree / Disagree answers on each result's judge verdict (ResultDetail).
 */

import { useEffect, useState } from "react";
import {
  MatrxDataTable,
  type MatrxColumnDef,
  type MatrxDataTableCopyConfig,
} from "@ai-matrx/design-system/data-table";
import { Badge, RegionSkeleton } from "@ai-matrx/design-system/controls";
import { ReadFailure } from "@ai-matrx/design-system";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { agentTestModes } from "../agentModes";
import {
  fetchJudgeAgreement,
  type AgreementBlock,
  type CaseAgreementRow,
  type JudgeAgreementReport,
  type JudgeAgreementRow,
} from "../agreement";
import type { AgentTestSeat } from "../types";

const percent = (rate: number | null) => (rate === null ? "—" : `${Math.round(rate * 100)}%`);

function kappaCell(row: AgreementBlock) {
  if (row.insufficient || row.kappa === null) return <Badge>Too few labels</Badge>;
  return row.kappa.toFixed(2);
}

function agreementColumns<T extends AgreementBlock>(): MatrxColumnDef<T>[] {
  return [
    { id: "labels", header: "Labels", accessorFn: (r) => r.labels, filter: "number", width: 90 },
    { id: "agreed", header: "Agree", accessorFn: (r) => r.agreed, filter: "number", width: 90 },
    { id: "disagreed", header: "Disagree", accessorFn: (r) => r.disagreed, filter: "number", width: 100 },
    { id: "rate", header: "Agreement", accessorFn: (r) => r.agreementRate, filter: "number", width: 110, cell: (r) => percent(r.agreementRate) },
    { id: "kappa", header: "Kappa", accessorFn: (r) => r.kappa, filter: "number", width: 130, cell: (r) => kappaCell(r) },
  ];
}

const human = (r: AgreementBlock) =>
  [`Labels: ${r.labels}`, `Agree: ${r.agreed}`, `Agreement: ${percent(r.agreementRate)}`,
    `Kappa: ${r.kappa === null ? "too few labels" : r.kappa.toFixed(2)}`].join("\n");

export function JudgeAgreementPage({
  agentId,
  agentName,
  basePath,
  backHref,
  seat,
}: {
  agentId: string;
  agentName: string;
  basePath: string;
  backHref: string;
  seat: AgentTestSeat;
}) {
  const [report, setReport] = useState<JudgeAgreementReport | null>(null);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    let live = true;
    fetchJudgeAgreement(agentId)
      .then((r) => live && setReport(r))
      .catch((e: unknown) => live && setError(e));
    return () => {
      live = false;
    };
  }, [agentId]);

  const judgeColumns: MatrxColumnDef<JudgeAgreementRow>[] = [
    { id: "model", header: "Judge model", accessorFn: (r) => r.model, filter: "text", width: 220 },
    { id: "judge", header: "Judge", accessorFn: (r) => `${r.judgeKey} v${r.judgeVersion}`, filter: "text", width: 240 },
    ...agreementColumns<JudgeAgreementRow>(),
  ];
  const caseColumns: MatrxColumnDef<CaseAgreementRow>[] = [
    { id: "case", header: "Test case", accessorFn: (r) => r.caseLabel ?? r.caseId ?? "—", filter: "text", width: 320 },
    ...agreementColumns<CaseAgreementRow>(),
  ];
  const judgeCopy: MatrxDataTableCopyConfig<JudgeAgreementRow> = {
    label: "Judge agreement",
    listLabel: "Judge agreement by model (this view)",
    location: "Agent tests — judge agreement",
    rowKind: "agent-test-judge-agreement",
    listKind: "agent-test-judge-agreement-list",
    rowDescription: "How often people agreed with one judge model on this agent's test results.",
    listDescription: "People's agreement with each test judge model, with Cohen's kappa.",
    humanRow: (r) => `Judge model: ${r.model}\n${human(r)}`,
  };
  const caseCopy: MatrxDataTableCopyConfig<CaseAgreementRow> = {
    label: "Case agreement",
    listLabel: "Judge agreement by test case (this view)",
    location: "Agent tests — judge agreement",
    rowKind: "agent-test-case-agreement",
    listKind: "agent-test-case-agreement-list",
    rowDescription: "How often people agreed with the judge on one test case.",
    listDescription: "People's agreement with the test judge, per test case.",
    humanRow: (r) => `Test case: ${r.caseLabel ?? r.caseId ?? "—"}\n${human(r)}`,
  };

  return (
    <>
      <RecordPageHeader
        backHref={backHref}
        parents={[{ label: seat === "admin" ? "System agents" : "Agents", href: backHref }]}
        record={{ name: agentName, token: "agent", id: agentId }}
        modes={agentTestModes(basePath, agentId)}
      />
      <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto px-[var(--matrx-page-gutter)] pt-[calc(var(--shell-header-h)+var(--matrx-page-top))]">
        {error ? (
          <ReadFailure what="judge agreement" error={error} />
        ) : report === null ? (
          <RegionSkeleton shape="rows" count={4} aria-label="Loading judge agreement" />
        ) : (
          <>
            <MatrxDataTable<JudgeAgreementRow>
              tableId="agents/test/agreement/judges"
              data={report.byJudge}
              columns={judgeColumns}
              getRowId={(r) => r.key}
              pageSize={0}
              density="condensed"
              viewTabs={false}
              toolbar={{ title: `By judge model · kappa from ${report.minLabels} labels`, searchPlaceholder: "Search judges" }}
              detail={{ enabled: false }}
              copy={judgeCopy}
              emptyState={{ title: "No Agree or Disagree answers yet" }}
            />
            <MatrxDataTable<CaseAgreementRow>
              tableId="agents/test/agreement/cases"
              data={report.byCase}
              columns={caseColumns}
              getRowId={(r) => r.caseId ?? "none"}
              pageSize={0}
              density="condensed"
              viewTabs={false}
              toolbar={{ title: "By test case", searchPlaceholder: "Search cases" }}
              detail={{ enabled: false }}
              copy={caseCopy}
              emptyState={{ title: "No Agree or Disagree answers yet" }}
            />
          </>
        )}
      </div>
    </>
  );
}
