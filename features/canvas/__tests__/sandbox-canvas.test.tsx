/**
 * Guards for the Sandbox as a CANVAS CONTENT TYPE.
 *
 * The defect these pin (owner, 2026-09-13): the sandbox shipped as a bespoke
 * side panel that was permanently on screen and covered the top of the app.
 * The replacement is one more canvas content type beside `cloud_browser`,
 * documents and artifacts — opened on demand, never owning the region.
 *
 * Everything under test runs for real: the real `@ai-matrx/canvas` controller
 * and reducer (driven through the real `useOpenSandboxCanvas` hook, reaching
 * the canvas through the app's real chat `canvas` port), the real decision
 * function, the real `CanvasBody` switch, the real tool filter. It lives
 * app-side because it proves the chat package and the app's canvas together.
 *
 * Proven failing before passing:
 *   1. registered-type   → removed `case "sandbox"` from CanvasBody;
 *      the pane rendered "Unsupported content type: sandbox" → RED.
 *   2. hidden-by-default → made `offer` open without `quiet`; the canvas was
 *      open with nothing asked for → RED.
 *   3. opens-only-when-empty → dropped the `canvasHasOtherContent` guard in
 *      `decideSandboxCanvasAction`; the sandbox hijacked a document → RED.
 *   4. closing-hides      → hiding the canvas closed the tab instead; the pane
 *      was gone on reopen → RED.
 */

import React, { act, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import {
  canvasActions,
  createCanvasStore,
  selectCanvasActiveItem,
  type CanvasState,
  type CanvasStoreBinding,
} from "@ai-matrx/canvas";
import { CanvasProvider, useCanvas } from "@ai-matrx/canvas/react";
import type { ChatDb, ChatHost } from "@ai-matrx/chat/host";
import { ChatProvider } from "@ai-matrx/chat/host/react";
import {
  NON_PERSISTABLE_CANVAS_TYPES,
  isPersistableCanvasType,
  getDefaultTitle,
  type CanvasContent,
} from "@/features/canvas/canvasContent";
import { CanvasBody } from "@/features/canvas/core/CanvasBody";
import { useArtifactCanvas } from "@/features/canvas/host/useArtifactCanvas";
import { canvasItemSourceId } from "@/features/canvas/host/canvasSources";
import { appChatCanvasPort } from "@/features/canvas/host/chatCanvasPort";
import {
  buildSandboxCanvasContent,
  decideSandboxCanvasAction,
  sandboxCanvasSourceId,
  useOpenSandboxCanvas,
  type OpenSandboxCanvasOptions,
} from "@ai-matrx/chat/agents/components/chat/sandbox-insight/useOpenSandboxCanvas";
import { isSandboxTool } from "@ai-matrx/chat/agents/components/chat/sandbox-insight/sandbox-activity";
import {
  readSandboxCanvasMemory,
  writeSandboxCanvasMemory,
} from "@ai-matrx/chat/agents/components/chat/sandbox-insight/sandboxCanvasMemory";

// The two leaves that would open a pty / fetch a file tree. Their PRESENCE is
// what is asserted here, not their internals.
jest.mock("@/features/code/terminal/SimpleTerminal", () => ({
  SimpleTerminal: ({ sandboxId }: { sandboxId: string | null }) => (
    <div data-testid="simple-terminal">{sandboxId}</div>
  ),
}));
jest.mock("@ai-matrx/chat/agents/components/debug/SandboxFileViewer", () => ({
  SandboxFileViewer: ({ sandboxRowId }: { sandboxRowId: string }) => (
    <div data-testid="sandbox-file-viewer">{sandboxRowId}</div>
  ),
}));

Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
  configurable: true,
  value: true,
});

const CONVERSATION_ID = "11111111-1111-1111-1111-111111111111";
const SANDBOX_ROW_ID = "22222222-2222-2222-2222-222222222222";

const sandboxContent = buildSandboxCanvasContent({
  sandboxRowId: SANDBOX_ROW_ID,
  conversationId: CONVERSATION_ID,
  fallbackName: "dev box",
});

const documentContent: CanvasContent = {
  type: "udt_document",
  data: { documentId: "5d0c8d2e-3f1a-4b7e-9c61-2a8f0e4b7d13" },
  metadata: {
    title: "Brief",
    sourceMessageId: "udt:5d0c8d2e",
  },
};

const sandboxOpts: OpenSandboxCanvasOptions = {
  sandboxRowId: SANDBOX_ROW_ID,
  conversationId: CONVERSATION_ID,
  fallbackName: "dev box",
};

