/**
 * @jest-environment jsdom
 *
 * The AI test mode switch asks the server for its status only for an admin, or
 * for a tab someone deliberately switched off "real". The request used to run on
 * every route for every signed-in person (2026-10-15).
 */
import { act } from "react";
import { createRoot } from "react-dom/client";

let mockIsAdmin = false;
let mockMode = "real";
const mockFetch = jest.fn();
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: (sel: () => unknown) => sel() }));
jest.mock("@/lib/redux/selectors/userSelectors", () => ({
  selectUserId: () => "6b1f2c1e-4d0a-4c5e-9a57-2f3d8e9b1c44",
  selectIsAdmin: () => mockIsAdmin,
}));
jest.mock("@/lib/api/ai-test-mode", () => ({
  ...jest.requireActual("@/lib/api/ai-test-mode"),
  readAiTestMode: () => mockMode,
  subscribeAiTestMode: () => () => undefined,
}));
jest.mock("../service", () => ({
  fetchAiTestModeStatus: (...args: unknown[]) => mockFetch(...args),
}));

import { AiTestModeSheetRow } from "../AiTestModeDock";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function mount() {
  const host = document.body.appendChild(document.createElement("div"));
  const root = createRoot(host);
  await act(async () => root.render(<AiTestModeSheetRow />));
  act(() => root.unmount());
}

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({ available: false, effective: "real", reason: "x" });
});

it("never asks for a person who is not an admin and has not switched modes", async () => {
  mockIsAdmin = false;
  mockMode = "real";
  await mount();
  expect(mockFetch).not.toHaveBeenCalled();
});

it("asks for an admin", async () => {
  mockIsAdmin = true;
  mockMode = "real";
  await mount();
  expect(mockFetch).toHaveBeenCalledTimes(1);
});
