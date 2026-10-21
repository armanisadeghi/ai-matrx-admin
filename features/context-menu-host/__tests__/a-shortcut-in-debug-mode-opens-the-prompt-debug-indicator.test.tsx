/**
 * THE PROMPT DEBUG INDICATOR HAS A DOOR AGAIN (restored 2026-10-21).
 *
 * Break it names: when the in-app menu moved into @ai-matrx/context-menu (3eef0cab17), nothing opened
 * `promptDebugIndicator` any more. The menu engine calls the host binding `openShortcutDebug` (debug mode
 * only); this app must bind it to the overlay opener. Runs the REAL `useBindings` and the REAL opener;
 * only the store hooks and the heavy sibling openers are doubles.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const dispatched: Array<{ type: string; overlayId?: string; data?: unknown }> = [];
jest.mock("@/lib/redux/hooks", () => ({
  useAppDispatch: () => (a: never) => dispatched.push(a),
  useAppSelector: () => false,
}));
jest.mock("@ai-matrx/summon/open", () => ({
  openOverlay: (p: object) => ({ type: "open", ...p }),
  closeOverlay: (p: object) => ({ type: "close", ...p }),
  selectIsOverlayOpen: () => false,
  toggleOverlay: (p: object) => ({ type: "toggle", ...p }),
}));
jest.mock("@/features/rich-content-host/rich-document-registrations", () => ({ ensureWebRichDocumentRegistrations: () => undefined }));
jest.mock("@ai-matrx/context-menu/styles.css", () => ({}), { virtual: true });
jest.mock("@ai-matrx/chat/host/prefs", () => ({ selectIsDebugMode: () => true, toggleDebugMode: () => ({}) }));
jest.mock("@/lib/redux/slices/userSlice", () => ({ selectIsSuperAdmin: () => true, selectIsSuperAdminDebugger: () => true }));
jest.mock("@ai-matrx/chat/agents/redux/diff-compare/diff-compare.slice", () => ({
  openCompareWithBase: () => ({}),
  selectHasCompareBase: () => false,
  setCompareBase: () => ({}),
}));
jest.mock("@/features/scopes/redux/selectors/active-context", () => ({ selectActiveScopeIds: () => [] }));
const stubOpener = () => () => () => undefined;
jest.mock("@/features/overlays/definitions/listenSummaryWindow.overlay", () => ({ useOpenListenSummaryWindow: stubOpener() }));
jest.mock("@/features/overlays/definitions/diffViewerWindow.overlay", () => ({ useOpenDiffViewerWindow: stubOpener() }));
jest.mock("@/features/overlays/definitions/findReplace.overlay", () => ({ useOpenFindReplace: stubOpener() }));
jest.mock("@/features/overlays/definitions/referencePicker.overlay", () => ({ useOpenReferencePicker: stubOpener() }));
jest.mock("@/features/overlays/definitions/contextAssignment.overlay", () => ({ useOpenContextAssignment: stubOpener() }));
jest.mock("@/features/overlays/definitions/linkRecordSheet.overlay", () => ({ useOpenLinkRecordSheet: stubOpener() }));
jest.mock("@/features/overlays/definitions/shareModalWindow.overlay", () => ({ useOpenShareModalWindow: stubOpener() }));
jest.mock("@/features/overlays/definitions/adminStateAnalyzer.overlay", () => ({ useOpenStateViewerOverlay: stubOpener() }));
jest.mock("@/features/overlays/definitions/surfaceContextInspector.overlay", () => ({ useOpenSurfaceContextInspector: stubOpener() }));
jest.mock("@/features/overlays/definitions/surfaceContextWindow.overlay", () => ({ useOpenSurfaceContextWindow: stubOpener() }));
jest.mock("@/features/overlays/definitions/surfaceAgentBindWindow.overlay", () => ({ useOpenSurfaceAgentBindWindow: stubOpener() }));
jest.mock("@/features/quick-actions/hooks/useQuickActions", () => ({ useQuickActions: () => ({}) }));
jest.mock("@/features/surfaces/manifests/registry", () => ({ getManifest: () => undefined }));
jest.mock("@/features/rich-document/hosts/DocumentAgentReview", () => ({ __esModule: true, default: () => null }));

import { onOpenMembers } from "../on-open";

it("the engine's openShortcutDebug opens promptDebugIndicator with what the shortcut resolved to", () => {
  let bindings: ReturnType<NonNullable<typeof onOpenMembers.useBindings>> | null = null;
  function Probe() {
    bindings = onOpenMembers.useBindings!();
    return null;
  }
  const host = document.createElement("div");
  const root = createRoot(host);
  act(() => root.render(React.createElement(Probe)));
  expect(typeof bindings!.openShortcutDebug).toBe("function");
  const data = {
    promptName: "Summarize",
    placementType: "context-menu",
    selectedText: "hello",
    availableContext: { selection: "hello" },
    resolvedVariables: { selection: "hello" },
    canResolve: { canResolve: true, missingVariables: [], resolvedVariables: ["selection"] },
  };
  bindings!.openShortcutDebug!(data);
  expect(dispatched).toEqual([{ type: "open", overlayId: "promptDebugIndicator", data: { debugData: data } }]);
  act(() => root.unmount());
});
