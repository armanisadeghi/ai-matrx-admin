/**
 * Walk 3 O2: with History open on doc1, opening doc2 in the same tab left doc1's versions and Restore buttons up
 * under a generic title. A history tab belongs to ONE open document: it closes with that document's editor, shows
 * no Restore when its document is not open, and Restore refuses (and names the document) when it is not the open one.
 *
 * Real pieces: the app's root reducer, the one canvas binding, `useToolToggle`, the registry and the real
 * `DocumentHistoryViewer`. Only the data doors (snapshot list, restore) are fakes.
 */

import React, { act, useEffect } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { configureStore } from "@reduxjs/toolkit";
import { CanvasColumn } from "@ai-matrx/canvas/react";
import { createSlimRootReducer } from "@/lib/redux/rootReducer";
import { CanvasHostProvider } from "@/features/canvas/host/CanvasHostProvider";
import { useToolToggle } from "@/features/canvas/host/toolCanvas";
import { useHistorySubject } from "@/features/canvas/host/historySubject";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DOCUMENT_HISTORY_KIND, documentHistoryToggleInput } from "@ai-matrx/office/univer/history";
import { DocumentHistoryViewer } from "@/features/documents/components/DocumentHistoryViewer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// eslint-disable-next-line @typescript-eslint/no-require-imports
globalThis.MessageChannel ??= require("node:worker_threads").MessageChannel;
Element.prototype.scrollIntoView ??= function scrollIntoView() {};

const restore = jest.fn(async () => undefined);
jest.mock("next/navigation", () => ({ usePathname: () => "/documents/d-1", useRouter: () => ({ push: () => undefined }) }));
jest.mock("@ai-matrx/office/docs", () => ({
  listDocumentSnapshots: async () => ({
    success: true,
    data: [
      { id: "s2", origin: "autosave", created_at: "2026-10-22T10:00:00Z", label: null },
      { id: "s1", origin: "autosave", created_at: "2026-10-22T09:00:00Z", label: null },
    ],
  }),
}));
jest.mock("@ai-matrx/office/univer/collab", () => ({ restoreDocumentSnapshot: (...a: unknown[]) => (restore as (...x: unknown[]) => unknown)(...a) }));
jest.mock("@/utils/supabase/client", () => ({
  supabase: {
    schema: () => ({
      from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { snapshot: {}, label: null, created_at: null }, error: null }) }) }) }),
    }),
  },
}));

function makeStore() {
  return configureStore({
    reducer: createSlimRootReducer(),
    middleware: (getDefault) => getDefault({ serializableCheck: false, immutableCheck: false }),
  });
}
const tabs = (store: ReturnType<typeof makeStore>) => Object.keys(store.getState().canvasHost.items);
const flush = async () => {
  for (let i = 0; i < 6; i += 1) await act(async () => {});
};

type Toggle = { toggle: () => void };
const seen: { t: Toggle | null } = { t: null };

/** What the editors do: own the History button for their document, register it as open. */
function Editor({ id, name, owns = true }: { id: string; name: string; owns?: boolean }) {
  const toggle = useToolToggle(documentHistoryToggleInput(id, true, name));
  useEffect(() => {
    seen.t = toggle;
  });
  useHistorySubject(owns ? DOCUMENT_HISTORY_KIND : "never-registered", id);
  return null;
}

function mount(store: ReturnType<typeof makeStore>, el: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const render = (e: React.ReactElement) =>
    act(() => {
      root.render(
        <QueryClientProvider client={new QueryClient()}>
          <Provider store={store}>
            <TooltipProvider>
              <CanvasHostProvider>
                <CanvasColumn />
                {e}
              </CanvasHostProvider>
            </TooltipProvider>
          </Provider>
        </QueryClientProvider>,
      );
    });
  render(el);
  return { render, unmount: () => { act(() => root.unmount()); container.remove(); } };
}

describe("a document's history follows its document", () => {
  beforeEach(() => restore.mockClear());

  it("opening another document takes the first one's history down", async () => {
    const store = makeStore();
    const m = mount(store, <Editor id="d-1" name="Doc one" />);
    act(() => seen.t?.toggle());
    await flush();
    expect(tabs(store)).toContain(`${DOCUMENT_HISTORY_KIND}::d-1`);
    expect(document.body.textContent).toContain("Doc one");
    expect(document.body.textContent).toContain("Restore");

    m.render(<Editor id="d-2" name="Doc two" />);
    await flush();
    expect(tabs(store)).not.toContain(`${DOCUMENT_HISTORY_KIND}::d-1`);
    expect(document.body.textContent).not.toContain("Restore");
    m.unmount();
  });

  it("a history tab whose document is not open offers no Restore", async () => {
    const store = makeStore();
    const m = mount(store, <Editor id="d-1" name="Doc one" owns={false} />);
    act(() => seen.t?.toggle());
    await flush();
    expect(tabs(store)).toContain(`${DOCUMENT_HISTORY_KIND}::d-1`);
    expect(document.body.textContent).toContain("is not open");
    expect(document.body.textContent).not.toContain("Restore");
    m.unmount();
  });

  it("a stale history window never calls a different, same-titled document 'not open'", async () => {
    const store = makeStore();
    const m = mount(store, <Editor id="d-1" name="Untitled document" owns={false} />);
    act(() => seen.t?.toggle());
    await flush();
    const text = document.body.textContent ?? "";
    expect(text).toContain("The document you opened History from is not open");
    expect(text).not.toContain("“Untitled document” is not open");
    m.unmount();
  });

  it("Restore names its document and refuses when that document is not the open one", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    let open = true;
    await act(async () => {
      root.render(<DocumentHistoryViewer documentId="d-1" editable subjectName="Doc one" canRestore={() => open} />);
    });
    await flush();
    const button = container.querySelector<HTMLButtonElement>('button[title^="Restore this version of"]')!;
    expect(button.title).toBe("Restore this version of “Doc one”");
    open = false;
    await act(async () => button.click());
    await flush();
    expect(restore).not.toHaveBeenCalled();
    open = true;
    await act(async () => button.click());
    await flush();
    expect(restore).toHaveBeenCalledTimes(1);
    expect((restore.mock.calls[0] as unknown[])[0]).toMatchObject({ documentId: "d-1" });
    act(() => root.unmount());
    container.remove();
  });

  it("every editor that owns a History button registers its document", () => {
    for (const [file, kind] of [
      ["../components/DocumentEditor.tsx", "DOCUMENT_HISTORY_KIND"],
      ["../components/DocumentRecord.tsx", "DOCUMENT_HISTORY_KIND"],
      ["../../workbooks/components/WorkbookEditor.tsx", "WORKBOOK_HISTORY_KIND"],
    ] as const) {
      expect(readFileSync(join(__dirname, file), "utf8")).toContain(`useHistorySubject(${kind},`);
    }
  });
});
