/**
 * @jest-environment jsdom
 */
// Rooms join after late idle; on join the subscriber catches up on what it missed, and drops the
// feature-knob cache only when the boot versions moved. Never before the page settles.
import type React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";

let mockSettled = false;
let mockMoved = false;
const catchUp = jest.fn(async () => mockMoved);
const invalidate = jest.fn();

jest.mock("react-redux", () => ({ useSelector: () => "u1" }));
jest.mock("@/lib/redux/selectors/userSelectors", () => ({ selectUserId: () => null }));
jest.mock("@/lib/boot/lateIdle", () => ({ useLateIdleReady: () => mockSettled }));
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

it("catches up on join and drops the knob cache only when something moved", async () => {
  mockSettled = true;
  mockMoved = false;
  await mount();
  expect(catchUp).toHaveBeenCalledTimes(1);
  expect(invalidate).not.toHaveBeenCalled();

  mockMoved = true;
  await mount();
  expect(invalidate).toHaveBeenCalledTimes(1);
});
