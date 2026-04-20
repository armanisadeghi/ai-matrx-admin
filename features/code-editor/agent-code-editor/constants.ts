/**
 * Constants — VSC_* context keys and surface keys.
 *
 * VSC keys match the server team's IdeState.to_variables() naming exactly,
 * so any agent that declares these as variables or context slots picks up
 * the editor's live state without extra mapping.
 */

/** Surface key for focus/telemetry attribution. */
export const SMART_CODE_EDITOR_SURFACE_KEY = "code-editor" as const;

/**
 * Atomic VSCode-style variable names the server team documented.
 * Populated by `buildIdeContextEntries` into `instanceContext`; the agent
 * retrieves them lazily via `ctx_get`.
 */
export const VSC_CONTEXT_KEYS = {
  /** Full path of the open file (optional). */
  ACTIVE_FILE_PATH: "vsc_active_file_path",
  /** Full text content of the file. */
  ACTIVE_FILE_CONTENT: "vsc_active_file_content",
  /** Language identifier, e.g. "typescript". */
  ACTIVE_FILE_LANGUAGE: "vsc_active_file_language",
  /** Currently highlighted text (optional). */
  SELECTED_TEXT: "vsc_selected_text",
  /** Formatted list of errors/warnings (optional). */
  DIAGNOSTICS: "vsc_diagnostics",
  /** Composite object: `{path, language, content}` — for agents that prefer json. */
  ACTIVE_FILE: "vsc_active_file",
} as const;

export type VscContextKey =
  (typeof VSC_CONTEXT_KEYS)[keyof typeof VSC_CONTEXT_KEYS];

/**
 * Default labels for each vsc_* key. Used when we dispatch setContextEntries
 * so the UI (if it ever surfaces these entries) has a readable name.
 */
export const VSC_CONTEXT_LABELS: Record<VscContextKey, string> = {
  [VSC_CONTEXT_KEYS.ACTIVE_FILE_PATH]: "Active file path",
  [VSC_CONTEXT_KEYS.ACTIVE_FILE_CONTENT]: "Active file content",
  [VSC_CONTEXT_KEYS.ACTIVE_FILE_LANGUAGE]: "Active file language",
  [VSC_CONTEXT_KEYS.SELECTED_TEXT]: "Selected text",
  [VSC_CONTEXT_KEYS.DIAGNOSTICS]: "Diagnostics",
  [VSC_CONTEXT_KEYS.ACTIVE_FILE]: "Active file",
};
