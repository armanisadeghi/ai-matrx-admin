/**
 * A clean started in another tab is noticed: an open, visible doc re-asks the
 * run record every PDF_RUN_POLL_MS and the follow joins the live run. No poll
 * while hidden, while this tab's own stream runs, or once a run is followed.
 */
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function renderHook<T>(fn: () => T) {
  const result = { current: undefined as T };
  function Probe() {
    result.current = fn();
    return null;
  }
  const root = createRoot(document.createElement("div"));
  act(() => root.render(createElement(Probe)));
  return { result, unmount: () => act(() => root.unmount()) };
}
import { PDF_RUN_POLL_MS, hasLiveOwnRun, resetSharedPdfRunLookups, usePdfDocRun } from "../usePdfDocRun";

const getByLink = jest.fn();
const jobState: { status: string | null; error: unknown; reconnect: jest.Mock } = {
  status: "completed",
  error: null,
  reconnect: jest.fn(),
};
jest.mock("@/lib/runtime-operations/operationsByLink", () => ({
  fetchOperationsByLink: (...a: unknown[]) => getByLink(...a),
}));
jest.mock("@ai-matrx/agents/react", () => ({
  useServerJob: () => ({ ...jobState, operation: null, outcome: null }),
}));
jest.mock("@/lib/api/matrx-transport", () => ({ createMatrxTransport: () => ({}) }));
jest.mock("@/lib/redux/hooks", () => {
  const store = { getState: () => ({}) };
  return { useAppStore: () => store };
});

const DOC = "8a1f0c2e-6b7d-4e5f-9a0b-1c2d3e4f5a6b";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const op = (status: string, is_terminal = false): any => ({
  execution_id: "e1",
  status,
  is_terminal,
  link_kind: "processed_document",
  link_id: DOC,
});

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
}

beforeEach(() => {
  jest.useFakeTimers();
  getByLink.mockReset();
  jobState.reconnect.mockReset();
  jobState.status = "completed";
  resetSharedPdfRunLookups();
  window.sessionStorage.clear();
  setVisibility("visible");
});
afterEach(() => jest.useRealTimers());

const mount = (localStreaming = false) =>
  renderHook(() => usePdfDocRun({ docId: DOC, localStreaming, onSettled: jest.fn() }));

it("tells a live run from a finished one", () => {
  expect(hasLiveOwnRun([op("running")], DOC)).toBe(true);
  expect(hasLiveOwnRun([op("completed", true)], DOC)).toBe(false);
  expect(hasLiveOwnRun([{ ...op("running"), link_id: "other" }], DOC)).toBe(false);
  expect(hasLiveOwnRun(null, DOC)).toBe(false);
});

it("joins a run started elsewhere on the next poll", async () => {
  getByLink.mockResolvedValue({ operations: [op("completed", true)] });
  mount();
  await act(async () => {});
  expect(jobState.reconnect).not.toHaveBeenCalled();
  getByLink.mockResolvedValue({ operations: [op("running")] });
  await act(async () => {
    jest.advanceTimersByTime(PDF_RUN_POLL_MS);
  });
  expect(jobState.reconnect).toHaveBeenCalledTimes(1);
});

it("does not poll while the tab is hidden", async () => {
  getByLink.mockResolvedValue({ operations: [op("running")] });
  mount();
  await act(async () => {});
  jobState.reconnect.mockReset();
  getByLink.mockClear();
  setVisibility("hidden");
  await act(async () => {
    jest.advanceTimersByTime(PDF_RUN_POLL_MS * 3);
  });
  expect(getByLink).not.toHaveBeenCalled();
  expect(jobState.reconnect).not.toHaveBeenCalled();
});

it("does not poll while this tab streams or already follows a run", async () => {
  getByLink.mockResolvedValue({ operations: [op("running")] });
  mount(true);
  await act(async () => {});
  getByLink.mockClear();
  await act(async () => {
    jest.advanceTimersByTime(PDF_RUN_POLL_MS * 2);
  });
  expect(getByLink).not.toHaveBeenCalled();

  jobState.status = "running";
  mount(false);
  await act(async () => {});
  getByLink.mockClear();
  await act(async () => {
    jest.advanceTimersByTime(PDF_RUN_POLL_MS * 2);
  });
  expect(getByLink).not.toHaveBeenCalled();
});

it("a failed status read is not news and the next tick asks again", async () => {
  getByLink.mockResolvedValue({ operations: [] });
  mount();
  await act(async () => {});
  getByLink.mockRejectedValueOnce(new Error("net"));
  await act(async () => {
    jest.advanceTimersByTime(PDF_RUN_POLL_MS);
  });
  expect(jobState.reconnect).not.toHaveBeenCalled();
  getByLink.mockResolvedValue({ operations: [op("pending")] });
  await act(async () => {
    jest.advanceTimersByTime(PDF_RUN_POLL_MS);
  });
  expect(jobState.reconnect).toHaveBeenCalledTimes(1);
});
