/**
 * THE DASHBOARD THUMBNAIL (2026-10-22): the agents messenger shows the SAME
 * Computer view as a compact live thumbnail. It never wakes the machine,
 * never mints a stream ticket until it is on screen and the page is visible,
 * never takes the viewer seat from the Computer tab, and a press opens the
 * one Computer tab.
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

const machineState: { status: string; ready: boolean } = { status: "running", ready: true };
const wake = jest.fn();
const autoWakeAsked: boolean[] = [];
jest.mock("../useCloudComputer", () => ({
  useCloudComputer: (opts: { autoWake?: boolean } = {}) => {
    autoWakeAsked.push(!!opts.autoWake);
    return {
      machine: { exists: true, status: machineState.status, ready: machineState.ready, size: "standard", lastActivityAt: null, humanControl: false },
      error: null,
      waking: false,
      wake,
      retry: jest.fn(),
    };
  },
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
const seatState = { elsewhere: false };
const hold = jest.fn((steal?: boolean) => !seatState.elsewhere || !!steal);
jest.mock("@/features/cloud-browser/hooks/useRunViewerSeat", () => ({
  useRunViewerSeat: () => ({ mine: !seatState.elsewhere, elsewhere: seatState.elsewhere, hold }),
}));
const openCanvas = jest.fn();
jest.mock("../useOpenCloudComputerCanvas", () => ({ useOpenCloudComputerCanvas: () => openCanvas }));
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
import { ComputerThumbnail } from "../ComputerThumbnail";

function ticket(sid: string) {
  return {
    ticket: "t",
    organizationId: "org",
    expiresAt: 0,
    endpoint: `https://stream.aimatrx.com/cb-${sid}/`,
    entryCode: `enter-${sid}`,
    protocol: "selkies_webrtc",
    streamSessionId: sid,
    mode: "view",
    control: null,
    media: { video: true, audio: false, clipboard: true },
    viewport: { width: 1280, height: 720 },
  };
}

let container: HTMLDivElement;
let root: Root;
const text = () => container.textContent ?? "";
const openButton = () =>
  [...container.querySelectorAll("button")].find((b) => (b.getAttribute("aria-label") ?? "").startsWith("Open Computer"));

// An IntersectionObserver the test drives: nothing is "on screen" until it says so.
let observed: Array<(entries: Array<{ isIntersecting: boolean }>) => void> = [];
class FakeObserver {
  constructor(private readonly cb: (entries: Array<{ isIntersecting: boolean }>) => void) {}
  observe() {
    observed.push(this.cb);
  }
  disconnect() {}
}

beforeEach(() => {
  mintStreamTicket.mockReset().mockResolvedValue(ticket("thumb1"));
  renewStreamTicket.mockReset().mockResolvedValue(undefined);
  machineState.status = "running";
  machineState.ready = true;
  seatState.elsewhere = false;
  runState.current = "running";
  hold.mockClear();
  wake.mockClear();
  openCanvas.mockClear();
  autoWakeAsked.length = 0;
  observed = [];
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = FakeObserver;
  container = document.createElement("div");
  document.body.appendChild(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

async function mount(node: React.ReactElement) {
  await act(async () => {
    root = createRoot(container);
    root.render(node);
  });
}

it("an asleep machine says Asleep, is never woken, mints nothing, and a press opens the Computer tab", async () => {
  machineState.status = "stopped";
  machineState.ready = false;
  const onOpen = jest.fn();
  await mount(<ComputerView variant="thumbnail" onOpen={onOpen} />);
  expect(text()).toContain("Asleep");
  expect(autoWakeAsked.every((asked) => asked === false)).toBe(true);
  expect(wake).not.toHaveBeenCalled();
  expect(mintStreamTicket).not.toHaveBeenCalled();
  await act(async () => openButton()!.click());
  expect(onOpen).toHaveBeenCalledTimes(1);
});

it("a live machine shows ONE watch stream with Watching and no Take control", async () => {
  await mount(<ComputerView variant="thumbnail" onOpen={jest.fn()} />);
  expect(mintStreamTicket).toHaveBeenCalledTimes(1);
  expect(mintStreamTicket.mock.calls[0][1]).toBe("view");
  expect(container.querySelector("iframe")).not.toBeNull();
  expect(text()).toContain("Watching");
  expect(text()).not.toContain("Take control");
  // It only takes a FREE seat: never steals it from the Computer tab.
  expect(hold).toHaveBeenCalledWith(false);
});

it("while the Computer tab holds the seat it says so and mints nothing", async () => {
  seatState.elsewhere = true;
  await mount(<ComputerView variant="thumbnail" onOpen={jest.fn()} />);
  expect(text()).toContain("On the Computer tab");
  expect(mintStreamTicket).not.toHaveBeenCalled();
  expect(container.querySelector("iframe")).toBeNull();
});

it("ComputerThumbnail reads and mints nothing until it is on screen, then opens the one Computer tab", async () => {
  await mount(<ComputerThumbnail conversationId="conv-1" />);
  expect(autoWakeAsked.length).toBe(0);
  expect(mintStreamTicket).not.toHaveBeenCalled();
  await act(async () => observed.forEach((cb) => cb([{ isIntersecting: true }])));
  expect(mintStreamTicket).toHaveBeenCalledTimes(1);
  await act(async () => openButton()!.click());
  expect(openCanvas).toHaveBeenCalledWith({ conversationId: "conv-1" });
  // Scrolled away: the view (and its stream) unmounts.
  await act(async () => observed.forEach((cb) => cb([{ isIntersecting: false }])));
  expect(container.querySelector("iframe")).toBeNull();
});
