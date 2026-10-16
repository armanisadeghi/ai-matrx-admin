/**
 * features/files/upload/UploadGuardHost.tsx
 *
 * Public entry point for the upload-guard system. Mirror of the
 * `CloudFilesPickerHost` pattern:
 *
 *   - Re-export the imperative `requestUpload` API so any caller can
 *     statically import from this file without dragging the React
 *     dialog tree into their bundle.
 *   - The host body (`UploadGuardHostBody`) renders inside `<DialogHosts />`
 *     (components/dialogs/host/), loaded on first engagement; a
 *     `requestUpload(arg)` before that awaits it, then runs the pre-flight
 *     scan and shows the confirmation dialog when needed.
 */

"use client";

export {
  requestUpload,
} from "./uploadGuardOpeners";
export type { UploadGuardResult } from "./uploadGuardOpeners";
