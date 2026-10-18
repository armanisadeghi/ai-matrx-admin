"use client";

// features/masterwork/components/masterworks/RuleFidelityTable.tsx
//
// RULE BY RULE, BOTH LEGS. The Audition's verdict used to reach the Expert as
// two headline numbers ("Masterwork 38.9, vanilla 30") over a single-leg list
// of rules — the plain model's standing on each rule was computed, stored, and
// never shown. The hand-run benchmark this Audition exists to automate
// (common-docs/projects/teach-parenting-pair/BENCHMARK-SIMPLE-PATH.md) reported
// exactly the thing the numbers hide: WHICH rules each side won, and why.
//
// So this is the verdict's body, not a garnish: one row per rule the judge
// read, the Masterwork's standing against the original beside the plain
// model's on the same rule, and an honest "not judged on this rule" where an
// arm was never asked — never a silent drop into the headline.

import Link from "next/link";

import type { RulebookRule } from "../../types";
import { ruleAnchorId } from "../detail/RuleRelations";
import type { AuditionVerdict, RuleFinding } from "./auditionVerdict";
import {
  MatrxComparisonTable,
  type ComparisonCell,
  type ComparisonRow,
  type ComparisonSubject,
} from "@ai-matrx/design-system/data-table";

const WINNER_COPY: Record<string, { label: string; cls: string }> = {
  candidate: { label: "wins", cls: "text-primary" },
  reference: { label: "loses", cls: "text-destructive" },
  tie: { label: "even", cls: "text-muted-foreground" },
};

export function RuleFidelityTable({
  verdict,
  rulebookId,
  rulesById,
}: {
  verdict: AuditionVerdict;
  rulebookId: string;
  rulesById: Map<string, RulebookRule>;
}) {
  if (verdict.findings.length === 0 && verdict.vanilla_findings.length === 0) {
    return null;
  }
  const vanillaById = new Map(
    verdict.vanilla_findings.map((f) => [f.rule_id, f] as const),
  );
  const seen = new Set(verdict.findings.map((f) => f.rule_id));
  const rows = [
    ...verdict.findings,
    ...verdict.vanilla_findings.filter((f) => !seen.has(f.rule_id)),
  ];
  const showVanilla = verdict.vanilla_compared;
  const mineById = new Map(verdict.findings.map((f) => [f.rule_id, f] as const));
  const subjects: ComparisonSubject[] = [
    { id: "mine", label: "Yours vs the original" },
    ...(showVanilla ? [{ id: "vanilla", label: "Vanilla AI vs the original" }] : []),
  ];
  const findingCell = (finding: RuleFinding | undefined): ComparisonCell => {
    // An arm never asked about a rule says so — never a silent drop.
    if (!finding) {
      return {
        text: "not judged on this rule",
        node: <span className="text-muted-foreground">not judged on this rule</span>,
      };
    }
    const copy = WINNER_COPY[finding.winner];
    const label = copy?.label ?? finding.winner;
    return {
      text: finding.note ? `${label} — ${finding.note}` : label,
      node: (
        <span>
          <span className={copy?.cls}>{label}</span>
          {finding.note ? (
            <span className="text-muted-foreground"> — {finding.note}</span>
          ) : null}
        </span>
      ),
    };
  };
  const tableRows: ComparisonRow[] = rows.map((row) => {
    const rule = rulesById.get(row.rule_id);
    return {
      id: row.rule_id,
      label: rule?.name ?? "a rule that is no longer in this Rulebook",
      header: rule ? (
        <Link
          href={`/masterwork/${rulebookId}#${ruleAnchorId(rule.id)}`}
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          {rule.name}
        </Link>
      ) : (
        <span className="font-medium text-warning">
          a rule that is no longer in this Rulebook
        </span>
      ),
      cell: (subject) =>
        findingCell(
          subject.id === "mine" ? mineById.get(row.rule_id) : vanillaById.get(row.rule_id),
        ),
    };
  });
  return (
    <MatrxComparisonTable
      title="Rule by rule"
      hideTitle
      location="Masterwork Audition"
      cornerLabel="Rule"
      subjects={subjects}
      rows={tableRows}
      cellLines="four"
      subjectWidth={280}
      aiContext="Each rule the judge read: how the Masterwork did against the original, beside the plain model on the same rule."
    />
  );
}
