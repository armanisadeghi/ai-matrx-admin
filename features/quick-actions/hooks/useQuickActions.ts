// features/quick-actions/hooks/useQuickActions.ts
"use client";

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { openOverlay } from "@/lib/redux/slices/overlaySlice";

/**
 * Hook for opening quick action sheets via Redux
 *
 * This allows quick actions to be triggered from anywhere in the app
 * without needing to render the sheets in every component.
 *
 * @example
 * const { openQuickNotes, openQuickTasks } = useQuickActions();
 *
 * <Button onClick={openQuickNotes}>Open Notes</Button>
 */
export function useQuickActions() {
  const dispatch = useAppDispatch();

  const openQuickNotes = useCallback(
    (data?: any) => {
      dispatch(openOverlay({ overlayId: "quickNotes", data }));
    },
    [dispatch],
  );

  const openQuickTasks = useCallback(
    (data?: any) => {
      dispatch(openOverlay({ overlayId: "quickTasks", data }));
    },
    [dispatch],
  );

  const openQuickChat = useCallback(
    (data?: any) => {
      dispatch(openOverlay({ overlayId: "quickChat", data }));
    },
    [dispatch],
  );

  const openQuickData = useCallback(
    (data?: any) => {
      dispatch(openOverlay({ overlayId: "quickData", data }));
    },
    [dispatch],
  );

  const openQuickFiles = useCallback(
    (data?: any) => {
      // Phase 11 removed the legacy `quickFiles` sheet. Quick file access
      // now opens the cloud-files window registered in Phase 6.
      dispatch(openOverlay({ overlayId: "cloudFilesWindow", data }));
    },
    [dispatch],
  );

  const openQuickUtilities = useCallback(
    (data?: any) => {
      dispatch(openOverlay({ overlayId: "quickUtilities", data }));
    },
    [dispatch],
  );

  const openQuickChatHistory = useCallback(
    (data?: any) => {
      dispatch(openOverlay({ overlayId: "quickChatHistory", data }));
    },
    [dispatch],
  );

  const openVoicePad = useCallback(() => {
    dispatch(openOverlay({ overlayId: "voicePad" }));
  }, [dispatch]);

  return {
    openQuickNotes,
    openQuickTasks,
    openQuickChat,
    openQuickData,
    openQuickFiles,
    openQuickUtilities,
    openQuickChatHistory,
    openVoicePad,
  };
}
