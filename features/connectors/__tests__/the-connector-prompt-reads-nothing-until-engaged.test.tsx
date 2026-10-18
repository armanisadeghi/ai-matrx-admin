/**
 * Owner ruling 2026-10-17: "There is no need to read google at all! Not until someone actually
 * engages it." The new-chat "Connect Google" card makes ZERO reads (connections, resources,
 * capability catalog, organizations, scope tree) at first paint, on late idle, and on engagement
 * with the PAGE. It decides whether to offer itself from this device's hint; engaging THE CARD
 * opens one batched read. Organizations, when a connection is organization-owned, are asked BY ID —
 * never the scope tree.
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
// The scope tree (a ~1 s shared read, 4 requests) starts on the first `state.scopesTree` read: counted here.
const mockSelectOrganizationIds = jest.fn(() => []);
jest.mock("@/features/scopes/redux/selectors/tree", () => ({
  selectOrganizationIds: () => mockSelectOrganizationIds(),
}));
// Membership by id: counted, answered "o1 is hers".
const mockLiveOrganizationIdsAmong = jest.fn(async (ids: readonly string[]) => ids.filter((id) => id === "o1"));
jest.mock("@/features/organizations/organizationsIAmIn", () => ({
  liveOrganizationIdsAmong: (ids: readonly string[]) => mockLiveOrganizationIdsAmong(ids),
}));
jest.mock("@/features/overlays/definitions/connectorConsentDialog.overlay", () => ({
  useOpenConnectorConsentDialog: () => mockOpenConsent,
}));
// The adapter's other imports (consent runner) are not under test.
jest.mock("@/features/connectors/google-adapter", () => {
  const actual = jest.requireActual<typeof import("@/features/connectors/google-adapter")>(
    "@/features/connectors/google-adapter",
  );
  return actual;
});
const mockOpenConsent = jest.fn();
jest.mock("@/features/connectors/ConnectorPromptCard", () => ({
  ConnectorPromptCard: ({ connected, blocked, onConnect }: { connected: boolean; blocked?: boolean; onConnect: () => void }) =>
    connected || blocked ? null : (
      <div data-testid="connect-google-card">
        <button type="button" onClick={onConnect}>Connect Google</button>
      </div>
    ),
}));

let mockLateIdle = false;
jest.mock("@/lib/boot/lateIdle", () => ({ useLateIdleReady: () => mockLateIdle }));
// The shell's ONE lazy read (`platform.shell_counts`) — shared with the header, so the card reading
// its answer is no extra request. `undefined` = not answered yet.
let mockShellGoogleConnected: boolean | null | undefined;
const mockUseShellCounts = jest.fn(() => ({
  data: mockShellGoogleConnected === undefined ? undefined : { googleConnected: mockShellGoogleConnected },
}));
jest.mock("@/lib/boot/shellCounts", () => ({ useShellCounts: () => mockUseShellCounts() }));

import { ConnectorPromptHost } from "@/features/connectors/ConnectorPromptHost";
import { engageForTest, resetFirstEngagement } from "@/lib/boot/firstEngagement";
import { readConnectorHint, rememberConnectorHint } from "@/features/connectors/connectedHint";
import { GOOGLE_CONNECTOR_PROVIDER } from "@/features/connectors/provider-config";

const USER = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  resetFirstEngagement();
  window.localStorage.clear();
  listInventory.mockClear();
  listCapabilities.mockClear();
  mockSelectOrganizationIds.mockClear();
  mockLiveOrganizationIdsAmong.mockClear();
  mockOpenConsent.mockClear();
  mockLateIdle = false;
  mockShellGoogleConnected = undefined;
});

const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 20)); });

const KNOWN_NOT_CONNECTED = { connected: false, blocked: false };

/** `hint` = what this device last learned; `null` = nothing learned yet (no card may show). */
async function mount(hint: { connected: boolean; blocked: boolean } | null = KNOWN_NOT_CONNECTED) {
  if (hint) rememberConnectorHint(GOOGLE_CONNECTOR_PROVIDER.id, USER, hint);
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
  return { container, root };
}

function expectNoReads() {
  expect(listInventory).not.toHaveBeenCalled();
  expect(listCapabilities).not.toHaveBeenCalled();
  expect(mockSelectOrganizationIds).not.toHaveBeenCalled();
  expect(mockLiveOrganizationIdsAmong).not.toHaveBeenCalled();
}

it("first paint, late idle and engaging the PAGE read nothing; the offer shows from the device's hint", async () => {
  mockLateIdle = true;
  const { container, root } = await mount();
  expectNoReads();
  expect(container.querySelector("[data-testid=connect-google-card]")).not.toBeNull();

  await act(async () => engageForTest());
  await settle();
  expectNoReads();
  await act(async () => root.unmount());
});

