/**
 * @jest-environment jsdom
 */
// Rooms join after late idle. The settings catch-up is NOT asked here (first-paint contract V28):
// the settings screen asks it on mount (UniversalSettingsContext).
import type React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";

let mockSettled = false;
let mockMoved = false;
const catchUp = jest.fn(async () => mockMoved);
const invalidate = jest.fn();

jest.mock("react-redux", () => ({ useSelector: () => "u1" }));
jest.mock("@/lib/redux/selectors/userSelectors", () => ({ selectUserId: () => null }));
jest.mock("@/lib/boot/engagedLate", () => ({ useEngagedLateReady: () => mockSettled }));
jest.mock("@ai-matrx/data/realtime/react", () => ({ useChannel: jest.fn() }));
jest.mock("@/lib/knobs/featureKnobs", () => ({ invalidateFeatureKnobs: () => invalidate() }));
jest.mock("@/lib/scoped-config/effectiveKnobs", () => ({ catchUpKnobsSinceBoot: () => catchUp() }));
jest.mock("@/components/errors/refresh-directive", () => ({ notifyRefreshRequired: jest.fn() }));
jest.mock("@/lib/client-directives/serverBusChannel", () => ({ serverBusChannelSpec: () => ({}) }));
jest.mock("@/lib/client-directives/directiveRegistry", () => ({
  dispatchDirective: jest.fn(),
  registerDirectiveHandler: () => () => {},
}));

import { PlatformDirectiveSubscriber } from "./PlatformDirectiveSubscriber";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function mount() {
  const root = createRoot(document.createElement("div"));
  await act(async () => {
    root.render((<PlatformDirectiveSubscriber />) as React.ReactElement);
  });
  await act(async () => {});
  act(() => root.unmount());
}

beforeEach(() => {
  catchUp.mockClear();
  invalidate.mockClear();
  mockMoved = false;
});

it("asks nothing before the page settles", async () => {
  mockSettled = false;
  await mount();
  expect(catchUp).not.toHaveBeenCalled();
});

it("joining the rooms asks no settings question: the catch-up lives on the settings screen", async () => {
  mockSettled = true;
  mockMoved = true;
  await mount();
  expect(catchUp).not.toHaveBeenCalled();
  expect(invalidate).not.toHaveBeenCalled();
});
