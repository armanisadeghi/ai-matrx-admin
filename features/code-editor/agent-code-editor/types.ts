/**
 * Shared types for the Smart Code Editor.
 */

import type { ParseResult } from "./utils/parseCodeEdits";

/**
 * The high-level state of an AI edit cycle. Drives the review UI.
 */
export type CodeEditorState =
  | "input" // waiting for user prompt
  | "processing" // request in flight / streaming
  | "review" // stream ended, user inspects diff
  | "applying" // user clicked Apply, writing back
  | "complete" // applied successfully, about to dismiss
  | "error"; // validation or apply failed

/**
 * Input shape for `useIdeContextSync` and the composite `vsc_active_file`.
 * All fields optional except `code` + `language`; the sync hook will
 * populate only the keys that have real content.
 */
export interface CodeContextInput {
  code: string;
  language: string;
  filePath?: string;
  selection?: string;
  diagnostics?: string;
}

/**
 * Return shape from `useSmartCodeEditor`. Components subscribe to this to
 * render state transitions and apply/reject actions.
 */
export interface UseSmartCodeEditorReturn {
  state: CodeEditorState;
  parsedEdits: ParseResult | null;
  modifiedCode: string;
  errorMessage: string;
  rawAIResponse: string;
  isExecuting: boolean;
  isCopied: boolean;
  diffStats: { additions: number; deletions: number; changes: number } | null;
  requestId: string | null;
  handleApplyChanges: () => Promise<void>;
  handleCopyResponse: () => Promise<void>;
  handleRejectEdits: () => void;
}
