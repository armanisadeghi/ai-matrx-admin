// The phone editor has Undo and Redo (it had none: a phone user could not undo).
// Fails against the dock without the buttons: no element named exactly "Undo" / "Redo".

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { NoteEditorDock } from "./NoteEditorDock";

jest.mock("../../hooks/useNoteRenderHost", () => ({ useNoteRenderHost: () => false }));
jest.mock("@ai-matrx/rich-content/editor/format/FormatButtons", () => ({ FormatButtons: () => <div data-testid="format" /> }));
jest.mock("@ai-matrx/rich-content/copy/ExportPalette", () => ({
  ExportPaletteAnchor: () => null,
  openExportPalette: jest.fn(),
  useExportPaletteKey: () => "k",
}));
jest.mock("@ai-matrx/rich-content/copy/ContentActions", () => ({ ContentActionMenuRows: () => null }));
jest.mock("@ai-matrx/rich-content/rich-document/runtime/useActionSurfaceProvider", () => ({ richDocumentViewKey: () => "" }));
jest.mock("@ai-matrx/rich-content/copy/copy-commands", () => ({ copyRichContent: jest.fn() }));
jest.mock("@ai-matrx/rich-content/copy/CopyMenuButton", () => ({ CopyMenuButton: () => null }));
jest.mock("@/features/notes/richDocumentSource", () => ({ noteIdentityContentSource: () => ({}) }));
jest.mock("@/components/agent-copy/CopyButtons", () => ({ CopyButtons: () => null }));
jest.mock("@/features/notes/format", () => ({ noteRecordData: () => ({}) }));
jest.mock("../../redux/selectors", () => ({ selectNoteById: () => () => null, selectNoteHomeScopeId: () => () => null }));
jest.mock("@/features/matrx-envelope/referenceClipboard", () => ({ copyReferenceFence: jest.fn() }));
jest.mock("@/features/matrx-envelope/recordReference", () => ({ buildRecordReferenceFence: jest.fn() }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@ai-matrx/design-system", () => ({
  TextInputDialog: () => null,
  BottomSheet: () => null,
  BottomSheetHeader: () => null,
  BottomSheetBody: () => null,
}));
jest.mock("../note-actions/noteActionSet", () => ({ noteActions: () => [], openNotePrintStudio: jest.fn() }));
jest.mock("./MobileNoteToolbar", () => ({ __esModule: true, default: () => null }));
jest.mock("../../homes/NoteHomePanel", () => ({ NoteHomePanel: () => null }));
jest.mock("../../homes/useNoteHomes", () => ({ useNoteHomes: () => ({ labelOf: () => null }) }));
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: (sel: unknown) => (typeof sel === "function" ? (sel as (s: unknown) => unknown)({}) : null) }));
jest.mock("@/hooks/useToastManager", () => ({ useToastManager: () => ({ success: jest.fn() }) }));
jest.mock("@/features/notes/canvas/noteKnowledgeKind", () => ({ useOpenNoteKnowledgePanel: () => jest.fn() }));
jest.mock("../../hooks/useNoteIngestStatus", () => ({ useNoteIngestStatus: () => ({ state: "none" }) }));
jest.mock("@ai-matrx/sharing/react", () => ({ ShareModal: () => null }));
jest.mock("@/lib/clipboard/copy-notify", () => ({ copyNotify: jest.fn() }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
  observe() {}
  disconnect() {}
};

function mount(props: Partial<React.ComponentProps<typeof NoteEditorDock>>) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <NoteEditorDock
        noteId="n1"
        organizationId="o"
        tags={[]}
        content=""
        onTagsChange={jest.fn()}
        onDuplicate={jest.fn()}
        onExport={jest.fn()}
        onDelete={jest.fn()}
        formatResolve={() => null}
        {...props}
      />,
    );
  });
  return { host, root };
}

const named = (host: HTMLElement, name: string) =>
  Array.from(host.querySelectorAll("button")).filter((b) => b.getAttribute("aria-label") === name);

describe("NoteEditorDock Undo / Redo", () => {
  it("renders one Undo and one Redo, disabled with nothing to undo", () => {
    const { host } = mount({ canUndo: false, canRedo: false });
    const [undo] = named(host, "Undo");
    const [redo] = named(host, "Redo");
    expect(named(host, "Undo")).toHaveLength(1);
    expect(named(host, "Redo")).toHaveLength(1);
    expect(undo.disabled).toBe(true);
    expect(redo.disabled).toBe(true);
    expect(undo.className).toContain("h-11");
    expect(undo.className).toContain("w-11");
  });

  it("enables and fires the note's undo / redo", () => {
    const onUndo = jest.fn();
    const onRedo = jest.fn();
    const { host } = mount({ canUndo: true, canRedo: true, onUndo, onRedo });
    act(() => named(host, "Undo")[0].click());
    act(() => named(host, "Redo")[0].click());
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(1);
  });

  it("is absent in Read (no formatting target)", () => {
    const { host } = mount({ formatResolve: null });
    expect(named(host, "Undo")).toHaveLength(0);
  });
});
