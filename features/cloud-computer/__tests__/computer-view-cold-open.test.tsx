/**
 * COLD OPEN OVERLAP (FIX-COLD-OPEN 2026-10-18): a cold open took 48-53 s; after
 * the ~25 s machine boot the tab waited for "ready", then started its run, then
 * polled the provisioning run every 2 s. The screen (and so the run start) now
 * mounts while the machine's task is still booting, and a Cloud Computer run is
 * polled every 750 ms. Each case failed on the code before this change.
 */
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const browserStarts = jest.fn();
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

const machineState: { status: string; ready: boolean } = { status: "starting", ready: false };
jest.mock("../useCloudComputer", () => ({
  useCloudComputer: () => ({
    machine: { exists: true, status: machineState.status, ready: machineState.ready, size: "standard", lastActivityAt: null, humanControl: false },
    error: null,
    waking: false,
    wake: jest.fn(),
    retry: jest.fn(),
  }),
}));
jest.mock("@/features/cloud-browser/hooks/useCloudBrowser", () => {
  const ReactActual = jest.requireActual<typeof import("react")>("react");
  return {
    useCloudBrowser: (...args: unknown[]) => {
      browserStarts(...args);
      const [controller, set] = ReactActual.useState<Controller>(AGENT);
      setController = set;
      return {
        run: runState.current ? { id: "run-1", state: runState.current, errorDetailSafe: null } : null,
        controller,
        handoff: null,
        error: null,
        retry: jest.fn(),
        restart: jest.fn(),
        checkRun: jest.fn(async () => undefined),
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

import { ComputerView, startsScreen } from "../ComputerView";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  browserStarts.mockClear();
  runState.current = null;
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

test("a booting machine already starts its run on the machine and says Waking up", async () => {
  machineState.status = "starting";
  machineState.ready = false;
  await mount();
  expect(browserStarts).toHaveBeenCalled();
  expect(browserStarts.mock.calls[0][2]).toBe("sandbox");
  expect(container.textContent).toContain("Waking up");
  expect(container.querySelector("iframe")).toBeNull();
});

test("a machine whose row may not exist yet (creating) does not start a run", async () => {
  machineState.status = "creating";
  machineState.ready = false;
  await mount();
  expect(browserStarts).not.toHaveBeenCalled();
  expect(container.textContent).toContain("Waking up");
});

test("startsScreen: ready or starting only", () => {
  const m = (status: string, ready = false) =>
    ({ exists: true, status, ready, size: "standard", lastActivityAt: null, humanControl: false }) as Parameters<typeof startsScreen>[0];
  expect(startsScreen(m("running", true))).toBe(true);
  expect(startsScreen(m("starting"))).toBe(true);
  for (const s of ["none", "creating", "stopped", "shutting_down", "failed", "expired"]) expect(startsScreen(m(s))).toBe(false);
});
