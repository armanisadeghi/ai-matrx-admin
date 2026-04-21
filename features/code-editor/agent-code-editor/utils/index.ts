/**
 * agent-code-editor utilities — barrel export.
 */

export {
  parseCodeEdits,
  validateEdits,
  type CodeEdit,
  type ParseResult,
} from "./parseCodeEdits";

export {
  applyCodeEdits,
  generateChangePreview,
  type ApplyResult,
} from "./applyCodeEdits";

export {
  generateUnifiedDiff,
  formatDiff,
  getDiffStats,
  type DiffLine,
  type DiffResult,
} from "./generateDiff";

export {
  buildIdeContextEntries,
  wrapInCodeBlock,
  type IdeContextEntry,
} from "./ideContextVariables";
