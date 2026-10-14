/**
 * The shape page tells the SHARED truth (live run, 2026-10-14, brand_intake_facts
 * with 0 shared component rows and a personal / organization view layered over):
 *   1. the strip repaints when the registry changes (its listener was a no-op);
 *   2. the strip reads the SHARED answer, never the viewer's own winner;
 *   3. the owner's "Live" line and the Preview verdict never claim a component
 *      the shared view does not have.
 * The registry is a controllable stand-in; the strip, the activation control and
 * the pure verdict sentence are the real code.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

type Res = { componentKey: string; source: string; isActive: boolean; resolvedBy?: string } | null;

const reg: { shared: Res; winner: Res; version: number; listeners: Set<() => void> } = {
  shared: null,
  winner: null,
  version: 0,
  listeners: new Set(),
};
function change(patch: Partial<Pick<typeof reg, "shared" | "winner">>) {
  Object.assign(reg, patch);
  reg.version += 1;
  reg.listeners.forEach((l) => l());
}

jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
jest.mock("@/lib/toast", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/lib/diagnostics/errorCaptureStore", () => ({ captureError: jest.fn() }));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));
jest.mock("@/components/dialogs/confirm/ConfirmDialogHost", () => ({ confirm: jest.fn() }));
jest.mock("@/features/content-ir/studio/useKindAgentLaunch", () => ({
  useKindAgentLaunch: () => ({ launch: jest.fn(), launching: false }),
}));
jest.mock("@/features/content-ir/studio/shape-authoring-service", () => ({
  evaluateShapeActivation: async () => ({
    wouldActivate: true,
    structuralOk: true,
    renderOk: false,
    renderLegApplicable: true,
    componentPlatforms: [],
    reasons: [],
  }),
  setShapeActivation: jest.fn(),
  listShapeComponentCandidates: async () => [],
  setDefaultShapeComponent: jest.fn(),
}));
jest.mock("@/features/content-ir/registry/component-registry", () => ({
  componentRegistry: {
    ensureWarm: () => Promise.resolve(),
    refresh: () => Promise.resolve(),
    getVersion: () => reg.version,
  },
  resolveComponent: () => reg.winner ?? reg.shared,
  resolveSharedComponent: () => reg.shared,
  subscribeKindComponents: (l: () => void) => {
    reg.listeners.add(l);
    return () => reg.listeners.delete(l);
  },
}));
jest.mock("@/features/content-ir/registry/schema-source-kind-components", () => ({
  GENERIC_STRUCTURED_COMPONENT_KEY: "generic_structured",
}));

import ShapeActivationControl from "./components/ShapeActivationControl";
import ShapeRenderStatusStrip from "./components/ShapeRenderStatusStrip";
import { describeRenderVerdict, describeLiveRender } from "./shared-view-truth";

const GENERIC: Res = { componentKey: "generic_structured", source: "bundled", isActive: true };
const ORG_VIEW: Res = { componentKey: "brand_intake_facts_org_view", source: "db", isActive: true };
const SHARED_ROW: Res = { componentKey: "brand_intake_facts_card", source: "db", isActive: true };

let root: Root;
let container: HTMLDivElement;
const text = () => container.textContent ?? "";

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  reg.shared = GENERIC;
  reg.winner = null;
  reg.version = 0;
  reg.listeners.clear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

function strip() {
  return (
    <ShapeRenderStatusStrip
      kind="brand_intake_facts"
      kindDefinitionId="kd-1"
      label="Brand intake facts"
      kindIsActive
      dataOnly={false}
      isOwnedByViewer={false}
      emittedJsonSchema={null}
    />
  );
}

describe("the render-status strip", () => {
  it("reads the SHARED answer: a personal/org winner never becomes 'the only component registered'", async () => {
    reg.winner = ORG_VIEW; // the viewer's own view wins for them; shared is still generic
    await act(async () => root.render(strip()));
    await flush();
    expect(text()).toContain("generic viewer — no component yet");
    expect(text()).not.toContain("brand_intake_facts_org_view");
    expect(text()).not.toContain("only component registered");
  });

  it("repaints when the registry changes after first paint", async () => {
    await act(async () => root.render(strip()));
    await flush();
    expect(text()).toContain("generic viewer — no component yet");
    await act(async () => change({ shared: SHARED_ROW }));
    expect(text()).toContain("custom component");
    expect(text()).toContain("brand_intake_facts_card");
    expect(text()).not.toContain("generic viewer — no component yet");
  });
});

describe("the owner's Live line", () => {
  const live = () =>
    (
      <ShapeActivationControl
        kind="brand_intake_facts"
        kindDefinitionId="kd-1"
        isActive
        onActivationChanged={() => undefined}
      />
    );

  it("does not claim a component when the shared view is the generic viewer", async () => {
    reg.winner = ORG_VIEW;
    await act(async () => root.render(live()));
    await flush();
    expect(text()).toContain("generic viewer");
    expect(text()).not.toContain("its component");
  });

  it("claims the component only when the shared view has one, and follows a change", async () => {
    await act(async () => root.render(live()));
    await flush();
    await act(async () => change({ shared: SHARED_ROW }));
    expect(text()).toContain("its component");
    expect(text()).not.toContain("generic viewer");
  });
});

describe("the sentences", () => {
  it("Preview verdict: a layered view rendering is not 'this shape's own component'", () => {
    const base = { reached: true, sharedHasComponent: false };
    expect(describeRenderVerdict({ ...base, layerScope: "user" })).toContain("Your view rendered");
    expect(describeRenderVerdict({ ...base, layerScope: "organization" })).toContain(
      "Your organization's view rendered",
    );
    expect(describeRenderVerdict({ ...base, layerScope: null })).toContain("generic key/value");
    expect(describeRenderVerdict({ reached: true, sharedHasComponent: true, layerScope: "user" })).toBe(
      "This shape's own component rendered.",
    );
    expect(describeRenderVerdict({ reached: false, sharedHasComponent: true, layerScope: null })).toContain(
      "generic key/value",
    );
  });

  it("Live line: an unmeasured shared view makes no render claim", () => {
    expect(describeLiveRender("checking")).not.toMatch(/component|generic/);
    expect(describeLiveRender("unknown")).not.toMatch(/component|generic/);
  });
});
