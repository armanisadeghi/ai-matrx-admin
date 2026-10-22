/**
 * Agree / Disagree on a judge verdict and the judge-vs-people agreement report (Agent Evaluation
 * PLAN §3 Calibration, §7). The person's click is stored on the server as their feedback row on the
 * verdict plus the ledger stamp (aidream `agent_tests/agreement.py`); the report is computed there
 * (one kappa implementation, `matrx_ai.evaluators.calibration`).
 */

import type { OperationDescriptor } from "@ai-matrx/api";
import { serverApi } from "@/lib/api/server-api";
import { isJsonObject } from "@/types/json";

const AGREE_OP: OperationDescriptor = {
  m: "POST",
  p: "/agent-tests/results/{result_id}/agreement",
  d: "aidream",
  a: "user",
  o: "required",
  n: "agent_tests.agree_with_judge",
};
const AGREEMENT_OP: OperationDescriptor = { ...AGREE_OP, m: "GET", p: "/agent-tests/agreement", n: "agent_tests.judge_agreement" };

export interface AgreementBlock {
  labels: number;
  agreed: number;
  disagreed: number;
  /** 0..1, null with no labels. */
  agreementRate: number | null;
  /** Cohen's kappa; null until the label floor (`minLabels`) is reached. */
  kappa: number | null;
  insufficient: boolean;
}

export interface JudgeAgreementRow extends AgreementBlock {
  key: string;
  judgeKey: string;
  judgeVersion: number;
  model: string;
}

export interface CaseAgreementRow extends AgreementBlock {
  caseId: string | null;
  caseLabel: string | null;
}

export interface JudgeAgreementReport {
  minLabels: number;
  labels: number;
  byJudge: JudgeAgreementRow[];
  byCase: CaseAgreementRow[];
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string => (typeof v === "string" ? v : "");

function block(row: Record<string, unknown>): AgreementBlock {
  return {
    labels: num(row.labels) ?? 0,
    agreed: num(row.agreed) ?? 0,
    disagreed: num(row.disagreed) ?? 0,
    agreementRate: num(row.agreement_rate),
    kappa: num(row.kappa),
    insufficient: row.status !== "scored",
  };
}

export function readAgreementReport(data: unknown): JudgeAgreementReport {
  if (!isJsonObject(data)) throw new Error("The server answered the agreement report in an unexpected shape.");
  const rows = (v: unknown) => (Array.isArray(v) ? v.filter(isJsonObject) : []);
  return {
    minLabels: num(data.min_labels) ?? 0,
    labels: num(data.labels) ?? 0,
    byJudge: rows(data.by_judge).map((r) => ({
      ...block(r),
      key: `${str(r.judge_key)}:${num(r.judge_version) ?? 1}:${str(r.model)}`,
      judgeKey: str(r.judge_key),
      judgeVersion: num(r.judge_version) ?? 1,
      model: str(r.model),
    })),
    byCase: rows(data.by_case).map((r) => ({
      ...block(r),
      caseId: str(r.case_id) || null,
      caseLabel: str(r.case_label) || null,
    })),
  };
}

export async function fetchJudgeAgreement(agentId: string): Promise<JudgeAgreementReport> {
  return readAgreementReport(await serverApi.call<unknown>(AGREEMENT_OP, { query: { agent_id: agentId } }));
}

/** One click: the signed-in person agrees (true) or disagrees (false) with this result's judge. */
export async function agreeWithJudge(resultId: string, agree: boolean): Promise<boolean> {
  const data = await serverApi.call<unknown>(AGREE_OP, { path: { result_id: resultId }, body: { agree } });
  if (!isJsonObject(data) || typeof data.agreed !== "boolean") {
    throw new Error("The server stored the answer but replied in an unexpected shape.");
  }
  return data.agreed;
}
