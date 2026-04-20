/**
 * IDE Context Variables
 *
 * Converts a `CodeContextInput` (the editor's current code + language +
 * optional file-path / selection / diagnostics) into a list of context
 * entries for the agent-system `instanceContext` slice. The server exposes
 * these to the model via `ctx_get(key)` so the agent can pull live editor
 * state on demand without bloating the prompt.
 *
 * Keys follow the `vsc_*` convention the server team uses for their VSCode
 * extension — any agent that opts into them (by declaring the key in its
 * variable schema or by using ctx_get) sees the same payload shape.
 *
 * This replaces the prompt-era `specialVariables.ts`'s `current_code` /
 * `content` / `selection` / `context` auto-fill with a context-slot model.
 */

import type { CodeContextInput } from "../types";
import { VSC_CONTEXT_KEYS, VSC_CONTEXT_LABELS } from "../constants";

/**
 * Shape the agent-system instanceContext.setContextEntries action accepts.
 * Matches the payload contract at
 * `features/agents/redux/execution-system/instance-context/instance-context.slice.ts:94-120`.
 */
export interface IdeContextEntry {
  key: string;
  value: unknown;
  type: "text" | "json";
  label: string;
}

/**
 * Detect if code is already wrapped in a markdown code block. Mirrors the
 * check in the legacy `specialVariables.ts` so we don't double-wrap.
 */
function isWrappedInCodeBlock(code: string): boolean {
  const trimmed = code.trim();
  return (
    trimmed.startsWith("```") &&
    trimmed.endsWith("```") &&
    trimmed.split("```").length >= 3
  );
}

/**
 * Wrap code in a fenced block for clean model consumption. If already
 * wrapped, passes through untouched.
 */
export function wrapInCodeBlock(code: string, language?: string): string {
  if (isWrappedInCodeBlock(code)) return code;
  const lang = language || "code";
  return `\`\`\`${lang}\n${code}\n\`\`\``;
}

/**
 * Build the IDE context entries for a given editor state. Returns only the
 * keys that have real content — mirrors the server's `ide_state.to_variables()`
 * behavior of omitting empty fields.
 *
 * Pass the result directly to `setContextEntries({conversationId, entries})`.
 */
export function buildIdeContextEntries(
  input: CodeContextInput,
): IdeContextEntry[] {
  const entries: IdeContextEntry[] = [];
  const { code, language, filePath, selection, diagnostics } = input;

  // Atomic: file content (fenced, ready for the model to read)
  if (code && code.length > 0) {
    entries.push({
      key: VSC_CONTEXT_KEYS.ACTIVE_FILE_CONTENT,
      value: wrapInCodeBlock(code, language),
      type: "text",
      label: VSC_CONTEXT_LABELS[VSC_CONTEXT_KEYS.ACTIVE_FILE_CONTENT],
    });
  }

  // Atomic: language (small scalar, no wrapping needed)
  if (language) {
    entries.push({
      key: VSC_CONTEXT_KEYS.ACTIVE_FILE_LANGUAGE,
      value: language,
      type: "text",
      label: VSC_CONTEXT_LABELS[VSC_CONTEXT_KEYS.ACTIVE_FILE_LANGUAGE],
    });
  }

  // Atomic: file path (optional — only when the caller supplies one)
  if (filePath) {
    entries.push({
      key: VSC_CONTEXT_KEYS.ACTIVE_FILE_PATH,
      value: filePath,
      type: "text",
      label: VSC_CONTEXT_LABELS[VSC_CONTEXT_KEYS.ACTIVE_FILE_PATH],
    });
  }

  // Atomic: selection (optional)
  if (selection && selection.length > 0) {
    entries.push({
      key: VSC_CONTEXT_KEYS.SELECTED_TEXT,
      value: wrapInCodeBlock(selection, language),
      type: "text",
      label: VSC_CONTEXT_LABELS[VSC_CONTEXT_KEYS.SELECTED_TEXT],
    });
  }

  // Atomic: diagnostics (optional; caller provides pre-formatted text)
  if (diagnostics && diagnostics.length > 0) {
    entries.push({
      key: VSC_CONTEXT_KEYS.DIAGNOSTICS,
      value: diagnostics,
      type: "text",
      label: VSC_CONTEXT_LABELS[VSC_CONTEXT_KEYS.DIAGNOSTICS],
    });
  }

  // Composite: `vsc_active_file` — a json dict for agents that prefer one
  // lookup over three. Only included when we have a file to describe.
  if (code && code.length > 0) {
    entries.push({
      key: VSC_CONTEXT_KEYS.ACTIVE_FILE,
      value: {
        path: filePath ?? null,
        language: language ?? null,
        content: code,
      },
      type: "json",
      label: VSC_CONTEXT_LABELS[VSC_CONTEXT_KEYS.ACTIVE_FILE],
    });
  }

  return entries;
}
