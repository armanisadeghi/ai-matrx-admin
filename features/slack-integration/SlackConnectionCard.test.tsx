import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const mockConfirm = jest.fn();
const mockUseSlackConnection = jest.fn();

jest.mock("@/components/dialogs/confirm/ConfirmDialogHost", () => ({
  confirm: (...args: unknown[]) => mockConfirm(...args),
}));

jest.mock("./useSlackConnection", () => ({
  useSlackConnection: () => mockUseSlackConnection(),
}));

import { SlackConnectionCard } from "./SlackConnectionCard";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function hook(overrides: Record<string, unknown> = {}) {
  return {
    connection: null,
    loading: false,
    busy: false,
    error: null,
    checked: null,
    organizationId: "org-1",
    reload: jest.fn(),
    check: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn().mockResolvedValue(true),
    signIn: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

const CONNECTED = {
  connected: true,
  connection_id: "c1",
  team_name: "Acme Test",
  team_url: "https://acme-test.slack.com/",
  user_name: "ana",
  scopes: ["channels:history", "channels:read", "chat:write"],
  status: "connected",
  oauth_available: true,
};

describe("SlackConnectionCard", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockConfirm.mockReset();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const button = (label: string) =>
    Array.from(container.querySelectorAll("button")).find((b) => b.textContent?.includes(label));

  it("offers Connect Slack and starts the sign-in from the current page", async () => {
    const state = hook({ connection: { ...CONNECTED, connected: false, status: "disconnected" } });
    mockUseSlackConnection.mockReturnValue(state);
    await act(async () => root.render(<SlackConnectionCard />));
    expect(container.textContent).toContain("Read channels and post as you");
    await act(async () => button("Connect Slack")!.click());
    expect(state.signIn).toHaveBeenCalledTimes(1);
  });

  it("disables Connect Slack when the server has no Slack app", async () => {
    mockUseSlackConnection.mockReturnValue(
      hook({ connection: { ...CONNECTED, connected: false, status: "disconnected", oauth_available: false } }),
    );
    await act(async () => root.render(<SlackConnectionCard />));
    expect(button("Connect Slack")!.disabled).toBe(true);
  });

  it("shows the workspace and user, tests with auth.test, and disconnects only after confirming", async () => {
    const state = hook({ connection: CONNECTED });
    mockUseSlackConnection.mockReturnValue(state);
    await act(async () => root.render(<SlackConnectionCard />));
    expect(container.textContent).toContain("Acme Test · @ana");
    expect(button("Connect Slack")).toBeUndefined();
    await act(async () => button("Test")!.click());
    expect(state.check).toHaveBeenCalledTimes(1);

    mockConfirm.mockResolvedValueOnce(false);
    await act(async () => button("Disconnect")!.click());
    expect(state.disconnect).not.toHaveBeenCalled();
    mockConfirm.mockResolvedValueOnce(true);
    await act(async () => button("Disconnect")!.click());
    expect(state.disconnect).toHaveBeenCalledTimes(1);
  });

  it("says the server's sentence when something fails", async () => {
    mockUseSlackConnection.mockReturnValue(hook({ error: "Slack did not accept the connection (token_revoked)." }));
    await act(async () => root.render(<SlackConnectionCard />));
    expect(container.textContent).toContain("token_revoked");
  });
});
