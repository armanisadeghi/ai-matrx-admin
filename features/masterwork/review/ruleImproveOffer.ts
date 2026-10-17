// features/masterwork/review/ruleImproveOffer.ts
//
// The `masterwork.rule_improve` offered values a caller of the one improve
// runner holds as REAL facts, sent by name beside rule / expert_input /
// rulebook_context. The runner launches on the MANDATE door
// (useLiveAgentRun({ mandateKey })), where these mapped-only values are dropped
// on the default pin — current Holders receive exactly what they did before.
// Absent facts are omitted, never sent as "" or null.

import type { MasterworkRuleImproveOffer } from "@ai-matrx/agents/generated/provision-offers";
import { ruleState, type Rulebook, type RulebookRule } from "../types";

/**
 * The offered names. `rulebook_context` is GUARANTEED (the mandate door refuses
 * the run without it), so it is a required parameter and stays required in the
 * return type; `rule` / `expert_input` are optional by-name values the runner
 * sets itself (guard: `pnpm check:offer-guarantees`).
 */
/**
 * Callers hand `rulebook_context` the Rulebook scope as a RAW object (the
 * server's prompt door canonicalizes it — never JSON.stringify), so its value
 * is widened to `unknown`; the mapped type keeps the key REQUIRED.
 */
type WithRawValue<T, K extends keyof T> = { [P in keyof T]: P extends K ? unknown : T[P] };

export type RuleImproveOfferVariables = WithRawValue<
  Omit<MasterworkRuleImproveOffer, "__kind" | "rule" | "expert_input">,
  "rulebook_context"
>;

export interface RuleImproveOfferInput {
  /** The loaded Rulebook, when the caller holds it. */
  rulebook?: Pick<Rulebook, "name" | "description" | "sections" | "rules" | "source"> | null;
  /** The existing rule being rewritten/tidied, when there is one. */
  rule?: Pick<RulebookRule, "feedback" | "rejected" | "chapter"> | null;
  /** A Final Checkup suggestion's own evidence and reason. */
  suggestion?: { evidence?: string | null; reason?: string | null } | null;
}

function text(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export function ruleImproveOfferVariables(
  rulebookContext: unknown,
  input: RuleImproveOfferInput,
): RuleImproveOfferVariables {
  const out: RuleImproveOfferVariables = { rulebook_context: rulebookContext };
  const rb = input.rulebook;
  if (rb) {
    const name = text(rb.name);
    if (name) out.rulebook_name = name;
    const description = text(rb.description);
    if (description) out.rulebook_description = description;
    const codes = Object.keys(rb.sections ?? {});
    if (codes.length > 0) {
      out.rulebook_sections = codes
        .map((code) => {
          const label = text(rb.sections[code]?.label);
          return label ? `- ${code}: ${label}` : `- ${code}`;
        })
        .join("\n");
    }
    const rules = rb.rules ?? [];
    if (rules.length > 0) {
      out.rulebook_rules = rules
        .map(
          (r) =>
            `- **${r.name}** [${r.id}] (${ruleState(r)}, section ${r.section}): ${r.statement}`,
        )
        .join("\n");
    }
    const src = rb.source ?? {};
    const sourceParts = [
      text(src.title),
      text(src.author) ? `by ${text(src.author)}` : null,
      src.year !== undefined && src.year !== null && String(src.year).trim()
        ? `(${String(src.year).trim()})`
        : null,
    ].filter(Boolean);
    if (sourceParts.length > 0) out.rulebook_source = sourceParts.join(" ");
  }
  const rule = input.rule;
  if (rule) {
    const feedback = text(rule.feedback);
    if (feedback) out.rule_feedback = feedback;
    if (typeof rule.rejected === "boolean") out.rule_was_rejected = rule.rejected;
    const chapter = text(rule.chapter);
    if (chapter) out.rule_chapter = chapter;
  }
  const evidence = text(input.suggestion?.evidence);
  if (evidence) out.source_evidence = evidence;
  const reason = text(input.suggestion?.reason);
  if (reason) out.suggestion_reason = reason;
  return out;
}
