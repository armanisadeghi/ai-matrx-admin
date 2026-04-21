/**
 * IDE Context Variables
 *
 * Converts a `CodeContextInput` (code + language + optional IDE state) into
 * a list of context entries for the agent-system `instanceContext` slice.
 * The server exposes these to the model via `ctx_get(key)` so the agent can
 * pull live editor state on demand without bloating the prompt.
 *
 * Keys follow the server team's `vsc_*` convention for VSCode-style slots
 * plus `agent_skills` for the manual capability slot.
 *
 * Fields with no content are omitted — same behavior as the server's
 * IdeState.to_variables() (keys with empty strings aren't emitted).
 */

import type { CodeContextInput } from "../types";
import {
  VSC_CONTEXT_KEYS,
  AGENT_CONTEXT_KEYS,
  CONTEXT_LABELS,
} from "../constants";

/**
 * Shape the instanceContext.setContextEntries action accepts. Matches
 * `features/agents/redux/execution-system/instance-context/instance-context.slice.ts:94-120`.
 */
export interface IdeContextEntry {
  key: string;
  value: unknown;
  type: "text" | "json";
  label: string;
}

function isWrappedInCodeBlock(code: string): boolean {
  const trimmed = code.trim();
  return (
    trimmed.startsWith("```") &&
    trimmed.endsWith("```") &&
    trimmed.split("```").length >= 3
  );
}

export function wrapInCodeBlock(code: string, language?: string): string {
  if (isWrappedInCodeBlock(code)) return code;
  const lang = language || "code";
  return `\`\`\`${lang}\n${code}\n\`\`\``;
}

/**
 * Build the context entries for a given editor state. Returns only the keys
 * that have real content — mirrors the server's `ide_state.to_variables()`
 * behavior of omitting empty fields.
 *
 * Pass the result directly to `setContextEntries({conversationId, entries})`.
 */
export function buildIdeContextEntries(
  input: CodeContextInput,
): IdeContextEntry[] {
  const entries: IdeContextEntry[] = [];
  const {
    code,
    language,
    filePath,
    selection,
    diagnostics,
    workspaceName,
    workspaceFolders,
    gitBranch,
    gitStatus,
    agentSkills,
  } = input;

  const push = (key: string, value: unknown, type: "text" | "json" = "text") => {
    entries.push({ key, value, type, label: CONTEXT_LABELS[key] ?? key });
  };

  // File content (fenced, ready for the model to read)
  if (code && code.length > 0) {
    push(
      VSC_CONTEXT_KEYS.ACTIVE_FILE_CONTENT,
      wrapInCodeBlock(code, language),
    );
  }
  if (language) push(VSC_CONTEXT_KEYS.ACTIVE_FILE_LANGUAGE, language);
  if (filePath) push(VSC_CONTEXT_KEYS.ACTIVE_FILE_PATH, filePath);

  if (selection && selection.length > 0) {
    push(VSC_CONTEXT_KEYS.SELECTED_TEXT, wrapInCodeBlock(selection, language));
  }
  if (diagnostics && diagnostics.length > 0) {
    push(VSC_CONTEXT_KEYS.DIAGNOSTICS, diagnostics);
  }

  if (workspaceName) push(VSC_CONTEXT_KEYS.WORKSPACE_NAME, workspaceName);
  if (workspaceFolders && workspaceFolders.length > 0) {
    push(VSC_CONTEXT_KEYS.WORKSPACE_FOLDERS, workspaceFolders);
  }
  if (gitBranch) push(VSC_CONTEXT_KEYS.GIT_BRANCH, gitBranch);
  if (gitStatus && gitStatus.length > 0) {
    push(VSC_CONTEXT_KEYS.GIT_STATUS, gitStatus);
  }

  if (agentSkills && agentSkills.length > 0) {
    push(AGENT_CONTEXT_KEYS.AGENT_SKILLS, agentSkills);
  }

  // Composite: `vsc_active_file` — one json lookup for agents that want it.
  if (code && code.length > 0) {
    push(
      VSC_CONTEXT_KEYS.ACTIVE_FILE,
      {
        path: filePath ?? null,
        language: language ?? null,
        content: code,
      },
      "json",
    );
  }

  return entries;
}
