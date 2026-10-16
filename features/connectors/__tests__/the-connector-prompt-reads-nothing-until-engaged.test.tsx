/**
 * First-paint contract V6: the "Connect Google" card on a new chat must not read
 * `integration_connections` / resources / the capability catalog at first paint. It reads once,
 * together, when the person first engages the page, and shows (or stays away) from that answer.
 * Asserted on the REAL host and the REAL query hooks; only the network service and the card's
 * chrome are stand-ins.
 */
import * as React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const listInventory = jest.fn(async () => ({ connections: [], resources: [] }));
const listCapabilities = jest.fn(async () => []);

jest.mock("@/features/marketing/google/service", () => ({
  listGoogleConnectionInventory: () => listInventory(),
  listGoogleCapabilities: () => listCapabilities(),
  filterGoogleConnectionInventoryForUser: (inventory: unknown) => inventory,
  connectGoogle: jest.fn(),
  disconnectGoogle: jest.fn(),
  getYouTubeChannelPreview: jest.fn(),
  getGoogleAdsCustomers: jest.fn(),
  getGoogleAdsReport: jest.fn(),
  getGoogleCalendarAgenda: jest.fn(),
  getGoogleTasksPreview: jest.fn(),
  getTagManagerInventory: jest.fn(),
  getYouTubeAnalyticsPreview: jest.fn(),
}));
jest.mock("@/lib/redux/hooks", () => ({
  useAppSelector: (selector: unknown) =>
    typeof selector === "function" ? (selector as (s: unknown) => unknown)({}) : undefined,
  useAppDispatch: () => jest.fn(),
}));
jest.mock("@/lib/redux/selectors/userSelectors", () => ({
  selectAuthReady: () => true,
  selectIsAuthenticated: () => true,
  selectUserId: () => "11111111-1111-4111-8111-111111111111",
}));
jest.mock("@/features/scopes/redux/selectors/tree", () => ({ selectOrganizationIds: () => [] }));
jest.mock("@/features/overlays/openers/connectorConsentDialog", () => ({
  useOpenConnectorConsentDialog: () => jest.fn(),
}));
// The adapter's other imports (consent runner) are not under test.
jest.mock("@/features/connectors/google-adapter", () => {
  const actual = jest.requireActual<typeof import("@/features/connectors/google-adapter")>(
    "@/features/connectors/google-adapter",
  );
  return actual;
});
jest.mock("@/features/connectors/ConnectorPromptCard", () => ({
  ConnectorPromptCard: ({ loading, connected }: { loading?: boolean; connected: boolean }) =>
    loading || connected ? null : <div data-testid="connect-google-card">Connect Google</div>,
}));

import { ConnectorPromptHost } from "@/features/connectors/ConnectorPromptHost";

const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 20)); });

it("reads nothing and draws nothing at first paint; one engagement reads once and shows the card", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={new QueryClient()}>
        <ConnectorPromptHost />
      </QueryClientProvider>,
    );
  });
  await settle();
  expect(listInventory).not.toHaveBeenCalled();
  expect(listCapabilities).not.toHaveBeenCalled();
  expect(container.querySelector("[data-testid=connect-google-card]")).toBeNull();

  await act(async () => {
    window.dispatchEvent(new Event("pointermove"));
  });
  await settle();
  expect(listInventory).toHaveBeenCalledTimes(1);
  expect(listCapabilities).toHaveBeenCalledTimes(1);
  expect(container.querySelector("[data-testid=connect-google-card]")).not.toBeNull();

  // A second engagement is a no-op: the reads already happened.
  await act(async () => {
    window.dispatchEvent(new Event("keydown"));
  });
  await settle();
  expect(listInventory).toHaveBeenCalledTimes(1);
  await act(async () => root.unmount());
});
