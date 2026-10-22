/**
 * FIND & REPLACE SEARCHES THE FIELD THE RIGHT-CLICK HAPPENED IN — AFTER THE MENU CLOSES (2026-10-21).
 *
 * Break it names: on /chat/c/<id>, "apple pie apple tart apple juice" in the composer, right-click →
 * Find & Replace → "apple" read "No results" (Matrx 2: 1/3). The engine hands the host
 * `openFindReplace({ getTargetElement })` from INSIDE the menu body; the web's opener parked that
 * accessor in a callback group and disposed every group it made when ITS component unmounted —
 * and the menu body unmounts the moment the menu closes, before the lazy overlay body reads the
 * group. The overlay found no group, so no target, so no results.
 *
 * Runs the REAL `useBindings` (features/context-menu-host/on-open), the REAL findReplace opener and
 * the REAL overlay body (findReplace.render → the chat package's FindReplaceWindow) over a page that
 * holds a controlled composer textarea (its value written by React, like the chat composer) beside
 * another text block that also says "apple". Only the store hooks and the sibling openers are doubles.
 */
import React, { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const dispatched: Array<{ type: string; overlayId?: string; data?: { callbackGroupId?: string } }> = [];
jest.mock("@/lib/redux/hooks", () => ({
  // Openers dispatch summon's createOpener actions; the mocked summon/open creators below cover the rest.
  useAppDispatch: () => (a: { type: string; payload?: object }) =>
    dispatched.push(
      a.type === "overlays/openOverlay"
        ? ({ type: "open", ...a.payload } as never)
        : a.type === "overlays/closeOverlay"
          ? ({ type: "close", ...a.payload } as never)
          : (a as never),
    ),
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
jest.mock("@ai-matrx/chat/host/prefs", () => ({ selectIsDebugMode: () => false, toggleDebugMode: () => ({}) }));
jest.mock("@/lib/redux/slices/userSlice", () => ({ selectIsSuperAdmin: () => false, selectIsSuperAdminDebugger: () => false }));
jest.mock("@ai-matrx/chat/agents/redux/diff-compare/diff-compare.slice", () => ({
  openCompareWithBase: () => ({}),
  selectHasCompareBase: () => false,
  setCompareBase: () => ({}),
}));
jest.mock("@/features/scopes/redux/selectors/active-context", () => ({ selectActiveScopeIds: () => [] }));
const stubOpener = () => () => () => undefined;
jest.mock("@/features/overlays/definitions/listenSummaryWindow.overlay", () => ({ useOpenListenSummaryWindow: stubOpener() }));
jest.mock("@/features/overlays/definitions/diffViewerWindow.overlay", () => ({ useOpenDiffViewerWindow: stubOpener() }));
jest.mock("@/features/overlays/definitions/referencePicker.overlay", () => ({ useOpenReferencePicker: stubOpener() }));
jest.mock("@/features/overlays/definitions/contextAssignment.overlay", () => ({ useOpenContextAssignment: stubOpener() }));
jest.mock("@/features/overlays/definitions/linkRecordSheet.overlay", () => ({ useOpenLinkRecordSheet: stubOpener() }));
jest.mock("@/features/overlays/definitions/shareModalWindow.overlay", () => ({ useOpenShareModalWindow: stubOpener() }));
jest.mock("@/features/overlays/definitions/adminStateAnalyzer.overlay", () => ({ useOpenStateViewerOverlay: stubOpener() }));
jest.mock("@/features/overlays/definitions/surfaceContextInspector.overlay", () => ({ useOpenSurfaceContextInspector: stubOpener() }));
jest.mock("@/features/overlays/definitions/surfaceContextWindow.overlay", () => ({ useOpenSurfaceContextWindow: stubOpener() }));
jest.mock("@/features/overlays/definitions/surfaceAgentBindWindow.overlay", () => ({ useOpenSurfaceAgentBindWindow: stubOpener() }));
jest.mock("@/features/overlays/definitions/promptDebugIndicator.overlay", () => ({ useOpenPromptDebugIndicator: stubOpener() }));
jest.mock("@/features/quick-actions/hooks/useQuickActions", () => ({ useQuickActions: () => ({}) }));
jest.mock("@/features/surfaces/manifests/registry", () => ({ getManifest: () => undefined }));
jest.mock("@/features/rich-document/hosts/DocumentAgentReview", () => ({ __esModule: true, default: () => null }));

import { onOpenMembers } from "@/features/context-menu-host/on-open";
import FindReplaceRender from "../definitions/findReplace.render";

/** The overlay host's props for this body (only data and close are read). */
function FindReplaceOverlay({ data, close }: { data: unknown; close: () => void }) {
  return <FindReplaceRender overlayId="findReplace" instanceId="default" data={data as never} isOpen close={close} hidden={false} />;
}

const roots: Root[] = [];
afterEach(async () => {
  for (const r of roots.splice(0)) await act(async () => r.unmount());
  document.body.innerHTML = "";
  dispatched.length = 0;
});

function mount(node: React.ReactElement): Root {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  roots.push(root);
  act(() => root.render(node));
  return root;
}

/** The page: a transcript block above, a composer whose value React owns. */
function Page({ onText }: { onText: (set: (v: string) => void) => void }) {
  const [text, setText] = useState("");
  onText(setText);
  return (
    <div>
      <div data-testid="transcript">Test Request — apple orchard notes, apple cider</div>
      <textarea data-testid="composer" value={text} onChange={(e) => setText(e.target.value)} />
    </div>
  );
}

const wait = (ms: number) => act(async () => new Promise((r) => setTimeout(r, ms)));
function type(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

it("the find bar counts the composer's matches after the menu that opened it has closed", async () => {
  let setComposer: (v: string) => void = () => undefined;
  mount(<Page onText={(s) => (setComposer = s)} />);
  act(() => setComposer("apple pie apple tart apple juice"));
  const composer = document.querySelector('[data-testid="composer"]') as HTMLTextAreaElement;
  expect(composer.value).toBe("apple pie apple tart apple juice");

  // The open menu: the engine calls the host's bindings and, on "Find & Replace", hands the
  // right-clicked field over.
  let bindings: ReturnType<NonNullable<typeof onOpenMembers.useBindings>> | null = null;
  function MenuBody() {
    bindings = onOpenMembers.useBindings!();
    return null;
  }
  const menu = mount(<MenuBody />);
  const replaced: string[] = [];
  bindings!.openFindReplace({ getTargetElement: () => composer, onReplace: (t: string) => replaced.push(t) });

  // The menu closes (its body unmounts) BEFORE the lazy overlay body draws.
  await act(async () => menu.unmount());
  roots.splice(roots.indexOf(menu), 1);

  const open = dispatched.find((a) => a.type === "open" && a.overlayId === "findReplace");
  expect(open?.data?.callbackGroupId).toEqual(expect.any(String));
  mount(<FindReplaceOverlay data={open!.data} close={jest.fn()} />);

  const find = document.querySelector('input[placeholder="Find"]') as HTMLInputElement;
  await act(async () => type(find, "apple"));
  await wait(350);
  const panel = document.querySelector("[data-find-replace-panel]")?.textContent ?? "";
  // The composer's three, never the transcript's two, never "No results".
  expect(panel).toContain("1/3");
});

it("closing the find bar drops its group (the overlay owns the lifetime, so nothing leaks)", async () => {
  const { getFindReplaceCallbackGroup } = jest.requireActual("../definitions/callbacks/findReplace") as typeof import("../definitions/callbacks/findReplace");
  const field = document.createElement("textarea");
  document.body.appendChild(field);
  let bindings: ReturnType<NonNullable<typeof onOpenMembers.useBindings>> | null = null;
  function MenuBody() {
    bindings = onOpenMembers.useBindings!();
    return null;
  }
  mount(<MenuBody />);
  bindings!.openFindReplace({ getTargetElement: () => field, onReplace: () => undefined });
  const id = dispatched.find((a) => a.overlayId === "findReplace")!.data!.callbackGroupId!;
  const close = jest.fn();
  mount(<FindReplaceOverlay data={{ callbackGroupId: id }} close={close} />);
  expect(getFindReplaceCallbackGroup(id)).not.toBeNull();
  const find = document.querySelector('input[placeholder="Find"]') as HTMLInputElement;
  await act(async () => find.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  expect(close).toHaveBeenCalled();
  expect(getFindReplaceCallbackGroup(id)).toBeNull();
});
