/**
 * One impact verdict as THE Peek's record — everything `VerdictDetail` says about a row, as data:
 * grade, who holds it, the version move, each finding (with its severity), the settings warning, the
 * too-young and blocker notes, why the row is not in a batch, and the lineage it was reached through.
 * Every word is the server's (`./impact`); this only lays it out.
 *
 * ONE builder for every Peek of a verdict (the batch panel's single row, the grade cell's hover that
 * stacks a default and its bindings): `verdictPeekParts`. Nothing either caller showed is dropped.
 */

import type { PeekBlock, PeekRecord, PeekTone } from "@ai-matrx/design-system";
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

const GRADE_TONE: Record<ImpactVerdict["grade"], PeekTone> = {
  identical: "neutral",
  green: "success",
  orange: "warning",
  red: "danger",
};

export interface VerdictPeekOptions {
  /** Stacked use (several verdicts in one Peek): a toned section heading carrying grade and holder, instead of Grade / Held by properties. */
  heading?: string;
}

export interface VerdictPeekParts {
  /** The settings warning, as a record-level callout (single-verdict Peek). */
  callout?: { title: string; text: string };
  blocks: PeekBlock[];
}

export function verdictPeekParts(verdict: ImpactVerdict, options: VerdictPeekOptions = {}): VerdictPeekParts {
  const settings = settingsSignalOf(verdict);
  const reason = setAsideReasonOf(verdict);
  const eligibility = batchEligibilityOf(verdict);
  const tooYoung = tooYoungReasonOf(verdict);
  const findings = changeFindingsOf(verdict);
  const holder = verdict.holder_kind === "binding" ? `${verdict.principal.kind} binding` : "mandate default";

  const blocks: PeekBlock[] = options.heading
    ? [{ section: options.heading, tone: GRADE_TONE[verdict.grade], text: `${GRADE_META[verdict.grade].label} · ${holder}` }]
    : [
        { property: "Grade", value: GRADE_META[verdict.grade].label },
        { property: "Held by", value: holder },
      ];
  blocks.push({ property: "Versions", value: `${pinnedLabelOf(verdict)} → ${newestLabelOf(verdict)}` });
  if (findings.length > 0) {
    blocks.push({
      section: "Findings",
      rows: findings.map((finding) => ({ text: finding.message, tone: TONE[finding.grade] ?? "neutral" })),
    });
  } else {
    blocks.push({
      fact:
        verdict.grade === "identical"
          ? "No change between these versions affects a run."
          : "The server graded this row but listed no finding.",
      muted: true,
      wrap: true,
    });
  }
  if (tooYoung) blocks.push({ fact: `Not automatic — ${tooYoung}.`, wrap: true });
  if (verdict.blocker) {
    blocks.push({
      fact: `${BLOCKER_META[verdict.blocker].label}: ${BLOCKER_META[verdict.blocker].meaning}${reason ? ` “${reason}”` : ""}`,
      wrap: true,
    });
  }
  if (!eligibility.batchable) blocks.push({ fact: `Not in a batch — ${eligibility.why}`, muted: true, wrap: true });
  if (verdict.lineage_path && verdict.lineage_path.length > 1) {
    blocks.push({
      fact: `Reached through lineage: ${verdict.lineage_path
        .map((step) => (step.relation === "self" ? step.agent_name : `duplicate → ${step.agent_name}`))
        .join(" ")}`,
      muted: true,
      wrap: true,
    });
  }
  return {
    ...(settings.state !== "clean"
      ? { callout: { title: settings.state === "unmeasured" ? "Unmeasured" : "Settings", text: settings.sentence } }
      : {}),
    blocks,
  };
}

/** A stacked verdict's blocks: the settings warning has no record to hang a callout on, so it joins as a section. */
export function verdictPeekBlocks(verdict: ImpactVerdict, heading: string): PeekBlock[] {
  const { callout, blocks } = verdictPeekParts(verdict, { heading });
  return callout ? [...blocks, { section: callout.title, tone: "warning", text: callout.text }] : blocks;
}

export function verdictPeekRecord(verdict: ImpactVerdict): PeekRecord {
  const { callout, blocks } = verdictPeekParts(verdict);
  return {
    kind: "Impact verdict",
    id: `${verdict.mandate_key}:${verdict.agent_name}`,
    title: `${verdict.agent_name} — what changed`,
    ...(callout ? { callout } : {}),
    body: blocks,
  };
}
