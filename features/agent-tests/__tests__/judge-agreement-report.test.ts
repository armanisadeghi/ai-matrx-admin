/**
 * The agreement page reads the server's judge-vs-people report as it is (Agent Evaluation PLAN §3):
 * kappa only when the server scored it, "too few labels" otherwise — never a kappa shown under the floor.
 */
import { readAgreementReport } from "../agreement";

describe("judge agreement report", () => {
  it("reads per judge model and per case, and keeps kappa empty under the label floor", () => {
    const report = readAgreementReport({
      min_labels: 50,
      labels: 3,
      by_judge: [
        { judge_key: "agent_tests.fact_judge", judge_version: 1, model: "claude-haiku-5-5", labels: 3, agreed: 2, disagreed: 1, agreement_rate: 2 / 3, kappa: null, status: "insufficient_data" },
      ],
      by_case: [{ case_id: "c1", case_label: "PB-02", labels: 3, agreed: 2, disagreed: 1, agreement_rate: 2 / 3, kappa: null, status: "insufficient_data" }],
    });
    expect(report.minLabels).toBe(50);
    expect(report.byJudge[0]).toMatchObject({ model: "claude-haiku-5-5", labels: 3, agreed: 2, insufficient: true, kappa: null });
    expect(report.byJudge[0].key).toBe("agent_tests.fact_judge:1:claude-haiku-5-5");
    expect(report.byCase[0]).toMatchObject({ caseId: "c1", caseLabel: "PB-02", agreementRate: 2 / 3 });
  });

  it("a scored judge carries its kappa", () => {
    const report = readAgreementReport({ min_labels: 50, labels: 60, by_judge: [{ judge_key: "k", judge_version: 1, model: "m", labels: 60, agreed: 50, disagreed: 10, agreement_rate: 50 / 60, kappa: 0.71, status: "scored" }], by_case: [] });
    expect(report.byJudge[0]).toMatchObject({ kappa: 0.71, insufficient: false });
  });

  it("an unexpected answer is said, never shown as an empty report", () => {
    expect(() => readAgreementReport("oops")).toThrow("unexpected shape");
  });
});
