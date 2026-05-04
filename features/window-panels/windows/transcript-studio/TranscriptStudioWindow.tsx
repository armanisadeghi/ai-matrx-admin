"use client";

/**
 * TranscriptStudioWindow — floating-window mount of the transcript studio.
 *
 * Wraps the SAME `<StudioView>` that the route at `/transcript-studio` uses.
 * The route renders with `containerVariant: "page"` (full-page layout); the
 * window renders with `containerVariant: "window"` so the studio's own
 * components can adjust spacing if needed.
 *
 * Recording survives the window being closed: the recorder lives in
 * `<GlobalRecordingProvider>` mounted at the app shell. Closing the window
 * does NOT stop a recording; only the explicit Stop button does.
 *
 * Persistence: the `activeSessionId` is the only window-specific datum we
 * remember. Geometry + open/close + z-index are handled by the window-panels
 * subsystem via the registry's `defaultData` + Redux `windowManagerSlice`.
 */

import { useCallback, useEffect, useRef } from "react";
import {
  WindowPanel,
  type WindowPanelProps,
} from "@/features/window-panels/WindowPanel";
import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectWindowRect,
  selectWindowState,
  selectWindowZIndex,
} from "@/lib/redux/slices/windowManagerSlice";
import { useWindowPersistence } from "@/features/window-panels/WindowPersistenceManager";
import { StudioView } from "@/features/transcript-studio/components/StudioView";
import { selectActiveSessionId } from "@/features/transcript-studio/redux/selectors";

const OVERLAY_ID = "transcriptStudioWindow";
const WINDOW_ID = "transcript-studio-window";

export interface TranscriptStudioWindowProps
  extends Omit<WindowPanelProps, "children" | "title"> {
  title?: string;
  /** Restored from window_sessions.data on mount. */
  activeSessionId?: string | null;
}

export function TranscriptStudioWindow({
  title = "Transcript Studio",
  id = WINDOW_ID,
  activeSessionId: initialActiveSessionId,
  ...windowProps
}: TranscriptStudioWindowProps) {
  const activeSessionId = useAppSelector(selectActiveSessionId);

  // Geometry — used to push current rect on auto-save.
  const windowId = id;
  const rect = useAppSelector(selectWindowRect(windowId));
  const windowState = useAppSelector(selectWindowState(windowId));
  const zIndex = useAppSelector(selectWindowZIndex(windowId));
  const persistence = useWindowPersistence();

  const dataRef = useRef<{ activeSessionId: string | null }>({
    activeSessionId: activeSessionId ?? null,
  });
  useEffect(() => {
    dataRef.current.activeSessionId = activeSessionId ?? null;
  }, [activeSessionId]);

  const collectData = useCallback(
    (): Record<string, unknown> => ({
      activeSessionId: dataRef.current.activeSessionId,
    }),
    [],
  );

  // Auto-save to window_sessions when the active session changes (debounced).
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const panelState = {
        windowState: (windowState ?? "windowed") as
          | "windowed"
          | "maximized"
          | "minimized",
        rect: rect ?? { x: 120, y: 80, width: 1100, height: 720 },
        sidebarOpen: false,
        zIndex: zIndex ?? 1000,
      };
      persistence.saveWindow(OVERLAY_ID, panelState, {
        activeSessionId: dataRef.current.activeSessionId,
      });
    }, 1500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId]);

  return (
    <WindowPanel
      title={title}
      minWidth={760}
      minHeight={440}
      urlSyncKey="studio"
      id={id}
      overlayId={OVERLAY_ID}
      onCollectData={collectData}
      {...windowProps}
    >
      <StudioView
        config={{
          containerVariant: "window",
          showSidebar: true,
          showSettings: true,
          initialSessionId: initialActiveSessionId ?? null,
        }}
      />
    </WindowPanel>
  );
}
