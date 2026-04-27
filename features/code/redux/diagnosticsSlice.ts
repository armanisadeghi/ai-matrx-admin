import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/**
 * Editor diagnostics — Monaco markers serialized for agent context.
 *
 * Populated by `useMonacoMarkers` (a subscriber that listens to
 * `monaco.editor.onDidChangeMarkers` and writes the markers for the
 * editor's current model into this slice, keyed by tab id).
 *
 * Read by `editorContextEntries` to ship `editor.diagnostics` —
 * lightweight, scoped to the active tab so agents can see lint /
 * type-check errors without shelling out to a build tool.
 *
 * Wire format (one entry per marker):
 *   {
 *     severity: "error" | "warning" | "info" | "hint",
 *     message: string,
 *     source?: string,        // e.g. "ts", "eslint", "biome"
 *     code?: string | number,
 *     startLine: number,      // 1-based
 *     endLine: number,
 *     startColumn: number,
 *     endColumn: number,
 *   }
 *
 * Mirror of Monaco's `IMarker` shape, normalized to plain JSON. We don't
 * import monaco types here so this slice stays runtime-light and
 * SSR-safe — the hook does the marker → DTO conversion at the edge.
 */
export type DiagnosticSeverity = "error" | "warning" | "info" | "hint";

export interface EditorDiagnostic {
  severity: DiagnosticSeverity;
  message: string;
  source?: string;
  code?: string | number;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
}

export interface CodeDiagnosticsState {
  /** Latest marker set keyed by tab id (`<filesystemId>:<path>`). */
  byTabId: Record<string, EditorDiagnostic[]>;
}

const initialState: CodeDiagnosticsState = {
  byTabId: {},
};

const slice = createSlice({
  name: "codeDiagnostics",
  initialState,
  reducers: {
    setDiagnostics(
      state,
      action: PayloadAction<{
        tabId: string;
        diagnostics: EditorDiagnostic[];
      }>,
    ) {
      const { tabId, diagnostics } = action.payload;
      if (diagnostics.length === 0) {
        delete state.byTabId[tabId];
      } else {
        state.byTabId[tabId] = diagnostics;
      }
    },
    clearDiagnostics(state, action: PayloadAction<string>) {
      delete state.byTabId[action.payload];
    },
    clearAllDiagnostics(state) {
      state.byTabId = {};
    },
  },
});

export const {
  setDiagnostics,
  clearDiagnostics,
  clearAllDiagnostics,
} = slice.actions;

export default slice.reducer;

export interface WithCodeDiagnostics {
  codeDiagnostics: CodeDiagnosticsState;
}

const EMPTY_DIAGNOSTICS: EditorDiagnostic[] = [];

export const selectDiagnosticsByTabId = (
  state: WithCodeDiagnostics,
  tabId: string | null | undefined,
): EditorDiagnostic[] => {
  if (!tabId) return EMPTY_DIAGNOSTICS;
  return state.codeDiagnostics.byTabId[tabId] ?? EMPTY_DIAGNOSTICS;
};

export const selectAllDiagnostics = (
  state: WithCodeDiagnostics,
): Record<string, EditorDiagnostic[]> => state.codeDiagnostics.byTabId;
