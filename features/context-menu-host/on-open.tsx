"use client";
/**
 * The context menu host members too heavy for the boot file. The engine loads
 * this module together with the menu body (`loadOnOpen` in ./register), so
 * none of it is in the shell's eager graph.
 */
// The rich-document actions (chat's message actions + this app's handlers) register on the call below.
import { ensureWebRichDocumentRegistrations } from "@/features/rich-content-host/rich-document-registrations";
// The designed menu's own stylesheet arrives with the menu on first open (this module is loaded
// by `loadOnOpen`), never in the global stylesheet every page pays for.
import "@ai-matrx/context-menu/styles.css";
import type { ComponentType } from "react";
import type {
  ContextMenuHost,
  ContextMenuHostBindings,
  DocumentAgentReviewProps,
} from "@ai-matrx/context-menu/engine";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
// Debug mode is the chat package's preference write (this app's root reducer turns it into its own
// adminDebug action in the same reduction): the same toggle Matrx 2 binds.
import { selectIsDebugMode, toggleDebugMode } from "@ai-matrx/chat/host/prefs";
import { selectIsSuperAdmin, selectIsSuperAdminDebugger } from "@/lib/redux/slices/userSlice";
import { selectIsOverlayOpen, toggleOverlay } from "@ai-matrx/summon/open";
import { openCompareWithBase, selectHasCompareBase, setCompareBase } from "@ai-matrx/chat/agents/redux/diff-compare/diff-compare.slice";
import { selectActiveScopeIds } from "@/features/scopes/redux/selectors/active-context";
import { useOpenListenSummaryWindow } from "@/features/overlays/definitions/listenSummaryWindow.overlay";
import { useOpenDiffViewerWindow } from "@/features/overlays/definitions/diffViewerWindow.overlay";
import { useOpenFindReplace } from "@/features/overlays/definitions/findReplace.overlay";
import { useOpenReferencePicker } from "@/features/overlays/definitions/referencePicker.overlay";
import { useOpenContextAssignment } from "@/features/overlays/definitions/contextAssignment.overlay";
import { useOpenLinkRecordSheet } from "@/features/overlays/definitions/linkRecordSheet.overlay";
import { useOpenShareModalWindow } from "@/features/overlays/definitions/shareModalWindow.overlay";
import { useOpenStateViewerOverlay } from "@/features/overlays/definitions/adminStateAnalyzer.overlay";
import { useOpenSurfaceContextInspector } from "@/features/overlays/definitions/surfaceContextInspector.overlay";
import { useOpenSurfaceContextWindow } from "@/features/overlays/definitions/surfaceContextWindow.overlay";
import { useOpenSurfaceAgentBindWindow } from "@/features/overlays/definitions/surfaceAgentBindWindow.overlay";
import { useQuickActions } from "@/features/quick-actions/hooks/useQuickActions";
import { getManifest } from "@/features/surfaces/manifests/registry";
import DocumentAgentReview from "@/features/rich-document/hosts/DocumentAgentReview";

// Chat's message actions and this app's handlers, before any registry read.
ensureWebRichDocumentRegistrations();

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
