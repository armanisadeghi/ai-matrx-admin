/**
 * features/window-panels/windows/cloud-files/FilePreviewWindow.tsx
 *
 * Floating WindowPanel wrapper around the canonical
 * [PreviewPane](../../../../files/components/surfaces/PreviewPane.tsx) — the
 * SAME preview surface users see in `/cloud-files` (filename + Copy link
 * + Download + Open full view + Close + tabs for Preview / Versions +
 * the full FilePreview body).
 *
 * Rationale: every place in the app that lets the user click a file chip
 * or attachment must deliver the identical experience users get on the
 * cloud-files page. Wrapping the same `<PreviewPane>` in a draggable,
 * resizable WindowPanel keeps the source of truth single while moving
 * the surface from a screen-blocking modal to a non-blocking floating
 * window.
 *
 * Mobile: registry sets `mobilePresentation: "fullscreen"`, so on
 * narrow viewports the WindowPanel takes over the whole screen. The
 * Esc / close handlers route through the same `onClose` we pass.
 *
 * Realtime: mounts `<CloudFilesRealtimeProvider>` locally so the file's
 * versions / permissions / share-link state stay live even when the
 * window is opened outside the `/cloud-files` route group.
 */

"use client";

import { useSelector } from "react-redux";
import type { RootState } from "@/lib/redux/store";
import { WindowPanel } from "@/features/window-panels/WindowPanel";
import { CloudFilesRealtimeProvider } from "@/features/files/providers/CloudFilesRealtimeProvider";
import { PreviewPane } from "@/features/files/components/surfaces/PreviewPane";

export interface FilePreviewWindowProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * cld_files UUID. Falls through to the registry's `defaultData.fileId`
   * (null) when no caller has set it — in that case we render nothing
   * and rely on `isOpen` being false anyway.
   */
  fileId?: string | null;
}

export default function FilePreviewWindow({
  isOpen,
  onClose,
  fileId,
}: FilePreviewWindowProps) {
  const userId = useSelector((state: RootState) => state.userAuth?.id ?? null);

  if (!isOpen || !fileId) return null;

  return (
    <WindowPanel
      title="File preview"
      width={900}
      height={680}
      urlSyncKey="file_preview"
      onClose={onClose}
      overlayId="filePreviewWindow"
      onCollectData={() => ({ fileId })}
    >
      <CloudFilesRealtimeProvider userId={userId}>
        {/*
          The canonical PreviewPane. Passing `onClose` so the pane's own
          X button + Esc handler close the WindowPanel instead of
          dispatching `setActiveFileId(null)` (which would be a no-op
          here — the WindowPanel doesn't read that field, and clearing
          it would silently close the cloud-files PageShell preview if
          it happens to be open in another tab/route).
        */}
        <PreviewPane
          fileId={fileId}
          onClose={onClose}
          className="h-full w-full"
        />
      </CloudFilesRealtimeProvider>
    </WindowPanel>
  );
}
