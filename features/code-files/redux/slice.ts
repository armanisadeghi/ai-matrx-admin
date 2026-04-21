// features/code-files/redux/slice.ts
//
// Redux slice for code files. Leaner than notes: no undo stacks, no
// find-and-replace, no multi-instance windows. Client-only fields live on
// CodeFileRecord (_dirty, _saving, _error, _loading, _fetchStatus).

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  CodeFile,
  CodeFileFetchStatus,
  CodeFileRecord,
  CodeFilesSliceState,
  CodeFolder,
} from "./code-files.types";
import { createCodeFileRecord, mergeServerCodeFile } from "./code-files.types";

const initialState: CodeFilesSliceState = {
  files: {},
  folders: {},
  listStatus: "idle",
  listError: null,
  foldersLoaded: false,
};

interface UpsertPayload {
  file: CodeFile;
  status: CodeFileFetchStatus;
}

const codeFilesSlice = createSlice({
  name: "codeFiles",
  initialState,
  reducers: {
    setListStatus(
      state,
      action: PayloadAction<{
        status: CodeFilesSliceState["listStatus"];
        error?: string | null;
      }>,
    ) {
      state.listStatus = action.payload.status;
      state.listError = action.payload.error ?? null;
    },

    /**
     * Replace the file map with a fresh list (metadata-only). Preserves
     * _fetchStatus = "full" for files whose content has already been
     * loaded, so we don't force a re-download on revisit.
     */
    setList(state, action: PayloadAction<CodeFile[]>) {
      const incoming = action.payload;
      const next: Record<string, CodeFileRecord> = {};
      for (const row of incoming) {
        const existing = state.files[row.id];
        if (existing && existing._fetchStatus === "full" && !existing._dirty) {
          // keep existing content; refresh metadata
          next[row.id] = {
            ...existing,
            ...row,
            content: existing.content,
            _fetchStatus: "full",
          };
        } else if (existing && existing._dirty) {
          next[row.id] = mergeServerCodeFile(existing, row, "list");
        } else {
          next[row.id] = createCodeFileRecord(row, "list");
        }
      }
      state.files = next;
      state.listStatus = "loaded";
      state.listError = null;
    },

    upsertFile(state, action: PayloadAction<UpsertPayload>) {
      const { file, status } = action.payload;
      const existing = state.files[file.id];
      state.files[file.id] = existing
        ? mergeServerCodeFile(existing, file, status)
        : createCodeFileRecord(file, status);
    },

    upsertFiles(state, action: PayloadAction<UpsertPayload[]>) {
      for (const { file, status } of action.payload) {
        const existing = state.files[file.id];
        state.files[file.id] = existing
          ? mergeServerCodeFile(existing, file, status)
          : createCodeFileRecord(file, status);
      }
    },

    removeFile(state, action: PayloadAction<string>) {
      delete state.files[action.payload];
    },

    // ── Local edits (dirty tracking for auto-save) ─────────────────────

    setLocalContent(
      state,
      action: PayloadAction<{ id: string; content: string }>,
    ) {
      const rec = state.files[action.payload.id];
      if (!rec) return;
      if (rec.content === action.payload.content) return;
      rec.content = action.payload.content;
      rec._dirty = true;
      rec._error = null;
    },

    setLocalName(state, action: PayloadAction<{ id: string; name: string }>) {
      const rec = state.files[action.payload.id];
      if (!rec) return;
      if (rec.name === action.payload.name) return;
      rec.name = action.payload.name;
      rec._dirty = true;
    },

    setLocalLanguage(
      state,
      action: PayloadAction<{ id: string; language: string }>,
    ) {
      const rec = state.files[action.payload.id];
      if (!rec) return;
      if (rec.language === action.payload.language) return;
      rec.language = action.payload.language;
      rec._dirty = true;
    },

    setLocalFolder(
      state,
      action: PayloadAction<{ id: string; folder_id: string | null }>,
    ) {
      const rec = state.files[action.payload.id];
      if (!rec) return;
      if (rec.folder_id === action.payload.folder_id) return;
      rec.folder_id = action.payload.folder_id;
      rec._dirty = true;
    },

    setLocalTags(state, action: PayloadAction<{ id: string; tags: string[] }>) {
      const rec = state.files[action.payload.id];
      if (!rec) return;
      rec.tags = action.payload.tags;
      rec._dirty = true;
    },

    // ── Save lifecycle (driven by thunks / middleware) ─────────────────

    setSaving(state, action: PayloadAction<{ id: string; saving: boolean }>) {
      const rec = state.files[action.payload.id];
      if (!rec) return;
      rec._saving = action.payload.saving;
    },

    setSaveError(
      state,
      action: PayloadAction<{ id: string; error: string | null }>,
    ) {
      const rec = state.files[action.payload.id];
      if (!rec) return;
      rec._error = action.payload.error;
      rec._saving = false;
    },

    /**
     * Mark a record clean after a successful save. Caller passes the
     * server-canonical row so we sync updated_at, version, hash, etc.
     */
    markSaved(state, action: PayloadAction<{ file: CodeFile }>) {
      const { file } = action.payload;
      const existing = state.files[file.id];
      if (!existing) {
        state.files[file.id] = createCodeFileRecord(file, "full");
        return;
      }
      existing._dirty = false;
      existing._saving = false;
      existing._error = null;
      existing.updated_at = file.updated_at;
      existing.version = file.version;
      existing.content_hash = file.content_hash;
      existing.s3_key = file.s3_key;
      existing.s3_bucket = file.s3_bucket;
      if (existing._fetchStatus !== "full") existing._fetchStatus = "full";
    },

    setLoading(state, action: PayloadAction<{ id: string; loading: boolean }>) {
      const rec = state.files[action.payload.id];
      if (!rec) return;
      rec._loading = action.payload.loading;
    },

    // ── Folders ────────────────────────────────────────────────────────

    setFolders(state, action: PayloadAction<CodeFolder[]>) {
      state.folders = {};
      for (const f of action.payload) state.folders[f.id] = f;
      state.foldersLoaded = true;
    },

    upsertFolder(state, action: PayloadAction<CodeFolder>) {
      state.folders[action.payload.id] = action.payload;
    },

    removeFolder(state, action: PayloadAction<string>) {
      delete state.folders[action.payload];
    },

    resetCodeFilesState() {
      return initialState;
    },
  },
});

export const codeFilesActions = codeFilesSlice.actions;
export const codeFilesReducer = codeFilesSlice.reducer;
export default codeFilesSlice.reducer;
