import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { McpCatalogEntry } from "@ai-matrx/chat/agents/types/mcp.types";
import type { McpOAuthOutcome } from "@ai-matrx/chat/agents/services/mcp-oauth/popup";

const mockDispatch = jest.fn();
const mockPopup = jest.fn();
const mockPush = jest.fn();
const mockOpenDirectory = jest.fn();
jest.mock("@/features/overlays/definitions/liveIntegrationsWindow.overlay", () => ({
  useOpenLiveIntegrationsWindow: () => mockOpenDirectory,
}));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("@/lib/redux/hooks", () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: () => "5dc930e9-bd65-44a1-8369-af773f6e1a5b",
}));
jest.mock("@ai-matrx/chat/agents/services/mcp-oauth/popup", () => ({
  startMcpOAuthPopup: (...args: unknown[]) => mockPopup(...args),
}));
jest.mock("@ai-matrx/chat/agents/redux/mcp/mcp.slice", () => ({
  fetchCatalog: () => ({ type: "catalog" }),
  fetchAvailability: (payload: unknown) => ({ type: "availability", payload }),
  connectServer: (payload: unknown) => ({ type: "connect", payload }),
}));
jest.mock("@/features/github-integration/service", () => ({
  githubConnectUrl: jest.fn(),
}));
jest.mock("@/features/organizations/awaitWorkspace", () => ({
  awaitEffectiveOrganizationId: jest.fn(),
}));
jest.mock("@/lib/toast", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  recordToast: { success: jest.fn(), error: jest.fn() },
}));
import { useConnectMcpServer } from "./useConnectMcpServer";
import { awaitEffectiveOrganizationId } from "@/features/organizations/awaitWorkspace";
import { githubConnectUrl } from "@/features/github-integration/service";
import {
  resetConnectIntents,
  setBaseline,
  takeRememberedConnectIntent,
} from "@ai-matrx/chat/agents/connectors/connect-intent-store";

const notion: McpCatalogEntry = {
  serverId: "664215cc-038b-42f0-8d6c-dbf7f033835a",
  slug: "notion",
  name: "Notion",
  vendor: "Notion Labs",
  description: null,
  category: "productivity",
  iconUrl: null,
  color: null,
  websiteUrl: "https://www.notion.so",
  docsUrl: null,
  endpointUrl: "https://mcp.notion.com/mcp",
  transport: "http",
  authStrategy: "oauth_discovery",
  isOfficial: true,
  isFeatured: true,
  hasRemote: true,
  hasLocal: false,
  supportsMcpApps: false,
  serverStatus: "active",
  connectionReady: true,
  connectionId: null,
  connectionStatus: null,
  connectedAt: null,
  lastUsedAt: null,
  transportUsed: null,
  tokenExpiresAt: null,
  products: [],
};

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("MCP connection intent", () => {
  let root: Root;
  let container: HTMLDivElement;
  let controller: ReturnType<typeof useConnectMcpServer>;
  let finish: (result: McpOAuthOutcome) => void;
  function Harness() {
    controller = useConnectMcpServer();
    return <output>{controller.connectingSlug ?? "idle"}</output>;
  }
  beforeEach(async () => {
    jest.clearAllMocks();
    mockPopup.mockImplementation(
      () =>
        new Promise<McpOAuthOutcome>((resolve) => {
          finish = resolve;
        }),
    );
    container = document.createElement("div");
    root = createRoot(container);
    await act(async () => root.render(<Harness />));
  });
  afterEach(async () => {
    await act(async () => root.unmount());
  });

  it("opens one authorization for two presses before React rerenders", async () => {
    let first!: Promise<boolean>;
    let second!: Promise<boolean>;
    await act(async () => {
      first = controller.connect(notion);
      second = controller.connect(notion);
    });
    expect(mockPopup).toHaveBeenCalledTimes(1);
    expect(container.textContent).toBe("notion");
    await act(async () => {
      finish({ ok: true, serverId: notion.serverId });
      await Promise.all([first, second]);
    });
    expect(container.textContent).toBe("idle");
    expect(mockDispatch.mock.calls.map((call) => call[0].type)).toEqual([
      "catalog",
      "availability",
    ]);
  });

  it("clears pending on cancellation without claiming a new connection", async () => {
    let pending!: Promise<boolean>;
    await act(async () => {
      pending = controller.connect(notion);
    });
    expect(container.textContent).toBe("notion");
    await act(async () => {
      finish({ ok: false, error: "Connection canceled", cancelled: true });
      await pending;
    });
    expect(container.textContent).toBe("idle");
    expect(mockDispatch).not.toHaveBeenCalled();
    mockPopup.mockResolvedValue({
      ok: false,
      cancelled: true,
      error: "Canceled",
    });
    await act(async () => {
      await controller.connect(notion);
    });
    expect(mockPopup).toHaveBeenCalledTimes(2);
  });

  it("requires Supabase configuration and preserves the configured read-only endpoint", async () => {
    const supabase = { ...notion, slug: "supabase", name: "Supabase" };
    await act(async () => {
      await controller.connect(supabase);
    });
    expect(mockPush).toHaveBeenCalledWith(
      "/user-settings/integrations?provider=supabase",
    );
    expect(mockPopup).not.toHaveBeenCalled();
    const endpoint =
      "https://mcp.supabase.com/mcp?project_ref=abcdefghijklmnopqrst&read_only=true&features=docs%2Cdatabase%2Cdebugging";
    mockPopup.mockResolvedValue({
      ok: false,
      cancelled: true,
      error: "Canceled",
    });
    await act(async () => {
      await controller.connect(supabase, endpoint);
    });
    expect(mockPopup).toHaveBeenCalledWith(
      supabase.serverId,
      undefined,
      endpoint,
    );
    expect(container.textContent).toBe("idle");
  });

  it("recovers from an authorization error so the next press can retry", async () => {
    mockPopup.mockRejectedValueOnce(new Error("Network unavailable"));
    await act(async () => {
      await controller.connect(notion);
    });
    expect(container.textContent).toBe("idle");
    expect(mockDispatch).not.toHaveBeenCalled();
    mockPopup.mockResolvedValue({
      ok: false,
      cancelled: true,
      error: "Canceled",
    });
    await act(async () => {
      await controller.connect(notion);
    });
    expect(mockPopup).toHaveBeenCalledTimes(2);
  });
});