interface CanvasApi {
  open: (opts: OpenSandboxCanvasOptions) => boolean;
  offer: (opts: OpenSandboxCanvasOptions) => void;
  openContent: (content: CanvasContent) => void;
}

/**
 * The real canvas (standalone store, real controller) with the real sandbox
 * opener hook mounted under it. Steps run in order, each inside act().
 */
/** Stands in for the shell's canvas column being on screen (it registers the
 *  presentation that makes the canvas available). */
function PresentedColumn() {
  const canvas = useCanvas();
  useEffect(() => canvas.registerPresentation(), [canvas]);
  return null;
}

/**
 * The chat host as the app mounts it, reduced to what this opener reads: the
 * app's canvas port (the real binding) over a structural Supabase stand-in.
 */
const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: null, error: null }) };
const chatHost: ChatHost = {
  db: {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    rpc: async () => ({ data: null, error: null }),
    from: () => query,
  } as unknown as ChatDb,
  canvas: appChatCanvasPort,
};
const chatStore = configureStore({ reducer: { probe: () => 0 } });

function drive(steps: Array<(api: CanvasApi, store: CanvasStoreBinding) => void>): CanvasState {
  const store = createCanvasStore();
  const api: { current: CanvasApi | null } = { current: null };
  function Probe() {
    const sandbox = useOpenSandboxCanvas();
    const canvas = useArtifactCanvas();
    api.current = {
      open: sandbox.open,
      offer: sandbox.offer,
      openContent: (content) => {
        canvas.openContent(content);
      },
    };
    return null;
  }
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      <ChatProvider host={chatHost} store={chatStore}>
        <CanvasProvider store={store} persistence={null} hotkeys={false}>
          <PresentedColumn />
          <Probe />
        </CanvasProvider>
      </ChatProvider>,
    );
  });
  for (const step of steps) {
    act(() => step(api.current as CanvasApi, store));
  }
  act(() => root.unmount());
  container.remove();
  return store.getState();
}

const itemsOf = (state: CanvasState) => Object.values(state.items);
const sourceOfActive = (state: CanvasState) => {
  const active = selectCanvasActiveItem(state);
  return active ? canvasItemSourceId(active) : null;
};
const SANDBOX_SOURCE = sandboxCanvasSourceId(CONVERSATION_ID, SANDBOX_ROW_ID);

describe("the sandbox is a registered canvas content type", () => {
  it("renders the real Terminal/Files/Activity pane through the canvas switch", async () => {
    // A store shaped like the slices the pane actually reads — a hidden
    // dependency would surface as a missing key, not as a silent pass.
    const store = configureStore({
      reducer: {
        activeRequests: () => ({ byConversationId: {}, byRequestId: {} }),
        observability: () => ({ toolCalls: {} }),
      },
    });
    (globalThis as { fetch?: unknown }).fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        instance: { id: SANDBOX_ROW_ID, status: "running", name: "dev box" },
      }),
    })) as unknown as typeof fetch;

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <Provider store={store}>
          <CanvasBody content={{ ...sandboxContent, type: "sandbox" }} />
        </Provider>,
      );
    });

    expect(container.textContent).not.toContain("Unsupported content type");
    expect(
      container.querySelector('[data-testid="sandbox-canvas-body"]'),
    ).not.toBeNull();
    for (const label of ["Terminal", "Files", "Activity"]) {
      expect(container.textContent).toContain(label);
    }

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it("names the pane and refuses to persist a live box", () => {
    expect(getDefaultTitle("sandbox")).toBe("Sandbox");
    expect(NON_PERSISTABLE_CANVAS_TYPES.has("sandbox")).toBe(true);
    expect(isPersistableCanvasType("sandbox")).toBe(false);
  });

  it("carries the pointer the pane needs and one stable identity per box", () => {
    expect(sandboxContent.type).toBe("sandbox");
    expect(sandboxContent.data).toEqual({
      sandboxRowId: SANDBOX_ROW_ID,
      fallbackName: "dev box",
    });
    expect(sandboxContent.metadata?.conversationId).toBe(CONVERSATION_ID);
    expect(sandboxContent.metadata?.sourceMessageId).toBe(
      sandboxCanvasSourceId(CONVERSATION_ID, SANDBOX_ROW_ID),
    );
  });
});

