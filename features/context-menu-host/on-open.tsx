"use client";
/**
 * The context menu host members too heavy for the boot file. The engine loads
 * this module together with the menu body (`loadOnOpen` in ./register), so
 * none of it is in the shell's eager graph.
 */
// Side effect: the copy/save/export/convert rich-document handlers self-register.
import "@/features/rich-document/actions/handlers";
import type { ComponentType } from "react";
import type {
  ContextMenuHost,
  ContextMenuHostBindings,
  DocumentAgentReviewProps,
} from "@ai-matrx/context-menu/engine";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectIsDebugMode, toggleDebugMode } from "@/lib/redux/preferences/adminDebugSlice";
import { selectIsSuperAdmin, selectIsSuperAdminDebugger } from "@/lib/redux/slices/userSlice";
import { selectIsOverlayOpen, toggleOverlay } from "@/lib/redux/slices/overlaySlice";
import { openCompareWithBase, selectHasCompareBase, setCompareBase } from "@/lib/redux/slices/diffCompareSlice";
import { selectActiveScopeIds } from "@/features/scopes/redux/selectors/active-context";
import { useOpenListenSummaryWindow } from "@/features/overlays/openers/listenSummaryWindow";
import { useOpenDiffViewerWindow } from "@/features/overlays/openers/diffViewerWindow";
import { useOpenFindReplace } from "@/features/overlays/openers/findReplace";
import { useOpenReferencePicker } from "@/features/overlays/openers/referencePicker";
import { useOpenContextAssignment } from "@/features/overlays/openers/contextAssignment";
import { useOpenLinkRecordSheet } from "@/features/overlays/openers/linkRecordSheet";
import { useOpenShareModalWindow } from "@/features/overlays/openers/shareModalWindow";
import { useOpenStateViewerOverlay } from "@/features/overlays/openers/adminStateAnalyzer";
import { useOpenSurfaceContextInspector } from "@/features/overlays/openers/surfaceContextInspector";
import { useOpenSurfaceContextWindow } from "@/features/overlays/openers/surfaceContextWindow";
import { useOpenSurfaceAgentBindWindow } from "@/features/overlays/openers/surfaceAgentBindWindow";
import { useQuickActions } from "@/features/quick-actions/hooks/useQuickActions";
import { getManifest } from "@/features/surfaces/manifests/registry";
import DocumentAgentReview from "@/features/rich-document/hosts/DocumentAgentReview";

/** A hook: the engine calls it once per open menu, unconditionally. */
function useAppContextMenuBindings(): ContextMenuHostBindings {
  const dispatch = useAppDispatch();
  const quick = useQuickActions();
  // The port's option shapes are the engine's (strings where the app has token
  // unions); the engine hands these openers exactly what the in-repo menu did.
  const findReplace = useOpenFindReplace();
  const contextAssignment = useOpenContextAssignment();
  const linkRecordSheet = useOpenLinkRecordSheet();
  const shareModalWindow = useOpenShareModalWindow();
  const surfaceInspector = useOpenSurfaceContextInspector();
  return {
    isAdminDebugger: useAppSelector(selectIsSuperAdminDebugger),
    hasAdminPower: useAppSelector(selectIsSuperAdmin),
    isDebugMode: useAppSelector(selectIsDebugMode),
    isAdminIndicatorOpen: useAppSelector((state) => selectIsOverlayOpen(state, "adminIndicator")),
    hasCompareBase: useAppSelector(selectHasCompareBase),
    activeScopeIds: useAppSelector(selectActiveScopeIds),
    toggleDebugMode: () => {
      dispatch(toggleDebugMode());
    },
    toggleAdminIndicator: () => {
      dispatch(toggleOverlay({ overlayId: "adminIndicator" }));
    },
    setCompareBase: (input) => {
      dispatch(setCompareBase(input));
    },
    openCompareWithBase: (input) => dispatch(openCompareWithBase(input)).unwrap(),
    openListenSummaryWindow: useOpenListenSummaryWindow(),
    openDiffWindow: useOpenDiffViewerWindow(),
    openFindReplace: (options) => {
      findReplace(options as Parameters<typeof findReplace>[0]);
    },
    openReferencePicker: useOpenReferencePicker(),
    openContextAssignment: (options) => {
      contextAssignment(options as Parameters<typeof contextAssignment>[0]);
    },
    openLinkRecordSheet: (options) => {
      linkRecordSheet(options as Parameters<typeof linkRecordSheet>[0]);
    },
    openShareModalWindow: (options) => {
      shareModalWindow(options as Parameters<typeof shareModalWindow>[0]);
    },
    openStateViewer: useOpenStateViewerOverlay(),
    openSurfaceInspector: (options) => {
      surfaceInspector(options as Parameters<typeof surfaceInspector>[0]);
    },
    openSurfaceContextWindow: useOpenSurfaceContextWindow(),
    openBindAgent: useOpenSurfaceAgentBindWindow(),
    quickActions: {
      openChatWindow: quick.openChatWindow,
      openQuickChat: quick.openQuickChat,
      openQuickData: quick.openQuickData,
      openQuickFiles: quick.openQuickFiles,
      openQuickNotes: quick.openQuickNotes,
      openQuickTasks: quick.openQuickTasks,
      openVoicePad: quick.openVoicePad,
    },
  };
}

export const onOpenMembers: Partial<Omit<ContextMenuHost, "loadOnOpen">> = {
  useBindings: useAppContextMenuBindings,
  getSurfaceManifest: getManifest,
  DocumentAgentReview: DocumentAgentReview as unknown as ComponentType<DocumentAgentReviewProps>,
};
