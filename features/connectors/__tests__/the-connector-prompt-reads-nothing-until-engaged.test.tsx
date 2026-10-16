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
// The scope tree (a ~1 s shared read) starts on the first `state.scopesTree` read: counted here.
const mockSelectOrganizationIds = jest.fn(() => []);
jest.mock("@/features/scopes/redux/selectors/tree", () => ({
  selectOrganizationIds: () => mockSelectOrganizationIds(),
}));
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

let mockLateIdle = false;
jest.mock("@/lib/boot/lateIdle", () => ({ useLateIdleReady: () => mockLateIdle }));

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
  expect(mockSelectOrganizationIds).not.toHaveBeenCalled();
  expect(container.querySelector("[data-testid=connect-google-card]")).toBeNull();

  await act(async () => {
    window.dispatchEvent(new Event("pointermove"));
  });
  await settle();
  expect(listInventory).toHaveBeenCalledTimes(1);
  expect(listCapabilities).toHaveBeenCalledTimes(1);
  // Only personal connections came back: the person's organizations (the scope tree) are never read.
  expect(mockSelectOrganizationIds).not.toHaveBeenCalled();
  expect(container.querySelector("[data-testid=connect-google-card]")).not.toBeNull();

  // A second engagement is a no-op: the reads already happened.
  await act(async () => {
    window.dispatchEvent(new Event("keydown"));
  });
  await settle();
  expect(listInventory).toHaveBeenCalledTimes(1);
  await act(async () => root.unmount());
});

it("a page nobody touches still settles: late idle opens the one read and the card shows, no engagement needed", async () => {
  listInventory.mockClear();
  listCapabilities.mockClear();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const tree = (
    <QueryClientProvider client={new QueryClient()}>
      <ConnectorPromptHost />
    </QueryClientProvider>
  );
  mockLateIdle = false;
  await act(async () => root.render(tree));
  await settle();
  // Before settling: nothing read, nothing drawn (not even a placeholder).
  expect(listInventory).not.toHaveBeenCalled();
  expect(container.innerHTML).toBe("");

  mockLateIdle = true;
  await act(async () => root.render(<QueryClientProvider client={new QueryClient()}><ConnectorPromptHost key="settled" /></QueryClientProvider>));
  await settle();
  expect(listInventory).toHaveBeenCalledTimes(1);
  expect(container.querySelector("[data-testid=connect-google-card]")).not.toBeNull();
  await act(async () => root.unmount());
});

it("reads the person's organizations (the scope tree) only once an organization-owned connection came back", async () => {
  mockSelectOrganizationIds.mockClear();
  listInventory.mockImplementationOnce(async () => ({
    connections: [{ id: "c1", owner_type: "organization", owner_user_id: null, organization_id: "o1", provider: "google", scopes: [], status: "active", metadata: {}, capability_health: {} }],
    resources: [],
  }) as never);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mockLateIdle = false;
  await act(async () => root.render(<QueryClientProvider client={new QueryClient()}><ConnectorPromptHost /></QueryClientProvider>));
  await settle();
  expect(mockSelectOrganizationIds).not.toHaveBeenCalled();
  await act(async () => {
    window.dispatchEvent(new Event("pointerdown"));
  });
  await settle();
  expect(mockSelectOrganizationIds).toHaveBeenCalled();
  await act(async () => root.unmount());
});
