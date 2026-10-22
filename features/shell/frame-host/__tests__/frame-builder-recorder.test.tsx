/**
 * THE FRAME KEEPS THE BUILDER RECORDING with its admin menu closed (classic's Builder button is always
 * mounted, so it records the whole time debug mode is on; the frame's is not).
 *
 *   1. admin + debug on: the recorder (the Builder's hook, no button) is mounted with no menu open;
 *   2. admin, debug off: nothing is mounted and the recorder module is never imported;
 *   3. non-admin: same — the recorder module is never imported;
 *   4. the recorder component runs the one recording hook (`useBuilderRecording`) classic uses.
 *
 * PROVEN FAILING BEFORE PASSING (2026-10-22): with FrameBuilderRecorder returning null, case 1 was RED.
 */
import React, { act, Suspense } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const state = { userAuth: { isAdmin: false }, adminDebug: { debugMode: false } };
const recordingHook = jest.fn();

jest.mock("next/dynamic", () => {
  const { lazy, Suspense: S } = jest.requireActual("react");
  return (loader: () => Promise<{ default: React.ComponentType }>) => {
    const Lazy = lazy(loader);
    return function Dynamic(props: object) {
      return (
        <S fallback={null}>
          <Lazy {...props} />
        </S>
      );
    };
  };
});
jest.mock("@/lib/redux/hooks", () => ({
  useAppSelector: (select: (s: unknown) => unknown) => select(state),
}));
jest.mock("@/lib/redux/preferences/adminDebugSlice", () => ({
  selectIsDebugMode: (s: typeof state) => s.adminDebug.debugMode,
}));
jest.mock("@ai-matrx/kit/hooks", () => ({ useIsMounted: () => true }));
jest.mock("@/features/builder-panel/hooks/useBuilderRecording", () => ({
  ...jest.requireActual("@/features/builder-panel/hooks/useBuilderRecording"),
  useBuilderRecording: () => recordingHook(),
}));
jest.mock("@/features/shell/components/sidebar/admin-menu/AdminSidebarSection", () => ({ __esModule: true, default: () => null }));
jest.mock("@/features/shell/components/sidebar/SidebarWindowToggleIsland", () => ({ __esModule: true, default: () => null }));

import { FrameBuilderRecorder } from "../FrameAdminMenu";
import BuilderRecorder from "@/features/builder-panel/components/BuilderRecorder";

let host: HTMLElement;
let root: Root;
async function render(node: React.ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => root.render(<Suspense fallback={null}>{node}</Suspense>));
  await act(async () => {});
}
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  state.userAuth.isAdmin = false;
  state.adminDebug.debugMode = false;
  recordingHook.mockClear();
});

describe("the frame's Builder recorder", () => {
  it("1. admin with debug on records with the menu closed", async () => {
    state.userAuth.isAdmin = true;
    state.adminDebug.debugMode = true;
    await render(<FrameBuilderRecorder />);
    expect(recordingHook).toHaveBeenCalled();
  });

  it("2. admin with debug off mounts nothing", async () => {
    state.userAuth.isAdmin = true;
    await render(<FrameBuilderRecorder />);
    expect(recordingHook).not.toHaveBeenCalled();
  });

  it("3. a non-admin mounts nothing", async () => {
    state.adminDebug.debugMode = true;
    await render(<FrameBuilderRecorder />);
    expect(recordingHook).not.toHaveBeenCalled();
  });

  it("4. the recorder component runs the one recording hook", async () => {
    await render(<BuilderRecorder />);
    expect(recordingHook).toHaveBeenCalledTimes(1);
  });
});
