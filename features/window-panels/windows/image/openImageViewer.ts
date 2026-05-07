/**
 * openImageViewer — light dispatcher helper for the `imageViewer`
 * registered overlay.
 *
 * Lives in its OWN file (separate from `ImageViewerWindow.tsx`) so
 * consumers in route-level code can import this helper without dragging
 * `<WindowPanel>` and the rest of the window-panels chunk graph into
 * their boot bundle. The actual window component (which imports
 * WindowPanel) is loaded lazily by the registry's `componentImport`,
 * not by anyone calling this function.
 *
 * Pattern matches `useOpenImageUploaderWindow` and
 * `useOpenCuratedIconPickerWindow`: separate, light, no transitive
 * window-panel-system imports.
 */

import { openOverlay } from "@/lib/redux/slices/overlaySlice";
import type { AppDispatch } from "@/lib/redux/store";

export interface OpenImageViewerPayload {
  images: string[];
  initialIndex?: number;
  alts?: string[];
  title?: string;
  /** Supply a stable id when you need multiple independent viewers open at once. */
  instanceId?: string;
}

export function openImageViewer(
  dispatch: AppDispatch,
  payload: OpenImageViewerPayload,
) {
  const instanceId = payload.instanceId ?? "default";
  dispatch(
    openOverlay({
      overlayId: "imageViewer",
      instanceId,
      data: {
        images: payload.images,
        initialIndex: payload.initialIndex ?? 0,
        alts: payload.alts,
        title: payload.title,
      },
    }),
  );
}
