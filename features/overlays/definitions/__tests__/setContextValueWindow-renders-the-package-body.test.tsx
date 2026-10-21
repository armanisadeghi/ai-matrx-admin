/**
 * The `setContextValueWindow` overlay renders the chat package's Set Context Value window — the SAME
 * body Matrx 2 opens — inside the web's own scope store (`ScopeContextSourceProvider` with
 * `useWebScopeContextSource`), so the window reads the `scopesTree` / `contextValues` Redux every
 * other scope screen draws from and writes through `setContextValue`. The web's copies (window,
 * SetContextValueCore, useSetContextValue, ScopeContextTargetPicker) are gone.
 *
 * Red before: the render file drew `@/features/window-panels/windows/scopes/SetContextValueWindow`.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { existsSync } from "node:fs";
import { join } from "node:path";

const windowProps: Array<Record<string, unknown>> = [];
const providedSources: unknown[] = [];
const dispatch = jest.fn((action: unknown) => action);

jest.mock("@ai-matrx/chat/window-panels/windows/scopes/SetContextValueWindow", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    windowProps.push(props);
    return null;
  },
}));
jest.mock("@ai-matrx/chat/window-panels/windows/scopes/scope-context-source", () => ({
  ScopeContextSourceProvider: ({ source, children }: { source: unknown; children?: unknown }) => {
    providedSources.push(source);
    return children ?? null;
  },
}));
jest.mock("@/lib/redux/hooks", () => ({ useAppDispatch: () => dispatch, useAppSelector: () => undefined }));
jest.mock("@/features/scopes/redux/thunks/setContextValue", () => ({
  setContextValue: (write: unknown) => ({ type: "setContextValue", write }),
}));
jest.mock("@/features/scopes/redux/thunks/ensureScopeTree", () => ({ ensureScopeTree: () => ({ type: "ensureScopeTree" }) }));
jest.mock("@/features/scopes/redux/thunks/ensureScopeTypeItems", () => ({ ensureScopeTypeItems: () => ({ type: "ensureScopeTypeItems" }) }));
jest.mock("@/features/scopes/redux/thunks/ensureContextValues", () => ({ ensureContextValues: () => ({ type: "ensureContextValues" }) }));

import OverlayRender from "../setContextValueWindow.render";

describe("the setContextValueWindow overlay", () => {
  it("renders the package window with the opener's payload, inside the web's scope store", async () => {
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: true });
    const close = jest.fn();
    const root = createRoot(document.createElement("div"));
    const data = { initialContent: "A paragraph from a message", initialEditorMode: "preview" };
    await act(async () =>
      root.render(<OverlayRender overlayId="setContextValueWindow" isOpen hidden={false} data={data} instanceId="i-1" close={close} />),
    );
    const p = windowProps[windowProps.length - 1]!;
    expect(p).toMatchObject({ isOpen: true, initialContent: "A paragraph from a message", initialEditorMode: "preview", instanceId: "i-1" });
    (p.onClose as () => void)();
    expect(close).toHaveBeenCalled();

    const source = providedSources[providedSources.length - 1] as Record<string, unknown>;
    for (const reader of ["useTree", "useFields", "useValues", "writeValue"]) expect(typeof source[reader]).toBe("function");
    const write = { scope_id: "s-1", field_id: "f-1", kind: "string", value: "x" };
    (source.writeValue as (w: unknown) => unknown)(write);
    expect(dispatch).toHaveBeenCalledWith({ type: "setContextValue", write });
    await act(async () => root.unmount());
  });

  it("keeps no web copy of the window, its body, its hook or its picker", () => {
    for (const file of [
      "features/window-panels/windows/scopes/SetContextValueWindow.tsx",
      "features/scopes/actions/quick-assign/SetContextValueCore.tsx",
      "features/scopes/actions/quick-assign/useSetContextValue.ts",
      "features/scopes/components/quick-assign/ScopeContextTargetPicker.tsx",
    ]) {
      expect(existsSync(join(process.cwd(), file))).toBe(false);
    }
  });
});
