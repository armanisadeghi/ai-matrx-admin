/**
 * features/files/components/preview/openFilePreview.ts
 *
 * Imperative entry point for "open this file's preview from anywhere".
 * Dispatches an `openOverlay` action against the `filePreviewWindow`
 * registry entry — the UnifiedOverlayController picks it up and mounts
 * a draggable, resizable WindowPanel wrapping the canonical
 * [PreviewPane](../surfaces/PreviewPane.tsx). On mobile the registry's
 * `mobilePresentation: "fullscreen"` takes the same surface fullscreen.
 *
 * Why this replaces the old `<CloudFilesPreviewHost />` Dialog: every
 * preview surface in the app must give users the same level of access
 * — view, copy link, download, open in cloud-files, version history —
 * without blocking the rest of the screen. WindowPanel does that.
 * Modals are out by app convention.
 *
 * Usage:
 *   import { openFilePreview } from "@/features/files/components/preview/openFilePreview";
 *   openFilePreview(fileId);
 *
 * Idempotent — opening the same fileId twice is a no-op (Redux re-runs
 * the same action with the same payload). Opening a different fileId
 * REPLACES the active preview (singleton overlay).
 */

import { getStore } from "@/lib/redux/store-singleton";
import { openOverlay } from "@/lib/redux/slices/overlaySlice";

const FILE_PREVIEW_OVERLAY_ID = "filePreviewWindow";

export function openFilePreview(fileId: string): void {
  if (!fileId) return;
  const store = getStore();
  if (!store) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(
        "[cloud-files] openFilePreview called before the Redux store was initialized.",
      );
    }
    return;
  }
  store.dispatch(
    openOverlay({
      overlayId: FILE_PREVIEW_OVERLAY_ID,
      data: { fileId },
    }),
  );
}
