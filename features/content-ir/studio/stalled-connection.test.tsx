/**
 * Arman 2026-10-14 (live /shapes/brand_intake_facts): the database line stalls,
 * every read fails with "Failed to fetch" only after ~90s, and the page spun
 * and never recovered. Each loader on the shape page must (1) end its wait with
 * an honest failure and (2) ask again by itself when the connection returns.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { SHAPE_LOAD_DEADLINE_MS } from "./bounded-load";

const listKindIncidents = jest.fn();
const fetchRows = jest.fn();

jest.mock("@/utils/supabase/client", () => ({
  supabase: {
    schema: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            is: () => ({
              order: () => ({ order: () => fetchRows() }),
            }),
          }),
        }),
      }),
    }),
  },
}));
jest.mock("@/lib/toast", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/lib/diagnostics/errorCaptureStore", () => ({ captureError: jest.fn() }));
jest.mock("@/features/content-ir/admin/incident-service", () => ({
  listKindIncidents: (...a: unknown[]) => listKindIncidents(...a),
  resolveKindIncident: jest.fn(),
}));
jest.mock("@ai-matrx/design-system", () => ({
  ReadFailure: ({ what, onRetry }: { what: string; onRetry?: () => void }) => (
    <div data-testid="read-failure">
      Couldn&apos;t load {what}
      <button onClick={onRetry}>Try again</button>
    </div>
  ),
}));

import ShapeOpenSightings from "../render-paths/ShapeOpenSightings";
import { useKindExamples } from "./kind-examples";

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  jest.useFakeTimers();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  listKindIncidents.mockReset();
  fetchRows.mockReset();
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  jest.useRealTimers();
});

const stalled = () => new Promise<never>(() => {});

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
    await Promise.resolve();
  });
}

describe("stalled database line", () => {
  it("open sightings: ends in an honest failure, then heals when the connection returns", async () => {
    listKindIncidents.mockImplementation(stalled);
    await act(async () => {
      root.render(<ShapeOpenSightings kind="brand_intake_facts" />);
    });
    expect(container.querySelector('[data-testid="read-failure"]')).toBeNull();

    await advance(SHAPE_LOAD_DEADLINE_MS);
    expect(container.querySelector('[data-testid="read-failure"]')?.textContent).toContain(
      "open sightings",
    );

    // The line comes back: `online` alone re-asks, no click needed.
    listKindIncidents.mockResolvedValue([]);
    await act(async () => {
      window.dispatchEvent(new Event("online"));
      await Promise.resolve();
    });
    await advance(0);
    expect(container.querySelector('[data-testid="read-failure"]')).toBeNull();
  });

  it("examples: a stalled read becomes an error state, then recovers on its own", async () => {
    fetchRows.mockImplementation(stalled);
    const seen: string[] = [];
    function Probe() {
      const state = useKindExamples("def-1");
      seen.push(state.status);
      return <span data-testid="status">{state.status}</span>;
    }
    await act(async () => {
      root.render(<Probe />);
    });
    expect(container.textContent).toBe("loading");

    await advance(SHAPE_LOAD_DEADLINE_MS);
    expect(container.textContent).toBe("error");

    fetchRows.mockResolvedValue({ data: [], error: null });
    await act(async () => {
      window.dispatchEvent(new Event("online"));
      await Promise.resolve();
    });
    await advance(0);
    expect(container.textContent).toBe("ready");
  });
});
