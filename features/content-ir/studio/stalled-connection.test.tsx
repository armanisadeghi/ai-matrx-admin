/**
 * Arman 2026-10-14 (live /shapes/brand_intake_facts): the database line stalls,
 * every read fails with "Failed to fetch" only after ~90s, and the page spun
 * and never recovered. Every loader on the shape page must (1) end its wait in
 * ONE honest failure and (2) heal by itself, no click, when the line returns —
 * including when an OLDER stalled call settles late (the live failure of
 * 510f8a52bf5: a late timeout overwrote the newer retry's success).
 *
 * The real design-system ReadFailure is rendered (not mocked); only the data
 * seams and heavy neighbours are.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { SHAPE_LOAD_DEADLINE_MS } from "./bounded-load";

const listKindIncidents = jest.fn();
const fetchRows = jest.fn();
const evaluateShapeActivation = jest.fn();
const listShapeComponentCandidates = jest.fn();
const ensureWarm = jest.fn();
const refresh = jest.fn();
const captureError = jest.fn();

jest.mock("@/utils/supabase/client", () => ({
  supabase: {
    schema: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({ is: () => ({ order: () => ({ order: () => fetchRows() }) }) }),
        }),
      }),
    }),
  },
}));
jest.mock("@/lib/toast", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/lib/diagnostics/errorCaptureStore", () => ({
  captureError: (...a: unknown[]) => captureError(...a),
}));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));
jest.mock("@/components/dialogs/confirm/ConfirmDialogHost", () => ({ confirm: jest.fn() }));
jest.mock("@/features/content-ir/studio/useKindAgentLaunch", () => ({
  useKindAgentLaunch: () => ({ launch: jest.fn(), launching: false }),
}));
jest.mock("@/features/content-ir/admin/incident-service", () => ({
  listKindIncidents: (...a: unknown[]) => listKindIncidents(...a),
  resolveKindIncident: jest.fn(),
}));
jest.mock("@/features/content-ir/studio/shape-authoring-service", () => ({
  evaluateShapeActivation: (...a: unknown[]) => evaluateShapeActivation(...a),
  setShapeActivation: jest.fn(),
  listShapeComponentCandidates: (...a: unknown[]) => listShapeComponentCandidates(...a),
  setDefaultShapeComponent: jest.fn(),
}));
jest.mock("@/features/content-ir/registry/component-registry", () => ({
  componentRegistry: {
    ensureWarm: () => ensureWarm(),
    refresh: (...a: unknown[]) => refresh(...a),
  },
  resolveComponent: () => ({
    componentKey: "generic_structured",
    source: "bundled",
    isActive: true,
  }),
  subscribeKindComponents: () => () => {},
}));
jest.mock("@/features/content-ir/registry/schema-source-kind-components", () => ({
  GENERIC_STRUCTURED_COMPONENT_KEY: "generic_structured",
}));

import ShapeOpenSightings from "../render-paths/ShapeOpenSightings";
import ShapeActivationControl from "./components/ShapeActivationControl";
import ShapeRenderStatusStrip from "./components/ShapeRenderStatusStrip";
import { useKindExamples } from "./kind-examples";

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  jest.useFakeTimers();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  for (const m of [
    listKindIncidents,
    fetchRows,
    evaluateShapeActivation,
    listShapeComponentCandidates,
    ensureWarm,
    refresh,
    captureError,
  ]) {
    m.mockReset();
  }
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  jest.useRealTimers();
});

const stalled = () => new Promise<never>(() => {});
const retryButtons = () =>
  Array.from(container.querySelectorAll("button")).filter((b) => (b.textContent ?? "").includes("Try again")).length;
const text = () => container.textContent ?? "";

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
    await Promise.resolve();
    await Promise.resolve();
  });
}
async function lineReturns() {
  await act(async () => {
    window.dispatchEvent(new Event("online"));
    await Promise.resolve();
    await Promise.resolve();
  });
  await advance(0);
}

const VERDICT = {
  wouldActivate: true,
  structuralOk: true,
  renderOk: true,
  renderLegApplicable: true,
  componentPlatforms: [],
  reasons: [],
};

describe("stalled database line — every loader fails once and heals unprompted", () => {
  it("open sightings", async () => {
    listKindIncidents.mockImplementation(stalled);
    await act(async () => {
      root.render(<ShapeOpenSightings kind="k" />);
    });
    await advance(SHAPE_LOAD_DEADLINE_MS);
    expect(text()).toContain("open sightings");
    expect(text()).toContain("Try again");

    listKindIncidents.mockResolvedValue([]);
    await lineReturns();
    expect(text()).not.toContain("Try again");
  });

  it("examples", async () => {
    fetchRows.mockImplementation(stalled);
    function Probe() {
      return <span>{useKindExamples("def-1").status}</span>;
    }
    await act(async () => {
      root.render(<Probe />);
    });
    expect(text()).toBe("loading");
    await advance(SHAPE_LOAD_DEADLINE_MS);
    expect(text()).toBe("error");

    fetchRows.mockResolvedValue({ data: [], error: null });
    await lineReturns();
    expect(text()).toBe("ready");
  });

  it("activation control: shows a retry, files one error, heals on `online`", async () => {
    evaluateShapeActivation.mockImplementation(stalled);
    await act(async () => {
      root.render(
        <ShapeActivationControl
          kind="k"
          kindDefinitionId="def-1"
          isActive
          onActivationChanged={() => {}}
        />,
      );
    });
    await advance(SHAPE_LOAD_DEADLINE_MS);
    expect(text()).toContain("No answer for this shape's activation check");
    expect(text()).toContain("Try again");

    // Every backoff retry also stalls — still ONE error filed for the outage.
    await advance(5_000 + SHAPE_LOAD_DEADLINE_MS);
    await advance(15_000 + SHAPE_LOAD_DEADLINE_MS);
    expect(captureError).toHaveBeenCalledTimes(1);

    evaluateShapeActivation.mockResolvedValue(VERDICT);
    await lineReturns();
    expect(text()).not.toContain("Try again");
    expect(text()).not.toContain("No answer for");
  });

  it("activation control: a LATE timeout of an older call never overwrites the newer success", async () => {
    // Call #1 stalls (times out at 20s); call #2 (5s backoff retry) also stalls;
    // `online` fires call #3, which succeeds BEFORE #2's own timeout lands.
    evaluateShapeActivation.mockImplementation(stalled);
    await act(async () => {
      root.render(
        <ShapeActivationControl
          kind="k"
          kindDefinitionId="def-1"
          isActive
          onActivationChanged={() => {}}
        />,
      );
    });
    await advance(SHAPE_LOAD_DEADLINE_MS);
    await advance(5_000); // call #2 starts, will time out at +20s
    evaluateShapeActivation.mockResolvedValue(VERDICT);
    await lineReturns(); // call #3 succeeds
    expect(text()).not.toContain("No answer for");
    await advance(SHAPE_LOAD_DEADLINE_MS); // #2's deadline lands late
    expect(text()).not.toContain("No answer for");
    expect(text()).not.toContain("Try again");
  });

  it("render-status strip: heals even when the registry's first warm never settles", async () => {
    // The registry's one-shot warm rides the socket that stalled and NEVER
    // settles; a retry that only re-awaited it stayed failed forever (live).
    ensureWarm.mockImplementation(stalled);
    refresh.mockResolvedValue(undefined);
    listShapeComponentCandidates.mockResolvedValue([]);
    await act(async () => {
      root.render(
        <ShapeRenderStatusStrip
          kind="k"
          kindDefinitionId="def-1"
          label="K"
          kindIsActive
          dataOnly={false}
          isOwnedByViewer={false}
          emittedJsonSchema={null}
        />,
      );
    });
    expect(text()).toContain("Checking what renders this shape");
    await advance(SHAPE_LOAD_DEADLINE_MS);
    expect(text()).toContain("what renders this shape");
    expect(text()).toContain("Try again");
    expect(text()).not.toContain("Checking what renders");

    await lineReturns();
    expect(refresh).toHaveBeenCalledWith(0);
    expect(text()).not.toContain("Try again");
    expect(text()).toContain("This shape renders through");
  });

  it("render-status strip: one error filed per outage, not per retry", async () => {
    ensureWarm.mockImplementation(stalled);
    refresh.mockImplementation(stalled);
    listShapeComponentCandidates.mockImplementation(stalled);
    await act(async () => {
      root.render(
        <ShapeRenderStatusStrip
          kind="k"
          kindDefinitionId="def-1"
          label="K"
          kindIsActive
          dataOnly={false}
          isOwnedByViewer={false}
          emittedJsonSchema={null}
        />,
      );
    });
    await advance(SHAPE_LOAD_DEADLINE_MS);
    const afterFirst = captureError.mock.calls.length;
    for (const wait of [5_000, 15_000, 30_000, 60_000]) {
      await advance(wait + SHAPE_LOAD_DEADLINE_MS);
    }
    expect(captureError.mock.calls.length).toBe(afterFirst);
    expect(afterFirst).toBeLessThanOrEqual(2); // one per loader (warm + candidates)
    expect(retryButtons()).toBe(1); // one failure card for the region
  });
});
