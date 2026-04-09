/**
 * Model Constraints — Evaluator
 *
 * Evaluates declarative constraints stored on `ai_model.constraints` JSONB.
 * Supports two constraint kinds:
 *
 *   Unconditional — single-field checks that always apply
 *     { id, rule, field, value?, severity, message }
 *
 *   Conditional — "require X when Y is true"
 *     { id, when: { field, op, value? }, require: { field, op, value? }, severity, message }
 *
 * All types are imported from `@/features/ai-models/types` — this file
 * contains only evaluation logic.
 */

import type {
  ModelConstraint,
  UnconditionalConstraint,
  ConditionalConstraint,
  FieldCondition,
} from "@/features/ai-models/types";
import { isConditionalConstraint } from "@/features/ai-models/types";
import type { ValidationIssue, ValidationSeverity } from "./types";

// =============================================================================
// Condition evaluator — shared by both constraint kinds
// =============================================================================

function evaluateCondition(
  cond: FieldCondition,
  settings: Record<string, unknown>,
): boolean {
  const actual = settings[cond.field];

  switch (cond.op) {
    case "eq":
      return actual === cond.value;
    case "neq":
      return actual !== cond.value;
    case "gt":
      return typeof actual === "number" && actual > (cond.value as number);
    case "gte":
      return typeof actual === "number" && actual >= (cond.value as number);
    case "lt":
      return typeof actual === "number" && actual < (cond.value as number);
    case "lte":
      return typeof actual === "number" && actual <= (cond.value as number);
    case "in":
      return Array.isArray(cond.value) && cond.value.includes(actual);
    case "not_in":
      return Array.isArray(cond.value) && !cond.value.includes(actual);
    case "exists":
      return actual !== undefined && actual !== null;
    case "not_exists":
      return actual === undefined || actual === null;
    default:
      return false;
  }
}

// =============================================================================
// Unconditional constraint evaluator
// =============================================================================

function evaluateUnconditional(
  constraint: UnconditionalConstraint,
  settings: Record<string, unknown>,
): ValidationIssue | null {
  const { id, rule, field, value, severity, message } = constraint;
  const actual = settings[field];

  const issue = (
    category: ValidationIssue["category"],
    suggestion: string,
  ): ValidationIssue => ({
    ruleId: "model-constraints",
    key: field,
    severity: severity as ValidationSeverity,
    category,
    message,
    value: actual,
    suggestion,
  });

  switch (rule) {
    case "required": {
      if (actual === undefined || actual === null) {
        return issue("missing_required", `Provide a value for "${field}"`);
      }
      return null;
    }

    case "fixed": {
      if (actual === undefined || actual === null) {
        return issue(
          "invalid_value",
          `Set "${field}" to ${JSON.stringify(value)}`,
        );
      }
      if (actual !== value) {
        return issue(
          "invalid_value",
          `Set "${field}" to ${JSON.stringify(value)}`,
        );
      }
      return null;
    }

    case "min": {
      if (actual === undefined || actual === null) return null;
      if (typeof actual !== "number" || typeof value !== "number") return null;
      if (actual < value) {
        return issue("range_violation", `Set "${field}" to at least ${value}`);
      }
      return null;
    }

    case "max": {
      if (actual === undefined || actual === null) return null;
      if (typeof actual !== "number" || typeof value !== "number") return null;
      if (actual > value) {
        return issue("range_violation", `Set "${field}" to at most ${value}`);
      }
      return null;
    }

    case "one_of": {
      if (actual === undefined || actual === null) return null;
      if (!Array.isArray(value)) return null;
      if (!value.includes(actual)) {
        return issue(
          "invalid_value",
          `Set "${field}" to one of: ${value.join(", ")}`,
        );
      }
      return null;
    }

    case "forbidden": {
      if (actual !== undefined && actual !== null) {
        return issue("invalid_value", `Remove "${field}"`);
      }
      return null;
    }

    default:
      return null;
  }
}

// =============================================================================
// Conditional constraint evaluator
// =============================================================================

function evaluateConditional(
  constraint: ConditionalConstraint,
  settings: Record<string, unknown>,
): ValidationIssue | null {
  const triggered = evaluateCondition(constraint.when, settings);
  if (!triggered) return null;

  const satisfied = evaluateCondition(constraint.require, settings);
  if (satisfied) return null;

  return {
    ruleId: "model-constraints",
    key: constraint.require.field,
    severity: constraint.severity as ValidationSeverity,
    category: "cross_field",
    message: constraint.message,
    value: settings[constraint.require.field],
    suggestion: `When ${constraint.when.field} ${constraint.when.op} ${JSON.stringify(constraint.when.value)}, set ${constraint.require.field} to satisfy: ${constraint.require.op} ${JSON.stringify(constraint.require.value)}`,
  };
}

// =============================================================================
// Public API
// =============================================================================

export function evaluateConstraint(
  constraint: ModelConstraint,
  settings: Record<string, unknown>,
): ValidationIssue | null {
  if (isConditionalConstraint(constraint)) {
    return evaluateConditional(constraint, settings);
  }
  return evaluateUnconditional(constraint, settings);
}

export function evaluateAllConstraints(
  constraints: ModelConstraint[],
  settings: Record<string, unknown>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const constraint of constraints) {
    const issue = evaluateConstraint(constraint, settings);
    if (issue) issues.push(issue);
  }
  return issues;
}
