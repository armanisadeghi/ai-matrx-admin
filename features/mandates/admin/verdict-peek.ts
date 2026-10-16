/**
 * One impact verdict as THE Peek's record — everything `VerdictDetail` says about a row, as data:
 * grade, who holds it, the version move, each finding (with its severity), the settings warning, the
 * too-young and blocker notes, and why the row is not in a batch. Every word is the server's
 * (`./impact`); this only lays it out.
 */

import type { PeekBlock, PeekRecord } from "@ai-matrx/design-system";
import {
  BLOCKER_META,
  GRADE_META,
  batchEligibilityOf,
  changeFindingsOf,
  newestLabelOf,
  pinnedLabelOf,
  setAsideReasonOf,
  settingsSignalOf,
  tooYoungReasonOf,
  type ImpactVerdict,
} from "./impact";

const TONE: Record<string, "danger" | "warning" | "success"> = { red: "danger", orange: "warning", green: "success" };

export function verdictPeekRecord(verdict: ImpactVerdict): PeekRecord {
  const settings = settingsSignalOf(verdict);
  const reason = setAsideReasonOf(verdict);
  const eligibility = batchEligibilityOf(verdict);
  const tooYoung = tooYoungReasonOf(verdict);
  const findings = changeFindingsOf(verdict);

  const body: PeekBlock[] = [
    { property: "Grade", value: GRADE_META[verdict.grade].label },
    {
      property: "Held by",
      value: verdict.holder_kind === "binding" ? `${verdict.principal.kind} binding` : "mandate default",
    },
    { property: "Version", value: `${pinnedLabelOf(verdict)} → ${newestLabelOf(verdict)}` },
  ];
  if (findings.length > 0) {
    body.push({
      section: "What changed",
      rows: findings.map((finding) => ({ text: finding.message, tone: TONE[finding.grade] ?? "neutral" })),
    });
  } else {
    body.push({
      fact:
        verdict.grade === "identical"
          ? "No change between these versions affects a run."
          : "The server graded this row but listed no finding.",
      muted: true,
      wrap: true,
    });
  }
  if (tooYoung) body.push({ fact: `Not automatic — ${tooYoung}.`, wrap: true });
  if (verdict.blocker) {
    body.push({
      fact: `${BLOCKER_META[verdict.blocker].label}: ${BLOCKER_META[verdict.blocker].meaning}${reason ? ` “${reason}”` : ""}`,
      wrap: true,
    });
  }
  if (!eligibility.batchable) body.push({ fact: `Not in a batch — ${eligibility.why}`, muted: true, wrap: true });
  if (verdict.lineage_path && verdict.lineage_path.length > 1) {
    body.push({
      fact: `Reached through lineage: ${verdict.lineage_path
        .map((step) => (step.relation === "self" ? step.agent_name : `duplicate → ${step.agent_name}`))
        .join(" ")}`,
      muted: true,
      wrap: true,
    });
  }

  return {
    kind: "Impact verdict",
    id: `${verdict.mandate_key}:${verdict.agent_name}`,
    title: `${verdict.agent_name} — what changed`,
    ...(settings.state !== "clean"
      ? { callout: { title: settings.state === "unmeasured" ? "Unmeasured" : "Settings", text: settings.sentence } }
      : {}),
    body,
  };
}
