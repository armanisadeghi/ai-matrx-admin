/**
 * @jest-environment jsdom
 */
/**
 * The bridge broadcast is for the CROSS-DEVICE case (extension on another machine,
 * "every open frontend tab answers" — CHANNELS.md §C). So every signed-in tab joins
 * once the page settles, with or without a local chrome.runtime; never before.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";

let mockSettled = false;
let mockUserId: string | null = "u1";
const mockJoin = jest.fn();

jest.mock("@/lib/boot/lateIdle", () => ({ useLateIdleReady: () => mockSettled }));
jest.mock("react-redux", () => ({ useSelector: () => mockUserId }));
jest.mock("@/lib/redux/hooks", () => ({ useAppDispatch: () => jest.fn() }));
jest.mock("@/lib/redux/selectors/userSelectors", () => ({ selectUserId: () => null }));
jest.mock("@/hooks/useExtensionBridgeChannel", () => ({
  useExtensionBridgeChannel: () => {
    mockJoin();
    return { onMessage: () => () => {}, reply: jest.fn(), isAuthenticated: true };
  },
}));
jest.mock("../openPanelHandler", () => ({ handleExtensionOpenPanel: jest.fn() }));

import type React from "react";
import { ExtensionBridgeSubscriber } from "../ExtensionBridgeSubscriber";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
function render(node: React.ReactNode) {
  const c = document.createElement("div");
  const root = createRoot(c);
  act(() => root.render(node));
  act(() => root.unmount());
}

describe("ExtensionBridgeSubscriber", () => {
  beforeEach(() => {
    mockJoin.mockClear();
    mockUserId = "u1";
    delete (globalThis as { chrome?: unknown }).chrome;
  });

  it("does not join at first paint", () => {
    mockSettled = false;
    render(<ExtensionBridgeSubscriber />);
    expect(mockJoin).not.toHaveBeenCalled();
  });

  it("joins after settle with NO local chrome.runtime (extension on another device)", () => {
    mockSettled = true;
    render(<ExtensionBridgeSubscriber />);
    expect(mockJoin).toHaveBeenCalled();
  });

  it("does not join when signed out", () => {
    mockSettled = true;
    mockUserId = null;
    render(<ExtensionBridgeSubscriber />);
    expect(mockJoin).not.toHaveBeenCalled();
  });
});
