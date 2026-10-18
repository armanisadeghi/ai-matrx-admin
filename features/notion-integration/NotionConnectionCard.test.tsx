import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const mockConfirm = jest.fn();
const mockUseNotionConnection = jest.fn();

jest.mock("@/components/dialogs/confirm/ConfirmDialogHost", () => ({
  confirm: (...args: unknown[]) => mockConfirm(...args),
}));

jest.mock("./useNotionConnection", () => ({
  useNotionConnection: () => mockUseNotionConnection(),
}));

import { NotionConnectionCard } from "./NotionConnectionCard";

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

const WORKSPACES = [
  { connection_id: "c1", workspace_id: "w1", workspace_name: "Acme Test", user_name: "Ana", status: "connected" },
  { connection_id: "c2", workspace_id: "w2", workspace_name: "Side Co", user_name: "Ana B", status: "connected" },
];

describe("NotionConnectionCard", () => {
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

  const buttons = (label: string) =>
    Array.from(container.querySelectorAll("button")).filter((b) => b.textContent?.includes(label));

  it("offers Connect Notion and starts the sign-in from the current page", async () => {
    const state = hook({ connection: { connected: false, workspaces: [], oauth_available: true } });
    mockUseNotionConnection.mockReturnValue(state);
    await act(async () => root.render(<NotionConnectionCard />));
    expect(container.textContent).toContain("Brings formula values and text into Notion imports");
    await act(async () => buttons("Connect Notion")[0].click());
    expect(state.signIn).toHaveBeenCalledTimes(1);
  });

  it("disables the button with Not set up yet when the server has no Notion app", async () => {
    mockUseNotionConnection.mockReturnValue(
      hook({ connection: { connected: false, workspaces: [], oauth_available: false } }),
    );
    await act(async () => root.render(<NotionConnectionCard />));
    const button = buttons("Not set up yet")[0];
    expect(button.disabled).toBe(true);
  });

  it("lists each workspace, offers another, and disconnects one only after confirming", async () => {
    const state = hook({ connection: { connected: true, workspaces: WORKSPACES, oauth_available: true } });
    mockUseNotionConnection.mockReturnValue(state);
    await act(async () => root.render(<NotionConnectionCard />));
    expect(container.textContent).toContain("Acme Test · Ana");
    expect(container.textContent).toContain("Side Co · Ana B");
    expect(buttons("Connect Notion")).toHaveLength(0);
    expect(buttons("Connect another workspace")).toHaveLength(1);

    mockConfirm.mockResolvedValueOnce(false);
    await act(async () => buttons("Disconnect")[1].click());
    expect(state.disconnect).not.toHaveBeenCalled();
    mockConfirm.mockResolvedValueOnce(true);
    await act(async () => buttons("Disconnect")[1].click());
    expect(state.disconnect).toHaveBeenCalledWith("c2");
  });

  it("says the server's sentence when something fails", async () => {
    mockUseNotionConnection.mockReturnValue(hook({ error: "Notion did not accept the connection." }));
    await act(async () => root.render(<NotionConnectionCard />));
    expect(container.textContent).toContain("did not accept");
  });
});