describe("connecting FROM A CHAT (Arman, 2026-10-20)", () => {
  let root: Root;
  let container: HTMLDivElement;
  let controller: ReturnType<typeof useConnectMcpServer>;
  function Harness() {
    controller = useConnectMcpServer();
    return null;
  }
  beforeEach(async () => {
    jest.clearAllMocks();
    resetConnectIntents();
    container = document.createElement("div");
    root = createRoot(container);
    await act(async () => root.render(<Harness />));
  });
  afterEach(async () => {
    await act(async () => root.unmount());
  });

  it("answers true only when the connection now exists", async () => {
    mockPopup.mockResolvedValueOnce({ ok: true, serverId: notion.serverId });
    await act(async () => {
      expect(await controller.connect(notion, undefined, { conversationId: "chat" })).toBe(true);
    });
    mockPopup.mockResolvedValueOnce({ ok: false, cancelled: true, error: "Canceled" });
    await act(async () => {
      expect(await controller.connect(notion, undefined, { conversationId: "chat" })).toBe(false);
    });
    mockPopup.mockResolvedValueOnce({ ok: false, error: "Denied" });
    await act(async () => {
      expect(await controller.connect(notion, undefined, { conversationId: "chat" })).toBe(false);
    });
  });

  it("a server that can only be set up in the directory opens the directory WINDOW on it, never a page", async () => {
    const supabase = { ...notion, slug: "supabase", name: "Supabase" };
    await act(async () => {
      expect(await controller.connect(supabase, undefined, { conversationId: "chat" })).toBe(false);
    });
    expect(mockOpenDirectory).toHaveBeenCalledWith({ conversationId: "chat", provider: "supabase" });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("GitHub hands the chat's baseline to the page that comes back before it leaves", async () => {
    const github = { ...notion, slug: "github", name: "GitHub" };
    (awaitEffectiveOrganizationId as jest.Mock).mockResolvedValue({ status: "ready", organizationId: "org" });
    setBaseline("chat", { keys: new Set(["mcp:linear"]), sources: new Set(["mcp"]) });
    // A hash change is the one navigation jsdom performs, so the redirect itself is real here.
    window.history.pushState({}, "", "/chat/new");
    (githubConnectUrl as jest.Mock).mockReturnValue("#github-install");
    await act(async () => {
      expect(await controller.connect(github, undefined, { conversationId: "chat" })).toBe(false);
    });
    expect(window.location.hash).toBe("#github-install");
    // The page that comes back (a fresh conversation id on the same path) finds the baseline.
    expect(takeRememberedConnectIntent("minted-after-redirect")?.keys.has("mcp:linear")).toBe(true);
  });
});
