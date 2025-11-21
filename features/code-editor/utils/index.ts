/**
 * Code Editor Utilities
 * 
 * Barrel export for easy imports
 */

export { parseCodeEdits, validateEdits } from '@/features/code-editor/utils/parseCodeEdits';
export type { CodeEdit, ParseResult } from '@/features/code-editor/utils/parseCodeEdits';

export { applyCodeEdits, generateChangePreview } from '@/features/code-editor/utils/applyCodeEdits';
export type { ApplyResult } from '@/features/code-editor/utils/applyCodeEdits';

export { generateUnifiedDiff, formatDiff, getDiffStats } from '@/features/code-editor/utils/generateDiff';
export type { DiffLine, DiffResult } from '@/features/code-editor/utils/generateDiff';

export { 
  CODE_EDITOR_PROMPTS, 
  getCodeEditorPromptId, 
  getPromptMetadata 
} from '@/features/code-editor/utils/codeEditorPrompts';
export type { CodeEditorPrompt } from '@/features/code-editor/utils/codeEditorPrompts';

