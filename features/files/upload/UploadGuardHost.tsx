/**
 * features/files/upload/UploadGuardHost.tsx
 *
 * Public entry point for the upload-guard system. Mirror of the
 * `CloudFilesPickerHost` pattern:
 *
 *   - Re-export the imperative `requestUpload` API so any caller can
 *     statically import from this file without dragging the React
 *     dialog tree into their bundle.
 *   - Render the host body via `next/dynamic({ ssr: false })` so the
 *     duplicate-detection + dialog code is loaded once on the client
 *     after mount, never in the static graph of any route entry.
 *
 * Mount once at the app level (in Providers / a parent layout) right
 * next to `<CloudFilesPickerHost/>`. After mount, every call to
 * `requestUpload(arg)` runs the pre-flight scan and shows the
 * confirmation dialog when needed.
 */

"use client";

import dynamic from "next/dynamic";

export {
  requestUpload,
} from "./uploadGuardOpeners";
export type { UploadGuardResult } from "./uploadGuardOpeners";

const UploadGuardHostImpl = dynamic(() => import("./UploadGuardHostImpl"), {
  ssr: false,
  loading: () => null,
});

export function UploadGuardHost() {
  return <UploadGuardHostImpl />;
}
