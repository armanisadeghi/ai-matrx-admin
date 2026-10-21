/**
 * @jest-environment jsdom
 *
 * Review 4, F12: right-click "Comment" on selected text. The registry row
 * `comment-selection` shows only while the selection sits in an area where
 * comments are on (an annotation zone that can pin it), and choosing it opens
 * THE SAME composer the selection toolbar's Comment opens, through the real
 * root, the real Alchemy registry and the real annotation sidecar.
 *
 * (The harness below is the selection toolbar suite's own.)
 *
 * THE ONE SELECTION TOOLBAR — behavior a person relies on, through the real
 * root, the real Alchemy registry + package selection layout, and the real
 * annotation sidecar (only the network edge is replaced):
 *
 *   • reading: a student selects "statistical" in her study guide and sees the
 *     reading set (five highlight colors, comment, suggest); a highlight
 *     saves through the sidecar exactly as before (createHighlight, quote kept);
 *   • editing: the same text inside an editable zone shows no highlight
 *     colors (the knob's default) but keeps Comment;
 *   • phone width: the toolbar docks at the bottom edge (never beside the
 *     selection, so it never fights the native selection menu);
 *   • keyboard: Ctrl+Alt+M focuses the first control, arrows move, Esc closes
 *     and focus returns to where it was.
 */

