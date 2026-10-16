/**
 * First-paint contract V2. The call listener (MeetHostCore: `meet_pending_call_invites` + the
 * call-invite channel) must not attach at first paint or at the first idle, but MUST attach, or a
 * call never rings: in the late tier, at once on a /meet route, and at once when a DM thread is
 * opened (its call chips need the runtime).
 */
import * as React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let lateIdle = false;
let pathname = "/chat/new";
const coreMounts = jest.fn();

jest.mock("@/lib/boot/lateIdle", () => ({ useLateIdleReady: () => lateIdle }));
jest.mock("next/navigation", () => ({ usePathname: () => pathname }));
jest.mock("next/dynamic", () => () => function Core() {
  coreMounts();
  return null;
});
jest.mock("@ai-matrx/meet/host-slot", () => ({ MeetHostContext: React.createContext(null) }));
jest.mock("@/lib/redux/hooks", () => ({
  useAppSelector: (selector: (s: unknown) => unknown) => selector({}),
  useAppStore: () => ({ getState: () => ({}) }),
}));
jest.mock("@/lib/redux/selectors/userSelectors", () => ({
  selectActiveUserAvatarUrl: () => null,
  selectDisplayName: () => "Ana",
}));
jest.mock("@/features/scopes/redux/selectors/active-context", () => ({
  selectActiveOrganizationId: () => "44444444-4444-4444-8444-444444444444",
}));
jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
jest.mock("@/features/meet/lib/meetBaseUrl", () => ({ meetBaseUrl: () => "" }));
jest.mock("@/lib/toast", () => ({ toast: { error: jest.fn() } }));
jest.mock("@/lib/toast/diagnostic-copy", () => ({ diagnosticToastCopy: () => ({ title: "", description: "" }) }));

import { MeetHost } from "../MeetHost";
import { demandMeetHost, resetMeetHostDemandForTests } from "../meetHostDemand";

async function render() {
  const container = document.createElement("div");
  const root = createRoot(container);
  await act(async () => {
    root.render(<MeetHost>{null}</MeetHost>);
  });
  return root;
}

beforeEach(() => {
  coreMounts.mockClear();
  lateIdle = false;
  pathname = "/chat/new";
  resetMeetHostDemandForTests();
});

it("does not attach the call listener before the late tier", async () => {
  const root = await render();
  expect(coreMounts).not.toHaveBeenCalled();
  await act(async () => root.unmount());
});

it("attaches in the late tier, so an incoming call can ring", async () => {
  lateIdle = true;
  const root = await render();
  expect(coreMounts).toHaveBeenCalled();
  await act(async () => root.unmount());
});

it("attaches at once on a /meet route", async () => {
  pathname = "/meet/abc";
  const root = await render();
  expect(coreMounts).toHaveBeenCalled();
  await act(async () => root.unmount());
});

it("attaches at once when a DM thread asks for it", async () => {
  const root = await render();
  expect(coreMounts).not.toHaveBeenCalled();
  await act(async () => {
    demandMeetHost();
  });
  expect(coreMounts).toHaveBeenCalled();
  await act(async () => root.unmount());
});
