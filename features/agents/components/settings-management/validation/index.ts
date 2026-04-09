export type {
  ValidationSeverity,
  ValidationCategory,
  ValidationIssue,
  ValidationResult,
  ValidationRule,
  ResolvedConfig,
} from "./types";

export {
  resolveConfig,
  buildRecognizedKeys,
  getControlForKey,
} from "./resolve-config";
export { RULES, getRuleById } from "./rules";
export { validateConfig, buildHighlightMap } from "./engine";
export { useConfigValidation } from "./useConfigValidation";
export { evaluateConstraint, evaluateAllConstraints } from "./constraints";
