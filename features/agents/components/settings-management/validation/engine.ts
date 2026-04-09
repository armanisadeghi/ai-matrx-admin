/**
 * Validation Engine
 *
 * Collects rules from the registry, executes them against a resolved
 * configuration, and aggregates results into a uniform ValidationResult.
 *
 * This is infrastructure — rule authors never modify this file.
 */

import type {
  ValidationRule,
  ValidationIssue,
  ValidationResult,
  ValidationSeverity,
  ResolvedConfig,
} from "./types";
import { RULES } from "./rules";

function emptyResult(): ValidationResult {
  return {
    issues: [],
    issuesByKey: {},
    issuesBySeverity: { error: [], warning: [], info: [] },
    hasErrors: false,
    hasWarnings: false,
    total: 0,
  };
}

/**
 * Run all registered rules against a resolved configuration.
 *
 * Optionally filter to a subset of rule IDs or categories.
 */
export function validateConfig(
  config: ResolvedConfig,
  options?: {
    ruleIds?: string[];
    excludeRuleIds?: string[];
  },
): ValidationResult {
  const result = emptyResult();

  let rulesToRun: readonly ValidationRule[] = RULES;

  if (options?.ruleIds) {
    const allowed = new Set(options.ruleIds);
    rulesToRun = RULES.filter((r) => allowed.has(r.id));
  }

  if (options?.excludeRuleIds) {
    const excluded = new Set(options.excludeRuleIds);
    rulesToRun = rulesToRun.filter((r) => !excluded.has(r.id));
  }

  for (const rule of rulesToRun) {
    let issues: ValidationIssue[];
    try {
      issues = rule.validate(config);
    } catch (err) {
      console.error(`[ValidationEngine] Rule "${rule.id}" threw:`, err);
      continue;
    }

    for (const issue of issues) {
      result.issues.push(issue);

      if (!result.issuesByKey[issue.key]) {
        result.issuesByKey[issue.key] = [];
      }
      result.issuesByKey[issue.key].push(issue);

      result.issuesBySeverity[issue.severity].push(issue);
    }
  }

  result.total = result.issues.length;
  result.hasErrors = result.issuesBySeverity.error.length > 0;
  result.hasWarnings = result.issuesBySeverity.warning.length > 0;

  return result;
}

/**
 * Build a highlight map for JSON viewers.
 * Maps setting keys to the highest severity issue found on that key.
 */
export function buildHighlightMap(
  validationResult: ValidationResult,
): Record<string, "error" | "warning" | "info"> {
  const map: Record<string, "error" | "warning" | "info"> = {};
  const priority: Record<ValidationSeverity, number> = {
    error: 3,
    warning: 2,
    info: 1,
  };

  for (const issue of validationResult.issues) {
    const existing = map[issue.key];
    if (!existing || priority[issue.severity] > priority[existing]) {
      map[issue.key] = issue.severity;
    }
  }

  return map;
}