describe("default hidden", () => {
  it("shows nothing before anything has happened", () => {
    const state = drive([]);
    expect(state.isOpen).toBe(false);
    expect(itemsOf(state)).toHaveLength(0);
  });

  it("offering a bound sandbox makes it available WITHOUT opening the canvas", () => {
    const state = drive([(api) => api.offer(sandboxOpts)]);
    expect(state.isOpen).toBe(false);
    expect(itemsOf(state)).toHaveLength(1);
    // Reachable: an offered item in an empty pane becomes its active tab, or
    // it is a dead end when the canvas is shown.
    expect(sourceOfActive(state)).toBe(SANDBOX_SOURCE);
  });

  it("offering twice never stacks two sandbox panes", () => {
    const state = drive([
      (api) => api.offer(sandboxOpts),
      (api) => api.offer(sandboxOpts),
    ]);
    expect(itemsOf(state)).toHaveLength(1);
  });

  it("offering never steals the pane the user is reading", () => {
    const state = drive([
      (api) => api.openContent(documentContent),
      (api) => api.offer(sandboxOpts),
    ]);
    expect(itemsOf(state)).toHaveLength(2);
    expect(sourceOfActive(state)).toBe("udt:5d0c8d2e");
  });

  it("opening puts the sandbox on screen", () => {
    const state = drive([(api) => api.open(sandboxOpts)]);
    expect(state.isOpen).toBe(true);
    expect(sourceOfActive(state)).toBe(SANDBOX_SOURCE);
  });
});

describe("a bound box is OFFERED, never opened (owner, 2026-10-21)", () => {
  // The canvas no longer pops open on the agent's first sandbox tool call
  // (@ai-matrx/chat c0a5ef1439): a bound box only puts the Sandbox pane in the
  // canvas switcher, and the person opens it when they want it.
  it("does nothing at all when no box is bound", () => {
    expect(decideSandboxCanvasAction({ bound: false })).toBe("none");
  });

  it("offers a bound box and never opens it", () => {
    expect(decideSandboxCanvasAction({ bound: true })).toBe("offer");
  });

  it("fires on the sandbox tools and nothing else", () => {
    for (const tool of [
      "shell_execute",
      "shell_python",
      "fs_read_file",
      "fs_write_file",
      "git_ingest",
      "github_repositories",
      "code_execute_python",
      "coding:shell_execute",
    ]) {
      expect(isSandboxTool(tool)).toBe(true);
    }
    for (const tool of ["web_search", "cloud_browser_navigate", "", null]) {
      expect(isSandboxTool(tool)).toBe(false);
    }
  });
});

describe("the pane's put-away memory survives a reload", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("remembers the decision across a reload, per conversation AND per box", () => {
    const sourceId = sandboxCanvasSourceId(CONVERSATION_ID, SANDBOX_ROW_ID);
    const otherBox = sandboxCanvasSourceId(
      CONVERSATION_ID,
      "33333333-3333-3333-3333-333333333333",
    );

    writeSandboxCanvasMemory(sourceId, { userClosed: true });

    // A reload is exactly this: nothing in memory, everything re-read.
    expect(readSandboxCanvasMemory(sourceId).userClosed).toBe(true);
    // Binding a DIFFERENT box to the same chat is a new thing to reveal.
    expect(readSandboxCanvasMemory(otherBox).userClosed).toBe(false);
    // And so is the same box in a different conversation.
    expect(
      readSandboxCanvasMemory(
        sandboxCanvasSourceId("other-conversation", SANDBOX_ROW_ID),
      ).userClosed,
    ).toBe(false);
  });

  it("re-opening clears the decision, so the pane behaves normally again", () => {
    const sourceId = sandboxCanvasSourceId(CONVERSATION_ID, SANDBOX_ROW_ID);
    writeSandboxCanvasMemory(sourceId, { userClosed: true });
    writeSandboxCanvasMemory(sourceId, { userClosed: false });
    expect(readSandboxCanvasMemory(sourceId).userClosed).toBe(false);
  });

  it("survives a storage that refuses to answer", () => {
    const original = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("blocked");
      },
    });
    try {
      // A blocked store costs the memory and nothing else — never a throw
      // that takes the chat down with it.
      expect(() =>
        writeSandboxCanvasMemory("sandbox:c:b", { userClosed: true }),
      ).not.toThrow();
      expect(readSandboxCanvasMemory("sandbox:c:b")).toEqual({
        autoOpened: false,
        userClosed: false,
      });
    } finally {
      if (original) Object.defineProperty(window, "localStorage", original);
    }
  });
});

describe("closing the canvas hides it", () => {
  it("leaves nothing on screen, and keeps the pane reachable for reopen", () => {
    const state = drive([
      (api) => api.open(sandboxOpts),
      (_api, store) => store.dispatch(canvasActions.setOpen(false)),
    ]);
    expect(state.isOpen).toBe(false);
    expect(itemsOf(state)).toHaveLength(1);
    expect(sourceOfActive(state)).toBe(SANDBOX_SOURCE);
  });
});
