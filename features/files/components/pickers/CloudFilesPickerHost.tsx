/**
 * features/files/components/pickers/CloudFilesPickerHost.tsx
 *
 * Thin client shell + public entry point for the cloud-files picker
 * system. Statically importable from anywhere.
 *
 * Two responsibilities:
 *   1. Re-export the imperative API (`openFilePicker` / `openFolderPicker`
 *      / `openSaveAs`) from `cloudFilesPickerOpeners.ts` so existing
 *      callers continue to work unchanged:
 *        import { openFilePicker } from
 *          "@/features/files/components/pickers/CloudFilesPickerHost";
 *      The opener registry is pure TS (zero React, zero dialog markup).
 *   2. The host body (`CloudFilesPickerHostBody`) renders inside
 *      `<DialogHosts />` (components/dialogs/host/), which loads it on first
 *      engagement; an opener called before that awaits `ensureDialogHosts()`.
 */

"use client";

export {
  openFilePicker,
  openFolderPicker,
  openSaveAs,
} from "./cloudFilesPickerOpeners";
