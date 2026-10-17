/**
 * THE ONE CONNECTION (owner test, 2026-10-17): the Computer tab showed a white
 * still, and Take control then spent ~30 s "Connecting to server" on a second
 * stream. Watching must be the live stream itself, and Take control must turn
 * input on in that SAME frame — no second ticket, no remount. On a server
 * that cannot stream to watchers yet (409), watching falls back to stills and
 * Take control opens the control stream as before.
 */

import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
  observe() {}
  disconnect() {}
};

type Controller = {
  kind: "agent" | "human";
  displayName: string | null;
  isMe: boolean;
  controlRevision: number;
  streamActive: boolean;
  pendingRequestFrom: null;
};
const AGENT: Controller = {
  kind: "agent",
  displayName: null,
  isMe: false,
  controlRevision: 1,
  streamActive: false,
  pendingRequestFrom: null,
};
const ME: Controller = { ...AGENT, kind: "human", isMe: true, controlRevision: 2, streamActive: true };

let setController: (c: Controller) => void = () => undefined;
const takeControl = jest.fn(async () => setController(ME));
const returnControl = jest.fn(async () => setController(AGENT));
const startStills = jest.fn();

jest.mock("../useCloudComputer", () => ({
  useCloudComputer: () => ({
    machine: { exists: true, status: "running", ready: true, size: "standard", lastActivityAt: null, humanControl: false },
    error: null,
    waking: false,
    wake: jest.fn(),
    retry: jest.fn(),
  }),
}));
jest.mock("@/features/cloud-browser/hooks/useCloudBrowser", () => {
  const ReactActual = jest.requireActual<typeof import("react")>("react");
  return {
    useCloudBrowser: () => {
      const [controller, set] = ReactActual.useState<Controller>(AGENT);
      setController = set;
      return {
        run: { id: "run-1", state: "running", errorDetailSafe: null },
        controller,
        handoff: null,
        error: null,
        retry: jest.fn(),
        takeControl,
        returnControl,
      };
    },
  };
});
jest.mock("@/features/cloud-browser/hooks/useScreenshotSession", () => ({
  useScreenshotSession: () => ({ frames: [], active: false, paused: false, start: startStills, stop: jest.fn() }),
}));
jest.mock("@/features/cloud-browser/hooks/useCloudBrowserTakeover", () => ({
  useCloudBrowserTakeover: ({ claim }: { claim: () => Promise<void> }) => ({
    phase: "idle",
    waiting: false,
    begin: () => void claim(),
    takeOverImmediately: jest.fn(),
  }),
}));
jest.mock("@/features/cloud-browser/hooks/useRunViewerSeat", () => ({
  useRunViewerSeat: () => ({ mine: true, elsewhere: false, hold: () => true }),
}));
jest.mock("@/features/cloud-browser/hooks/useCloudBrowserProfileContextSync", () => ({
  useCloudBrowserProfileContextSync: () => undefined,
}));
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: () => undefined }));
jest.mock("@ai-matrx/chat/agents/redux/agent-definition/selectors", () => ({ selectAgentById: () => undefined }));
jest.mock("@ai-matrx/chat/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors", () => ({
  selectInstanceAgentId: () => () => undefined,
}));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, icon: _icon, variant: _variant, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: unknown; variant?: string }) => (
    <button type="button" {...rest}>
      {children}
    </button>
  ),
}));
jest.mock("@/lib/toast", () => ({ toast: { warning: jest.fn() }, toastErrorAlreadyCaptured: jest.fn() }));

class FakeBackendApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly userMessage = "refused",
  ) {
    super(userMessage);
  }
}
jest.mock("@ai-matrx/api", () => ({ BackendApiError: FakeBackendApiError }));

const mintStreamTicket = jest.fn();
jest.mock("@/features/cloud-browser/service", () => ({
  mintStreamTicket: (...args: unknown[]) => mintStreamTicket(...args),
  renewStreamTicket: jest.fn().mockResolvedValue(undefined),
  streamFrameAddress: (t: { endpoint: string; entryCode: string | null }) =>
    t.entryCode ? `${t.endpoint}?enter=${t.entryCode}` : t.endpoint,
  isStreamGone: () => false,
  browserActionBlockedReason: () => null,
  isViewStreamUnavailable: (e: unknown) => e instanceof FakeBackendApiError && e.status === 409,
}));

import { ComputerView } from "../ComputerView";

function ticket(mode: "view" | "control", sid: string) {
  return {
    ticket: "t",
    organizationId: "org",
    expiresAt: 0,
    endpoint: `https://stream.aimatrx.com/cb-${sid}/`,
    entryCode: `enter-${sid}`,
    protocol: "selkies_webrtc",
    streamSessionId: sid,
    mode,
    control: mode === "control" ? { controlRevision: 2, leaseExpiresAt: 0, renewIntervalSeconds: 20 } : null,
    media: { video: true, audio: false, clipboard: true },
    viewport: { width: 1280, height: 720 },
  };
}

let container: HTMLDivElement;
let root: Root;
const iframe = () => container.querySelector("iframe");
const press = async (name: string) => {
  const button = [...container.querySelectorAll("button")].find((b) => b.textContent === name);
  if (!button) throw new Error(`no ${name} button in: ${container.textContent}`);
  await act(async () => button.click());
};

beforeEach(async () => {
  mintStreamTicket.mockReset();
  takeControl.mockClear();
  startStills.mockClear();
  container = document.createElement("div");
  document.body.appendChild(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

async function mount() {
  await act(async () => {
    root = createRoot(container);
    root.render(<ComputerView />);
  });
}

it("watching is the live stream; Take control drives the same frame with no second ticket", async () => {
  mintStreamTicket.mockResolvedValue(ticket("view", "watch1"));
  await mount();
  expect(mintStreamTicket).toHaveBeenCalledTimes(1);
  expect(mintStreamTicket).toHaveBeenCalledWith("run-1", "view", false);
  const watching = iframe();
  expect(watching).not.toBeNull();
  // The frame trades the claim's one-use code for its own cookie.
  expect(new URL(watching!.src).searchParams.get("enter")).toBe("enter-watch1");
  expect(watching!.style.pointerEvents).toBe("none");
  expect(container.querySelector("img")).toBeNull();
  expect(startStills).not.toHaveBeenCalled();

  await press("Take control");
  expect(takeControl).toHaveBeenCalledTimes(1);
  expect(mintStreamTicket).toHaveBeenCalledTimes(1);
  expect(iframe()).toBe(watching);
  expect(iframe()!.style.pointerEvents).toBe("auto");
  expect(document.activeElement).toBe(iframe());

  await press("Stop");
  expect(mintStreamTicket).toHaveBeenCalledTimes(1);
  expect(iframe()).toBe(watching);
  expect(iframe()!.style.pointerEvents).toBe("none");
});

it("a server without the watch stream (409) falls back to stills, then a control stream on Take control", async () => {
  mintStreamTicket
    .mockRejectedValueOnce(new FakeBackendApiError(409, "not_controller"))
    .mockResolvedValueOnce(ticket("control", "ctl1"));
  await mount();
  expect(iframe()).toBeNull();
  expect(startStills).toHaveBeenCalled();

  await press("Take control");
  expect(mintStreamTicket).toHaveBeenCalledTimes(2);
  expect(mintStreamTicket).toHaveBeenLastCalledWith("run-1", "control", false);
  expect(iframe()).not.toBeNull();
  expect(iframe()!.style.pointerEvents).toBe("auto");
});