import React, { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let phone = false;
window.matchMedia = ((q: string) => ({ matches: phone, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia;
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
}
if (!("randomUUID" in globalThis.crypto)) {
  let n = 0;
  (globalThis.crypto as unknown as { randomUUID: () => string }).randomUUID = () =>
    `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
}
// jsdom has no layout: give ranges a box so the toolbar has somewhere to sit.
if (!Range.prototype.getBoundingClientRect) {
  Range.prototype.getBoundingClientRect = () => ({ left: 300, top: 400, bottom: 420, right: 380, width: 80, height: 20, x: 300, y: 400, toJSON() {} }) as DOMRect;
}

const service = {
  listCommentThreads: jest.fn(),
  listEdgeItems: jest.fn(),
  annotationPairs: jest.fn(async () => ({ highlights: true, links: true })),
  addComment: jest.fn(),
  editComment: jest.fn(),
  deleteComment: jest.fn(),
  resolveComment: jest.fn(),
  createHighlight: jest.fn(async () => ({ documentId: "d-1", edgeId: "e-1" })),
  deleteHighlight: jest.fn(),
  linkRecord: jest.fn(),
  unlinkRecord: jest.fn(),
  notifyMentions: jest.fn(),
  rewriteHighlightEdge: jest.fn(),
  saveHighlightNote: jest.fn(),
  mentionCandidates: jest.fn(async () => []),
  canEditSource: jest.fn(async () => true),
};
jest.mock("@/features/rich-document/annotations/service", () => service);
jest.mock("@ai-matrx/data/realtime/react", () => ({ useChannel: jest.fn(), useRealtimeManager: () => null }));
jest.mock("@ai-matrx/data/realtime", () => ({ defineChannelNamespace: () => ({ topic: () => "t" }) }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/features/scopes/host/associationsStore", () => ({
  getAssociationsStore: () => ({ titles: { fetch: async () => new Map() } }),
}));
jest.mock("@/features/scopes/registry/entityRegistry", () => ({ tryGetEntityInfo: () => null }));
jest.mock("@/features/scopes/service/associationCandidates", () => ({ searchCandidatesAcrossTokens: jest.fn(async () => []) }));
jest.mock("@/utils/auth/getUserId", () => ({ getUserId: () => "me" }));
jest.mock("@ai-matrx/auth/organizations", () => ({ ...jest.requireActual("@ai-matrx/auth/organizations"), ...(() => ({ isOrganizationRequiredError: () => false }))() }));
jest.mock("@ai-matrx/chat/host/org", () => ({
  ...jest.requireActual("@ai-matrx/chat/host/org"),
  ...(() => ({ organizationRefusalMessage: () => "" }))(),
}));
jest.mock("@/lib/toast", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() } }));
jest.mock("@/components/official/entity-ref/EntityRef", () => ({ EntityRef: () => null }));
jest.mock("@ai-matrx/rich-content/levels/RichContent", () => ({ RichContent: ({ source }: { source: string }) => <span>{source}</span> }));
jest.mock("@/features/rich-document/annotations/LinkRecordSheet", () => ({ LinkRecordSheet: () => null }));
// The root's identity + knob reads (the knob answers "not loaded": the code default holds).
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: () => null, useAppDispatch: () => jest.fn() }));
// The chat package reads these hooks through its own module (P3): one double covers both.
jest.mock("@ai-matrx/chat/store/hooks", () => jest.requireMock("@/lib/redux/hooks"));
jest.mock("@/lib/scoped-config/effectiveKnobs.client", () => ({ useEffectiveKnob: () => undefined }));
// The frame is split out with next/dynamic in the app; here it loads synchronously.
jest.mock("next/dynamic", () => () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("@ai-matrx/rich-content/selection-toolbar/SelectionToolbarFrame").default;
});

import { createActionRegistry } from "@ai-matrx/alchemy/actions";
import { AlchemyActionsProvider } from "@ai-matrx/alchemy/react/host";
import type { AlchemyHostPorts } from "@ai-matrx/alchemy/ports";
import { resolveAlchemyIcon } from "@ai-matrx/rich-content/utils/alchemy-icon-keys";
import { AnnotatedContent, AnnotationSidecarProvider, useSidecar } from "@/features/rich-document/annotations/AnnotationSidecar";
import { toast } from "@/lib/toast";
import { SelectionToolbarRoot } from "@/components/selection-toolbar/SelectionToolbarRoot";
import { useSelectionZone } from "@ai-matrx/rich-content/selection-toolbar/selection-zones";
import { declareSelectionProvider, hostHalf } from "@ai-matrx/rich-content/selection-toolbar/selection-actions";
import { registerAlchemyIcon } from "@ai-matrx/rich-content/utils/alchemy-icon-keys";
import { Bold } from "lucide-react";

const BODY = "## Maps\n\nShades represent statistical data.";
const SOURCE = { token: "note", id: "guide-7", title: "Maps", body: BODY, contentVersion: 1 };

const ports = {
  icons: { resolve: resolveAlchemyIcon },
  diagnostics: { capture: jest.fn() },
  notify: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
} as unknown as AlchemyHostPorts;

/** An editable wrapper zone (what a rich editor registers). */
function EditableZone({ children }: { children: React.ReactNode }) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  useSelectionZone(el, { editable: true });
  return <div ref={setEl}>{children}</div>;
}

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  phone = false;
  jest.clearAllMocks();
  service.listCommentThreads.mockResolvedValue({ items: [], collaborationDoors: true });
  service.listEdgeItems.mockResolvedValue({ highlights: [], links: [] });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  // The sidecar store keeps a source's read for the whole tab (read-once law); a test that
  // re-mocks the comments must start from an empty store, not the previous test's read.
  act(() => (jest.requireActual("@/features/rich-document/annotations/sidecarStore") as typeof import("@/features/rich-document/annotations/sidecarStore")).resetSidecarStoreForTests());
  container.remove();
  window.getSelection()?.removeAllRanges();
});

async function flush(n = 8) {
  for (let i = 0; i < n; i++) await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
}

const grabbed: { current: ReturnType<typeof useSidecar> | null } = { current: null };
function Grab() {
  const sidecar = useSidecar();
  React.useEffect(() => {
    grabbed.current = sidecar;
  });
  return null;
}

async function mount(editable = false, outside = false) {
  const registry = createActionRegistry({ ports });
  const content = (
    <AnnotatedContent>
      <h2>Maps</h2>
      <p>Shades represent statistical data.</p>
    </AnnotatedContent>
  );
  await act(async () => {
    root.render(
      <AlchemyActionsProvider ports={ports} registry={registry}>
        <AnnotationSidecarProvider source={SOURCE}>
          <Grab />
          {editable ? <EditableZone>{content}</EditableZone> : content}
          {outside ? <p>Plain words with no comments here.</p> : null}
        </AnnotationSidecarProvider>
        <SelectionToolbarRoot />
      </AlchemyActionsProvider>,
    );
  });
  await flush();
}

async function selectWord(word: string, opts: { pointer?: boolean } = { pointer: true }) {
  const p = [...container.querySelectorAll("p")].find((x) => x.textContent?.includes(word))!;
  const t = p.firstChild as Text;
  const at = t.textContent!.indexOf(word);
  await act(async () => {
    const r = document.createRange();
    r.setStart(t, at);
    r.setEnd(t, at + word.length);
    const s = window.getSelection()!;
    s.removeAllRanges();
    s.addRange(r);
    document.dispatchEvent(new Event("selectionchange"));
    if (opts.pointer) document.dispatchEvent(Object.assign(new MouseEvent("pointerup", { bubbles: true, clientX: 320, clientY: 410 })));
  });
  await act(async () => { await new Promise((r) => setTimeout(r, 700)); });
  await flush();
}

const toolbar = () => document.querySelector<HTMLElement>("[data-selection-toolbar]");
const labels = () => [...(toolbar()?.querySelectorAll("button") ?? [])].map((b) => b.getAttribute("aria-label"));

import { getAction } from "@ai-matrx/rich-content/rich-document/actions/provider";
import type { RichDocumentActionContext } from "@ai-matrx/rich-content/rich-document/types";
import "@/features/rich-document/actions/handlers/comment-selection";

const ctx = { onClose: jest.fn() } as unknown as RichDocumentActionContext;
const commentRow = () => {
  const action = getAction("comment-selection");
  if (!action) throw new Error("comment-selection is not registered");
  return action;
};
// The comment panel: the passage quoted, then the composer.
const composer = () => toolbar()?.querySelector<HTMLTextAreaElement>("[data-selection-panel] textarea[aria-label^='Comment']") ?? null;
const quoted = () => toolbar()?.querySelector("[data-selection-panel] blockquote")?.textContent ?? null;

/**
 * The context the menu engine hands a row for ONE open (useContextMenuActions): the selection this
 * right-click captured (`openSelection`, a copy of its range) and the same words in the scope.
 */
const openOn = (range: Range | null) =>
  ({
    ...ctx,
    applicationScope: { selection: range ? range.toString() : "" },
    openSelection: range && range.toString().trim() ? { text: range.toString(), range: range.cloneRange() } : null,
  }) as unknown as RichDocumentActionContext;
const liveRange = () => {
  const s = window.getSelection();
  return s && s.rangeCount > 0 && !s.isCollapsed ? s.getRangeAt(0) : null;
};
/** Select `word` and announce it, without waiting (a person who right-clicks at once). */
function selectNow(word: string) {
  const p = [...container.querySelectorAll("p")].find((x) => x.textContent?.includes(word))!;
  const t = p.firstChild as Text;
  const at = t.textContent!.indexOf(word);
  const r = document.createRange();
  r.setStart(t, at);
  r.setEnd(t, at + word.length);
  const s = window.getSelection()!;
  s.removeAllRanges();
  s.addRange(r);
  document.dispatchEvent(new Event("selectionchange"));
}
/** A right-click: the menu captures the selection, then the browser collapses it (live after the first open). */
function rightClick(): RichDocumentActionContext {
  const open = openOn(liveRange());
  window.getSelection()?.removeAllRanges();
  document.dispatchEvent(new Event("selectionchange"));
  return open;
}

it("over a selection where comments are on, the row shows and opens the toolbar's own comment composer", async () => {
  await mount();
  await selectWord("statistical", { pointer: false });
  const open = openOn(liveRange());
  expect(commentRow().visible?.(open)).toBe(true);
  expect(typeof commentRow().label === "string" ? commentRow().label : "").toBe("Comment");
  await act(async () => {
    await commentRow().run(open);
  });
  await act(async () => { await new Promise((r) => setTimeout(r, 400)); });
  await flush(20);
  expect(toolbar()).not.toBeNull();
  expect(composer()).not.toBeNull();
  // The comment pins the passage the menu opened on.
  expect(quoted()).toBe("statistical");
  expect(toast.error).not.toHaveBeenCalled();
});

it("the live sequence: open with nothing selected, select, right-click (it collapses the selection), then open with nothing again", async () => {
  await mount();
  // Open 1: nothing selected.
  expect(commentRow().visible?.(rightClick())).toBe(false);
  // Open 2: select and right-click at once; the right-click collapses the live selection.
  selectNow("statistical");
  const second = rightClick();
  expect(window.getSelection()?.isCollapsed ?? true).toBe(true);
  expect(commentRow().visible?.(second)).toBe(true);
  // Open 3: nothing selected; nothing is kept from open 2.
  expect(commentRow().visible?.(rightClick())).toBe(false);
  // Choosing Comment on open 2 still pins open 2's passage.
  await act(async () => {
    await commentRow().run(second);
  });
  await act(async () => { await new Promise((r) => setTimeout(r, 400)); });
  await flush(20);
  expect(composer()).not.toBeNull();
  expect(quoted()).toBe("statistical");
});

it("outside an area where comments are on the row is absent", async () => {
  await mount(false, true);
  expect(commentRow().visible?.(openOn(null))).toBe(false);
  await selectWord("comments here", { pointer: false });
  expect(window.getSelection()?.toString()).toBe("comments here");
  expect(commentRow().visible?.(openOn(liveRange()))).toBe(false);
});
