/**
 * One by-link lookup per doc open, through the REAL hook and the REAL
 * @ai-matrx/agents follow path (only the transport's wire is faked). The probe
 * and the follow's identify step used to issue two identical GETs ~450 ms apart.
 */
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const wire: string[] = [];
const wireArgs: unknown[][] = [];
const OP = (docId: string) => ({
  execution_id: "e1",
  request_id: "r1",
  type: "pdf_clean",
  status: "completed",
  is_terminal: true,
  waiting_input: false,
  cost: 0,
  meters: {},
  link_kind: "processed_document",
  link_id: docId,
  error: null,
  created_at: null,
  started_at: null,
  ended_at: "2020-01-01T00:00:00Z",
  last_event_seq: 1,
});
// The by-link read is Supabase (runtime.global_execution), not the Python server: the wire
// here is the operationsByLink seam, and the transport must never be asked for a by-link GET.
const transportPaths: string[] = [];
jest.mock("@/lib/runtime-operations/operationsByLink", () => ({
  fetchOperationsByLink: async (kind: string, id: string, limit: number, opts: unknown) => {
    wire.push(`${kind}/${id}`);
    wireArgs.push([limit, opts]);
    return { operations: [OP(id)] };
  },
}));
jest.mock("@/lib/api/matrx-transport", () => ({
  createMatrxTransport: () => ({
    fetch: async (path: string) => {
      transportPaths.push(path);
      return new Response("{}", { status: 200 });
    },
  }),
}));
jest.mock("@/lib/redux/hooks", () => {
  const store = { getState: () => ({}) };
  return { useAppStore: () => store };
});

import { resetSharedPdfRunLookups, usePdfDocRun } from "../usePdfDocRun";

const DOC = "8a1f0c2e-6b7d-4e5f-9a0b-1c2d3e4f5a6b";

function mount(docId: string) {
  const result = { current: undefined as ReturnType<typeof usePdfDocRun> | undefined };
  function Probe() {
    result.current = usePdfDocRun({ docId, localStreaming: false, onSettled: jest.fn() });
    return null;
  }
  const root = createRoot(document.createElement("div"));
  act(() => root.render(createElement(Probe)));
  return { result, root };
}

beforeEach(() => {
  wire.length = 0;
  wireArgs.length = 0;
  transportPaths.length = 0;
  resetSharedPdfRunLookups();
  window.sessionStorage.clear();
});

it("opening a doc issues exactly one by-link GET (probe + follow share it)", async () => {
  const { result } = mount(DOC);
  for (let i = 0; i < 6; i++) await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
  expect(result.current?.answered).toBe(true);
  expect(wire).toEqual([`processed_document/${DOC}`]);
  // the follow resumes from the event cursor, so the read asks for it
  expect(wireArgs[0]).toEqual([5, { eventCursor: true }]);
  expect(transportPaths.filter((p) => p.includes("/by-link/"))).toEqual([]);
});