it("engaging THE CARD (focus inside it) opens ONE batched read; a second touch reads nothing more", async () => {
  const { container, root } = await mount();
  const button = container.querySelector("button")!;
  await act(async () => button.focus());
  await settle();
  expect(listInventory).toHaveBeenCalledTimes(1);
  expect(listCapabilities).toHaveBeenCalledTimes(1);
  expect(container.querySelector("[data-testid=connect-google-card]")).not.toBeNull();
  // The read leaves the device's hint behind.
  expect(readConnectorHint(GOOGLE_CONNECTOR_PROVIDER.id, USER)).toEqual({ connected: false, blocked: false });

  button.blur();
  await act(async () => button.focus());
  await settle();
  expect(listInventory).toHaveBeenCalledTimes(1);
  await act(async () => root.unmount());
});

it("the Connect press opens the consent dialog at once (no waiting for a read)", async () => {
  const { container, root } = await mount();
  await act(async () => container.querySelector("button")!.click());
  expect(mockOpenConsent).toHaveBeenCalledTimes(1);
  await act(async () => root.unmount());
});

it("a device that already learned she is connected draws no card and reads nothing", async () => {
  const { container, root } = await mount({ connected: true, blocked: false });
  expectNoReads();
  expect(container.querySelector("[data-testid=connect-google-card]")).toBeNull();
  await act(async () => root.unmount());
});

it("NEVER OFFERS ON A GUESS: nothing learned about Google yet = no card and no reads", async () => {
  window.localStorage.clear();
  const { container, root } = await mount(null);
  expectNoReads();
  expect(container.querySelector("[data-testid=connect-google-card]")).toBeNull();
  await act(async () => engageForTest());
  await settle();
  expectNoReads();
  expect(container.querySelector("[data-testid=connect-google-card]")).toBeNull();
  await act(async () => root.unmount());
});

it("an organization-owned connection asks membership by id for ITS organization — never the scope tree", async () => {
  listInventory.mockImplementationOnce(async () => ({
    connections: [{ id: "c1", owner_type: "organization", owner_user_id: null, organization_id: "o1", provider: "google", scopes: [], status: "active", metadata: {}, capability_health: {} }],
    resources: [],
  }) as never);
  const { container, root } = await mount();
  expect(mockLiveOrganizationIdsAmong).not.toHaveBeenCalled();
  await act(async () => container.querySelector("button")!.focus());
  await settle();
  expect(mockLiveOrganizationIdsAmong).toHaveBeenCalledTimes(1);
  expect(mockLiveOrganizationIdsAmong).toHaveBeenCalledWith(["o1"]);
  expect(mockSelectOrganizationIds).not.toHaveBeenCalled();
  await act(async () => root.unmount());
});

it("ZERO LAYOUT SHIFT: the card sits in a fixed area; the in-flow anchor is zero-height", async () => {
  const { container, root } = await mount();
  const anchor = container.querySelector("[data-connector-prompt-anchor]");
  expect(anchor).not.toBeNull();
  expect(anchor!.className).toContain("h-0");
  const card = container.querySelector("[data-testid=connect-google-card]");
  expect(card!.closest(".fixed")).not.toBeNull();
  await act(async () => root.unmount());
});

it("A NEW DEVICE LEARNS FROM THE SHELL READ: nothing remembered + shell_counts says not connected = the card shows, zero extra reads", async () => {
  window.localStorage.clear();
  mockShellGoogleConnected = false;
  const { container, root } = await mount(null);
  expectNoReads();
  expect(container.querySelector("[data-testid=connect-google-card]")).not.toBeNull();
  // The answer is now this device's hint.
  expect(readConnectorHint(GOOGLE_CONNECTOR_PROVIDER.id, USER)).toEqual({ connected: false, blocked: false });
  await act(async () => root.unmount());
});

it("shell_counts says connected = no card, even over a stale \"not connected\" device hint", async () => {
  mockShellGoogleConnected = true;
  const { container, root } = await mount(KNOWN_NOT_CONNECTED);
  expectNoReads();
  expect(container.querySelector("[data-testid=connect-google-card]")).toBeNull();
  expect(readConnectorHint(GOOGLE_CONNECTOR_PROVIDER.id, USER)?.connected).toBe(true);
  await act(async () => root.unmount());
});

it("shell_counts could not say (null) = the device's hint decides; still no card on a guess", async () => {
  window.localStorage.clear();
  mockShellGoogleConnected = null;
  const { container, root } = await mount(null);
  expectNoReads();
  expect(container.querySelector("[data-testid=connect-google-card]")).toBeNull();
  await act(async () => root.unmount());
});
