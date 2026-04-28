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
 *   2. Render the host body via `next/dynamic({ ssr: false })` so the
 *      heavy picker chunk (FilePicker + FolderPicker + SaveAsDialog +
 *      their tree) never enters the static graph of any route entry —
 *      it loads exactly once on the client after mount.
 *
 * Until the host body finishes hydrating, `openFilePicker()` and friends
 * resolve to `null` / `undefined` (with a dev warning). In practice the
 * dynamic chunk loads in tens of milliseconds after page load, so any
 * user-triggered call is guaranteed to find the host alive.
 */

"use client";

import dynamic from "next/dynamic";

export {
  openFilePicker,
  openFolderPicker,
  openSaveAs,
} from "./cloudFilesPickerOpeners";

const CloudFilesPickerHostImpl = dynamic(
  () => import("./CloudFilesPickerHostImpl"),
  { ssr: false, loading: () => null },
);

export function CloudFilesPickerHost() {
  return <CloudFilesPickerHostImpl />;
}
