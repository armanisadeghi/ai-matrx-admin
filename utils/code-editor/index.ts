/**
 * Code Editor Utilities
 * 
 * Barrel export for easy imports
 */

export { parseCodeEdits, validateEdits } from './parseCodeEdits';
export type { CodeEdit, ParseResult } from './parseCodeEdits';

export { applyCodeEdits, generateChangePreview } from './applyCodeEdits';
export type { ApplyResult } from './applyCodeEdits';

export { generateUnifiedDiff, formatDiff, getDiffStats } from './generateDiff';
export type { DiffLine, DiffResult } from './generateDiff';

export { 
  CODE_EDITOR_PROMPTS, 
  getCodeEditorPromptId, 
  getPromptMetadata 
} from './codeEditorPrompts';
export type { CodeEditorPrompt } from './codeEditorPrompts';

