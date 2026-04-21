// features/code-files/redux/thunks.ts
//
// Redux thunks for code-files. Two-phase fetch strategy:
//   1. `loadCodeFilesList()` — metadata only, fast, for sidebar/manager UI.
//   2. `loadCodeFileFull(id)` / `loadCodeFilesFull([ids])` — pulls content
//      (from Postgres or S3) for files the user actually opens.
//
// Writes are split so components can pick the right granularity:
//   - `saveFileNow(id)` is what the auto-save middleware calls.
//   - `createCodeFileThunk(input)` handles create + S3 routing.
//   - `deleteCodeFileThunk(id)` handles delete + S3 cleanup.

import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AppDispatch, RootState } from "@/lib/redux/store";
import {
  CodeFilesAPI,
  type CreateCodeFileInput,
} from "../service/codeFilesApi";
import type {
  CreateCodeFolderInput,
  UpdateCodeFolderInput,
} from "../service/codeFilesService";
import type { CodeFile, CodeFolder } from "./code-files.types";
import { codeFilesActions } from "./slice";

type ThunkConfig = { dispatch: AppDispatch; state: RootState };

// ── List / folders ─────────────────────────────────────────────────────────

export const loadCodeFilesList = createAsyncThunk<
  CodeFile[],
  void,
  ThunkConfig
>("codeFiles/loadList", async (_, { dispatch }) => {
  dispatch(codeFilesActions.setListStatus({ status: "loading" }));
  try {
    const rows = await CodeFilesAPI.listMetadata();
    dispatch(codeFilesActions.setList(rows));
    return rows;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load code files";
    dispatch(
      codeFilesActions.setListStatus({ status: "error", error: message }),
    );
    throw err;
  }
});

export const loadCodeFolders = createAsyncThunk<void, void, ThunkConfig>(
  "codeFiles/loadFolders",
  async (_, { dispatch }) => {
    const folders = await CodeFilesAPI.listFolders();
    dispatch(codeFilesActions.setFolders(folders));
  },
);

// ── Full content hydration ──────────────────────────────────────────────────

export const loadCodeFileFull = createAsyncThunk<
  CodeFile | null,
  { id: string; force?: boolean },
  ThunkConfig
>("codeFiles/loadFull", async ({ id, force }, { dispatch, getState }) => {
  const existing = getState().codeFiles.files[id];
  if (existing && existing._fetchStatus === "full" && !force) return existing;

  dispatch(codeFilesActions.setLoading({ id, loading: true }));
  try {
    const row = await CodeFilesAPI.getById(id);
    if (row) {
      dispatch(codeFilesActions.upsertFile({ file: row, status: "full" }));
    }
    return row;
  } finally {
    dispatch(codeFilesActions.setLoading({ id, loading: false }));
  }
});

export const loadCodeFilesFull = createAsyncThunk<
  CodeFile[],
  { ids: string[]; force?: boolean },
  ThunkConfig
>("codeFiles/loadManyFull", async ({ ids, force }, { dispatch, getState }) => {
  const state = getState().codeFiles;
  const missing = force
    ? ids
    : ids.filter((id) => {
        const existing = state.files[id];
        return !existing || existing._fetchStatus !== "full";
      });
  if (missing.length === 0) {
    return ids
      .map((id) => state.files[id])
      .filter(Boolean) as unknown as CodeFile[];
  }
  const rows = await CodeFilesAPI.getByIds(missing);
  dispatch(
    codeFilesActions.upsertFiles(
      rows.map((file) => ({ file, status: "full" as const })),
    ),
  );
  return rows;
});

// ── Create / update / delete ───────────────────────────────────────────────

export const createCodeFileThunk = createAsyncThunk<
  CodeFile,
  CreateCodeFileInput,
  ThunkConfig
>("codeFiles/create", async (input, { dispatch }) => {
  const row = await CodeFilesAPI.create(input);
  dispatch(codeFilesActions.upsertFile({ file: row, status: "full" }));
  return row;
});

/**
 * Persist dirty edits for a single file. Called by the auto-save middleware
 * and by explicit "save" actions. Coalesces content + name + language +
 * folder + tags into a single PATCH.
 */
export const saveFileNow = createAsyncThunk<
  CodeFile | null,
  { id: string },
  ThunkConfig
>("codeFiles/saveNow", async ({ id }, { dispatch, getState }) => {
  const rec = getState().codeFiles.files[id];
  if (!rec) return null;
  if (!rec._dirty || rec._saving) return rec;

  dispatch(codeFilesActions.setSaving({ id, saving: true }));
  try {
    const saved = await CodeFilesAPI.update(
      id,
      {
        name: rec.name,
        language: rec.language,
        content: rec.content,
        folder_id: rec.folder_id,
        tags: rec.tags ?? [],
      },
      rec,
    );
    dispatch(codeFilesActions.markSaved({ file: saved }));
    return saved;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed";
    dispatch(codeFilesActions.setSaveError({ id, error: message }));
    throw err;
  }
});

export const deleteCodeFileThunk = createAsyncThunk<
  string,
  string,
  ThunkConfig
>("codeFiles/delete", async (id, { dispatch, getState }) => {
  const current = getState().codeFiles.files[id];
  await CodeFilesAPI.remove(id, current);
  dispatch(codeFilesActions.removeFile(id));
  return id;
});

// ── Folder thunks ───────────────────────────────────────────────────────────

export const createCodeFolderThunk = createAsyncThunk<
  CodeFolder,
  CreateCodeFolderInput,
  ThunkConfig
>("codeFiles/createFolder", async (input, { dispatch }) => {
  const folder = await CodeFilesAPI.createFolder(input);
  dispatch(codeFilesActions.upsertFolder(folder));
  return folder;
});

export const updateCodeFolderThunk = createAsyncThunk<
  void,
  { id: string; updates: UpdateCodeFolderInput },
  ThunkConfig
>("codeFiles/updateFolder", async ({ id, updates }, { dispatch }) => {
  const folder = await CodeFilesAPI.updateFolder(id, updates);
  dispatch(codeFilesActions.upsertFolder(folder));
});

export const deleteCodeFolderThunk = createAsyncThunk<
  void,
  string,
  ThunkConfig
>("codeFiles/deleteFolder", async (id, { dispatch }) => {
  await CodeFilesAPI.removeFolder(id);
  dispatch(codeFilesActions.removeFolder(id));
});
