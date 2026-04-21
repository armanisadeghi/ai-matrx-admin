// features/code-files/redux/autoSaveMiddleware.ts
//
// Watches the codeFiles slice for local edits and fires a debounced save
// through `saveFileNow`. Debounce is adaptive based on content length.
//
// Trigger actions:
//   - codeFiles/setLocalContent
//   - codeFiles/setLocalName
//   - codeFiles/setLocalLanguage
//   - codeFiles/setLocalFolder
//   - codeFiles/setLocalTags

import type { Middleware } from "@reduxjs/toolkit";
import type { AppDispatch, RootState } from "@/lib/redux/store";
import { getCodeAutoSaveDelay } from "./code-files.types";
import { saveFileNow } from "./thunks";

const TRIGGER_ACTIONS = new Set([
  "codeFiles/setLocalContent",
  "codeFiles/setLocalName",
  "codeFiles/setLocalLanguage",
  "codeFiles/setLocalFolder",
  "codeFiles/setLocalTags",
]);

const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const codeFilesAutoSaveMiddleware: Middleware =
  (storeApi) => (next) => (action) => {
    const result = next(action);

    const actionType = (action as { type?: string }).type;
    if (!actionType || !TRIGGER_ACTIONS.has(actionType)) return result;

    const payload = (action as { payload?: { id?: string } }).payload;
    const fileId = payload?.id;
    if (!fileId) return result;

    const state = storeApi.getState() as RootState;
    const rec = state.codeFiles.files[fileId];
    if (!rec || !rec._dirty) return result;
    if (rec.is_readonly) return result;

    const existing = saveTimers.get(fileId);
    if (existing) clearTimeout(existing);

    const delay = getCodeAutoSaveDelay(rec.content?.length ?? 0);

    const timer = setTimeout(() => {
      saveTimers.delete(fileId);
      const currentState = storeApi.getState() as RootState;
      const current = currentState.codeFiles.files[fileId];
      if (!current || !current._dirty || current._saving) return;
      (storeApi.dispatch as AppDispatch)(saveFileNow({ id: fileId })).catch(
        (err) => {
          console.error("[codeFilesAutoSave] save failed for", fileId, err);
        },
      );
    }, delay);

    saveTimers.set(fileId, timer);
    return result;
  };
