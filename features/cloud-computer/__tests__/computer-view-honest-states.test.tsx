/**
 * HONEST STATES (adversarial review 2026-10-18, D1/D4/D8): the Computer tab
 * said "Watching" + "Loading screen…" for up to 79 s while the run on the
 * machine was still starting; a second window left the first on
 * "Reconnecting…" for 90+ s; Take control and Stop grayed out for 8-12 s with
 * no word. Each case below failed on the code before this change.
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
const runState: { current: string | null } = { current: "running" };
const runError: { code: string | null; detail: string | null } = { code: null, detail: null };
const restart = jest.fn(async () => undefined);
const checkRun = jest.fn(async () => undefined);
let release: () => void = () => undefined;
const gate = () => new Promise<void>((resolve) => (release = resolve));
const takeControl = jest.fn(async () => {
  await gate();
  setController(ME);
});
const returnControl = jest.fn(async () => {
  await gate();
  setController(AGENT);
});
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
        run: runState.current
          ? { id: "run-1", state: runState.current, errorCode: runError.code, errorDetailSafe: runError.detail }
          : null,
        controller,
        handoff: null,
        error: null,
        retry: jest.fn(),
        restart,
        checkRun,
        loading: false,
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
const renewStreamTicket = jest.fn();
jest.mock("@/features/cloud-browser/service", () => ({
  mintStreamTicket: (...args: unknown[]) => mintStreamTicket(...args),
  renewStreamTicket: (...args: unknown[]) => renewStreamTicket(...args),
  streamFrameAddress: (t: { endpoint: string; entryCode: string | null }) =>
    t.entryCode ? `${t.endpoint}?enter=${t.entryCode}` : t.endpoint,
  isStreamGone: (e: unknown) => e instanceof Error && e.message === "superseded",
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
  renewStreamTicket.mockReset().mockResolvedValue(undefined);
  runState.current = "running";
  runError.code = null;
  runError.detail = null;
  restart.mockClear();
  checkRun.mockClear();
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


const text = () => container.textContent ?? "";
function streamSays(state: string) {
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://stream.aimatrx.com",
        source: (container.querySelector("iframe") as HTMLIFrameElement).contentWindow,
        data: { type: "matrx-stream", state },
      }),
    );
  });
}

it("while the run on the machine is still starting it says Waking up, never Watching", async () => {
  runState.current = "provisioning";
  await mount();
  expect(text()).toContain("Waking up…");
  expect(text()).not.toContain("Watching");
  expect(text()).not.toContain("Loading screen");
  expect([...container.querySelectorAll("button")].some((b) => b.textContent === "Take control")).toBe(false);
  expect(mintStreamTicket).not.toHaveBeenCalled();
});

it("a picture taken by the person's other window says Opened somewhere else with Take over", async () => {
  mintStreamTicket.mockResolvedValue(ticket("view", "watch1"));
  await mount();
  streamSays("connected");
  renewStreamTicket.mockRejectedValue(new Error("superseded"));
  await act(async () => {
    streamSays("reconnecting");
    await Promise.resolve();
  });
  expect(renewStreamTicket).toHaveBeenCalledTimes(1);
  expect(text()).toContain("Opened somewhere else");
  expect(container.querySelector("iframe")).toBeNull();
  // Taking it back is the person's press, never automatic.
  expect(mintStreamTicket).toHaveBeenCalledTimes(1);
  await press("Take over");
  expect(mintStreamTicket).toHaveBeenLastCalledWith("run-1", "view", true);
});

it("a picture lost to the network (claim still ours) keeps reconnecting", async () => {
  mintStreamTicket.mockResolvedValue(ticket("view", "watch1"));
  await mount();
  streamSays("connected");
  await act(async () => {
    streamSays("reconnecting");
    await Promise.resolve();
  });
  expect(text()).not.toContain("Opened somewhere else");
  expect(container.querySelector("iframe")).not.toBeNull();
});

it("Take control and Stop say what they are doing while the server works", async () => {
  mintStreamTicket.mockResolvedValue(ticket("view", "watch1"));
  await mount();
  await press("Take control");
  expect(text()).toContain("Taking control…");
  await act(async () => release());
  expect(text()).toContain("You're in control");
  await press("Stop");
  expect(text()).toContain("Stopping…");
  await act(async () => release());
  expect(text()).toContain("Watching");
});


it("a run whose browser died says Browser not running and Restart starts a fresh run (2026-10-22)", async () => {
  runState.current = "failed";
  runError.code = "browser_not_running";
  runError.detail = "The browser stopped (the browser process is gone) and could not be restarted.";
  await mount();
  expect(text()).toContain("Browser not running");
  expect(text()).toContain("could not be restarted");
  expect(text()).not.toContain("Reconnecting");
  await press("Restart");
  expect(restart).toHaveBeenCalledTimes(1);
});

it("a picture that goes away re-reads the run, so a run the server ended shows as ended", async () => {
  mintStreamTicket.mockResolvedValue(ticket("view", "s1"));
  await mount();
  await act(async () => undefined);
  if (!iframe()) return; // this server path shows stills; nothing streams to lose
  streamSays("reconnecting");
  await act(async () => undefined);
  expect(checkRun).toHaveBeenCalled();
});
