/**
 * SHAPE LAYERS, slice 4 — the fix-it ladder and the slice-2 review findings.
 *
 * Pinned (each proven red on a planted break before it went green):
 *   - the bar lists EVERY gap of a kind with several, not only the first;
 *   - "Make my view" is offered to a plain signed-in user (not creator, not admin);
 *   - "For my organization" only for an org admin;
 *   - "Change for everyone" is a LINK (new tab, admin shape page), shown on
 *     identity only, and the bar never reaches the admin lane;
 *   - a layered winner → no generic claim (the "My view" marker instead);
 *   - the Fix badge on a layer targets THAT layer, never the shared component,
 *     and admin power never applies to a layer;
 *   - the sandbox transform cache is keyed by row id, not only updated_at;
 *   - admin screens read the SHARED tier explicitly, never the overlay winner.
 */

// component-registry FIRST: it anchors the registry cluster's import cycle.
import { ComponentRegistry } from "../registry/component-registry";
import { getSystemComponentEntries } from "../registry/system-components";

import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  listKindRenderGaps,
  type KindRenderGapDiagnosis,
} from "../react/fixit/diagnose-kind-render-gap";
import {
  planKindFixIt,
  type FixItViewer,
} from "../react/fixit/fixit-plan";
import { composeLayerSeed } from "../react/fixit/layer-fixit";
import { KindFixItBarView } from "../react/fixit/KindFixItBar";
import { decideFixBadge } from "../react/db-component/KindComponentFixBadge";
import { sandboxTransformKey } from "../react/db-component/KindSandboxFrame";

const ME = "11111111-1111-1111-1111-111111111111";
const OWNER = "22222222-2222-2222-2222-222222222222";
const ORG = "33333333-3333-3333-3333-333333333333";

function diagnosis(over: Partial<KindRenderGapDiagnosis> = {}): KindRenderGapDiagnosis {
  return {
    state: "no_component",
    gaps: listKindRenderGaps({
      registered: true,
      signedIn: true,
      hasSchema: false,
      hasSharedView: false,
      sharedViewOff: false,
      sharedViewEmpty: false,
      kindActive: false,
    }),
    kind: "brand_intake_facts",
    kindDefinitionId: "44444444-4444-4444-4444-444444444444",
    kindLabel: "Brand intake facts",
    kindActive: false,
    kindCreatedBy: OWNER,
    kindOrganizationId: ORG,
    hasCanonicalExample: false,
    emittedJsonSchema: null,
    inactiveComponentId: null,
    inactiveComponentKey: null,
    inactiveComponentCreatedBy: null,
    ...over,
  };
}

const PLAIN: FixItViewer = {
  userId: ME,
  isSuperAdminPerson: false,
  isOrgAdmin: false,
};

const noop = () => undefined;
function render(plan: ReturnType<typeof planKindFixIt>): string {
  return renderToStaticMarkup(
    <KindFixItBarView
      plan={plan}
      busy={false}
      onMakeMine={noop}
      onMakeOrg={noop}
      onOwnerAction={noop}
      onEditLayer={noop}
      onRemoveLayer={noop}
      onUseShared={noop}
    />,
  );
}

describe("the gap ladder", () => {
  it("lists EVERY gap of a kind with several, in ladder order", () => {
    expect(diagnosis().gaps).toEqual(["no_schema", "no_component", "kind_inactive"]);
    const markup = render(planKindFixIt(diagnosis(), PLAIN, null));
    expect(markup).toContain('data-fixit-gap="no_schema"');
    expect(markup).toContain('data-fixit-gap="no_component"');
    expect(markup).toContain('data-fixit-gap="kind_inactive"');
  });

  it("a switched-off shared view and an unregistered name are their own rungs", () => {
    expect(
      listKindRenderGaps({
        registered: true,
        signedIn: true,
        hasSchema: true,
        hasSharedView: true,
        sharedViewOff: true,
        sharedViewEmpty: false,
        kindActive: true,
      }),
    ).toEqual(["component_inactive"]);
    expect(
      listKindRenderGaps({
        registered: false,
        signedIn: true,
        hasSchema: false,
        hasSharedView: false,
        sharedViewOff: false,
        sharedViewEmpty: false,
        kindActive: false,
      }),
    ).toEqual(["unregistered"]);
  });
});

describe("who gets which action", () => {
  it('"Make my view" for a plain user — not the creator, not an admin', () => {
    const plan = planKindFixIt(diagnosis(), PLAIN, null);
    expect(plan.mode).toBe("gaps");
    if (plan.mode !== "gaps") return;
    expect(plan.makeMine).toBe(true);
    expect(plan.makeOrg).toBe(false);
    expect(plan.everyoneHref).toBeNull();
    // Not the owner: no owner repairs on any row.
    expect(plan.rows.every((r) => r.ownerAction === null)).toBe(true);
    expect(render(plan)).toContain("Make my view");
  });

  it('"For my organization" only for an org admin', () => {
    const plan = planKindFixIt(diagnosis(), { ...PLAIN, isOrgAdmin: true }, null);
    expect(plan.mode === "gaps" && plan.makeOrg).toBe(true);
    expect(render(plan)).toContain("For my organization");
    expect(render(planKindFixIt(diagnosis(), PLAIN, null))).not.toContain(
      "For my organization",
    );
  });

  it("the owner gets the per-gap repair on each row", () => {
    const plan = planKindFixIt(diagnosis(), { ...PLAIN, userId: OWNER }, null);
    if (plan.mode !== "gaps") throw new Error("expected gaps");
    expect(plan.rows.map((r) => r.ownerAction)).toEqual([
      "add_schema",
      "build_shared",
      "activate",
    ]);
  });

  it('"Change for everyone" is a LINK to the admin shape page — identity only, no admin power', () => {
    // A super admin on a user page: selectIsSuperAdmin is false (no lane).
    const viewer = { ...PLAIN, isSuperAdminPerson: true };
    const plan = planKindFixIt(diagnosis(), viewer, null);
    if (plan.mode !== "gaps") throw new Error("expected gaps");
    expect(plan.everyoneHref).toBe(
      "/administration/utilities/kind-registry/brand_intake_facts",
    );
    // Identity never grants the owner's repairs here.
    expect(plan.rows.every((r) => r.ownerAction === null)).toBe(true);
    const markup = render(plan);
    expect(markup).toMatch(
      /<a[^>]*href="[^"]*\/administration\/utilities\/kind-registry\/brand_intake_facts"[^>]*target="_blank"[^>]*>|<a[^>]*target="_blank"[^>]*href="[^"]*\/administration\/utilities\/kind-registry\/brand_intake_facts"/,
    );
    expect(markup).toContain("Change for everyone");
  });

  it("the bar never makes an admin-lane request", () => {
    const dir = path.join(__dirname, "../react/fixit");
    for (const file of fs.readdirSync(dir)) {
      const source = fs.readFileSync(path.join(dir, file), "utf8");
      // No admin-lane request and no lane-gated admin POWER: the only admin
      // fact the ladder reads is identity (selectIsSuperAdminPerson), for the link.
      expect({
        file,
        adminLane: /adminLane|admin-lane|withAdminLane|adminDoorOpen/.test(source),
        lanePower: /selectIsSuperAdmin\b(?!Person)|selectAdminLevel|adminLevel/.test(source),
      }).toEqual({ file, adminLane: false, lanePower: false });
    }
  });
});

describe("a layered winner", () => {
  const layer = {
    scope: "user" as const,
    rowId: "55555555-5555-5555-5555-555555555555",
    createdBy: ME,
    updatedAt: "2026-10-14T10:00:00Z",
    sharedUpdatedAt: "2026-10-14T12:00:00Z",
  };

  it("never claims the generic viewer — the My view marker instead", () => {
    const plan = planKindFixIt(diagnosis(), PLAIN, layer);
    expect(plan.mode).toBe("layer");
    const markup = render(plan);
    expect(markup).toContain('data-fixit-mode="layer"');
    expect(markup).toContain("My view");
    expect(markup).not.toContain("data-fixit-gap");
    expect(markup).not.toContain("Make my view");
  });

  it('offers "Use it" when the shared view is newer', () => {
    const plan = planKindFixIt(diagnosis(), PLAIN, layer);
    expect(plan.mode === "layer" && plan.newerShared).toBe(true);
    expect(render(plan)).toContain("Use it");
  });
});

describe("the Fix badge on a layer", () => {
  it("targets the viewer's layer row, never the shared component", () => {
    const answer = decideFixBadge({
      kind: "brand_intake_facts",
      userId: ME,
      isSuperAdminInLane: false,
      createdBy: ME,
      layer: { scope: "user", rowId: "row-1" },
    });
    expect(answer).toEqual({
      canFix: true,
      kind: "brand_intake_facts",
      layer: { scope: "user", rowId: "row-1" },
    });
  });

  it("admin power never applies to someone else's organization layer", () => {
    const answer = decideFixBadge({
      kind: "brand_intake_facts",
      userId: ME,
      isSuperAdminInLane: true,
      createdBy: OWNER,
      layer: { scope: "organization", rowId: "row-2" },
    });
    expect(answer.canFix).toBe(false);
    expect(answer.layer).toBeNull();
  });

  it("the layer seed names the target and the row, in named variables only", () => {
    const seed = composeLayerSeed({
      kind: "brand_intake_facts",
      target: "organization",
      organizationId: ORG,
      registered: true,
      layerRowId: "row-2",
      instance: { company: "Acme" },
    });
    expect(seed.variables.layer_target).toBe("organization");
    expect(seed.variables.layer_organization_id).toBe(ORG);
    expect(seed.variables.layer_component_id).toBe("row-2");
    expect(seed.variables.task_brief).toContain('target "organization"');
    expect(seed.variables.user_data_sample).toContain("Acme");
    // THE USER-INPUT LAW: nothing structured in the composer.
    expect(seed.draftText).not.toContain("Acme");
    expect(seed.draftText).not.toContain(ORG);
  });

  it("an unregistered kind's personal view hands the on-screen sample to get_context", () => {
    const seed = composeLayerSeed({
      kind: "never_registered",
      target: "mine",
      organizationId: ORG,
      registered: false,
      instance: { a: 1 },
    });
    expect(seed.variables.task_brief).toContain('target "mine"');
    expect(seed.variables.task_brief).toContain("kindcomp_get_context");
    expect(seed.variables.task_brief).toContain("sample");
  });
});

describe("review findings from slice 2", () => {
  it("the sandbox transform cache is keyed by row id, not only updated_at", () => {
    const at = "2026-10-14T10:00:00Z";
    expect(sandboxTransformKey("k", { rowId: "mine", updatedAt: at })).not.toBe(
      sandboxTransformKey("k", { rowId: "org", updatedAt: at }),
    );
  });

  it("resolveShared (package 0.25.91) answers the SHARED tier under a layered winner", () => {
    const registry = new ComponentRegistry(getSystemComponentEntries);
    // The resolver only honours an overlay owned by the CURRENT viewer
    // (0.25.89 viewer probe); this registry has no signed-in session.
    (
      registry as unknown as {
        setOverlayViewerProbe?: (probe: () => string | null) => void;
      }
    ).setOverlayViewerProbe?.(() => ME);
    registry.ingestDbRows([
      {
        kind: "layered_kind",
        platform: "web",
        role: "output",
        componentKey: "shared_key",
        source: "db",
        config: {},
        isActive: true,
        componentSource: "export default function C() { return null; }",
        propsTransform: null,
        pinnedKindVersion: null,
        updatedAt: "2026-10-01T00:00:00Z",
        createdBy: OWNER,
        id: "shared-row",
      },
    ]);
    registry.setOverlay({
      viewerId: ME,
      organizationIds: [],
      rows: [
        {
          id: "my-row",
          kind: "layered_kind",
          platform: "web",
          role: "output",
          componentKey: "my_key",
          source: "db",
          config: {},
          isActive: true,
          componentSource: "export default function C() { return null; }",
          propsTransform: null,
          pinnedKindVersion: null,
          updatedAt: "2026-10-02T00:00:00Z",
          createdBy: ME,
          audienceUserId: ME,
          audienceOrganizationId: null,
        },
      ],
    });
    expect(registry.resolve("layered_kind", "web", "output")?.layer?.rowId).toBe("my-row");
    const shared = registry.resolveShared("layered_kind", "web", "output");
    expect(shared?.componentKey).toBe("shared_key");
    expect(shared?.rowId).toBe("shared-row");
    expect(shared?.layer ?? null).toBeNull();
    // The real overlay is untouched by the shared read.
    expect(registry.resolve("layered_kind", "web", "output")?.componentKey).toBe("my_key");
  });

  it("the admin Assets and Gate tabs read the shared tier", () => {
    for (const file of ["KindAssetsTab.tsx", "KindGateTab.tsx"]) {
      const source = fs.readFileSync(path.join(__dirname, "../admin", file), "utf8");
      expect({ file, shared: /resolveSharedComponent\(/.test(source) }).toEqual({ file, shared: true });
      expect({ file, overlayWinner: /\bresolveComponent\(/.test(source) }).toEqual({
        file,
        overlayWinner: false,
      });
    }
  });
});

// ── The clicks: consequence + soft-off + undo, and the launch order. ─────────

import { act } from "react";
import { createRoot } from "react-dom/client";
import { FixItViewActions } from "../react/fixit/KindFixItBar";
import { planKindViewActions } from "../react/fixit/fixit-plan";
import {
  launchLayerBuilder,
  runLayerSwitchOff,
  type LayerSwitchOffDeps,
} from "../react/fixit/fixit-handlers";
import {
  decideLayerFallthrough,
  describeLayerSwitchOff,
  type LayerAudience,
  type LayerFallthrough,
} from "../react/fixit/layer-fixit";

const MINE_AUDIENCE: LayerAudience = { target: "mine", organizationId: null, organizationName: null };
const ORG_AUDIENCE: LayerAudience = {
  target: "organization",
  organizationId: ORG,
  organizationName: "Cedar Ridge Dental",
};

function switchOffDeps(
  audience: LayerAudience,
  answer: boolean,
  fallthrough: LayerFallthrough = "shared",
) {
  const calls: string[] = [];
  let undo: (() => void) | null = null;
  const asked: Array<{ title: string; description: string; confirmLabel: string }> = [];
  const deps: LayerSwitchOffDeps = {
    readLayerAudience: async () => audience,
    readFallthrough: async () => fallthrough,
    confirm: async (options) => {
      asked.push(options);
      return answer;
    },
    switchOff: async (_kind, rowId) => {
      calls.push(`off:${rowId}`);
    },
    switchOn: async (_kind, rowId) => {
      calls.push(`on:${rowId}`);
    },
    announce: (message, onUndo) => {
      calls.push(`announce:${message}`);
      undo = onUndo;
    },
  };
  return { deps, calls, asked, undo: () => undo?.() };
}

async function click(container: HTMLElement, text: string) {
  const button = [...container.querySelectorAll("button")].find((b) => b.textContent?.includes(text));
  if (!button) throw new Error(`no button "${text}"`);
  await act(async () => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

describe("Remove / Use it name their consequence, switch off softly, and undo", () => {
  it("Remove on MY view: asks first, names me, switches off (never deletes), Undo switches it back on", async () => {
    const { deps, calls, asked, undo } = switchOffDeps(MINE_AUDIENCE, true);
    const container = document.createElement("div");
    const root = createRoot(container);
    const plan = planKindViewActions(PLAIN, { scope: "user", rowId: "row-m", createdBy: ME, updatedAt: "2026-10-14T10:00:00Z", sharedUpdatedAt: null }, { slug: "k", registered: true });
    await act(async () => {
      root.render(
        <FixItViewActions
          plan={plan}
          busy={false}
          onMakeMine={noop}
          onMakeOrg={noop}
          onEditLayer={noop}
          onRemoveLayer={(rowId) => void runLayerSwitchOff(deps, { kind: "k", rowId, reason: "remove" })}
          onUseShared={noop}
        />,
      );
    });
    await click(container, "Remove");
    expect(asked[0]).toMatchObject({ title: "Switch off your view?", confirmLabel: "Switch off" });
    expect(asked[0].description).toContain("Only you are affected");
    expect(asked[0].description).toContain("you will see the shared view");
    expect(calls).toEqual(["off:row-m", "announce:Your view is off"]);
    undo();
    expect(calls).toContain("on:row-m");
    act(() => root.unmount());
  });

  it("Remove on an ORGANIZATION view names everyone in that organization", async () => {
    const { deps, asked, calls } = switchOffDeps(ORG_AUDIENCE, true);
    await runLayerSwitchOff(deps, { kind: "k", rowId: "row-o", reason: "remove" });
    expect(asked[0].title).toBe("Switch off Cedar Ridge Dental's view?");
    expect(asked[0].description).toContain("Everyone in Cedar Ridge Dental");
    expect(calls).toContain("announce:Cedar Ridge Dental's view is off");
  });

  it("Use it says it switches my view off; a No changes nothing", async () => {
    const { deps, asked, calls } = switchOffDeps(MINE_AUDIENCE, false);
    const container = document.createElement("div");
    const root = createRoot(container);
    const plan = planKindViewActions(PLAIN, { scope: "user", rowId: "row-m", createdBy: ME, updatedAt: "2026-10-14T10:00:00Z", sharedUpdatedAt: "2026-10-14T12:00:00Z" }, { slug: "k", registered: true });
    await act(async () => {
      root.render(
        <FixItViewActions
          plan={plan}
          busy={false}
          onMakeMine={noop}
          onMakeOrg={noop}
          onEditLayer={noop}
          onRemoveLayer={noop}
          onUseShared={(rowId) => void runLayerSwitchOff(deps, { kind: "k", rowId, reason: "use_shared" })}
        />,
      );
    });
    await click(container, "Use it");
    expect(asked[0].title).toBe("Use the newer shared view?");
    expect(asked[0].description).toContain("switches off your view");
    expect(calls).toEqual([]);
    act(() => root.unmount());
  });
});

describe("the Remove dialog names the MEASURED fall-through and who is affected", () => {
  const SHARED_DB = { resolvedBy: "db", componentKey: "brand_intake_facts_card" } as const;
  const GENERIC = { resolvedBy: "compiled", componentKey: "generic_structured" } as const;

  it("fall-through: an org view beneath a personal view wins, then a shared row, then built-in, else generic", () => {
    const base = { audience: MINE_AUDIENCE, orgViewBeneath: false };
    expect(decideLayerFallthrough({ ...base, orgViewBeneath: true, shared: SHARED_DB })).toBe("organization");
    expect(decideLayerFallthrough({ ...base, shared: SHARED_DB })).toBe("shared");
    expect(decideLayerFallthrough({ ...base, shared: { resolvedBy: "compiled", componentKey: "recipe_card" } })).toBe("builtin");
    expect(decideLayerFallthrough({ ...base, shared: GENERIC })).toBe("generic");
    expect(decideLayerFallthrough({ ...base, shared: null })).toBe("generic");
    // An organization view never falls to another organization view.
    expect(
      decideLayerFallthrough({ audience: ORG_AUDIENCE, orgViewBeneath: true, shared: GENERIC }),
    ).toBe("generic");
  });

  it("never promises a shared view that does not exist", () => {
    const words = describeLayerSwitchOff({ audience: MINE_AUDIENCE, reason: "remove", fallthrough: "generic" });
    expect(words.description).toContain("Only you are affected");
    expect(words.description).toContain("the generic viewer");
    expect(words.description).not.toContain("shared view");
  });

  it("a personal view over an organization view says so", () => {
    const words = describeLayerSwitchOff({ audience: MINE_AUDIENCE, reason: "remove", fallthrough: "organization" });
    expect(words.description).toContain("your organization's view");
  });

  it("an organization view names everyone in it, never 'only you'", () => {
    const words = describeLayerSwitchOff({ audience: ORG_AUDIENCE, reason: "remove", fallthrough: "generic" });
    expect(words.description).toContain("Everyone in Cedar Ridge Dental");
    expect(words.description).not.toContain("Only you");
  });
});

describe("Undo stays reachable after the toast is gone", () => {
  it("a switched-off marker carries Undo, and pressing it calls through once", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    const undone: string[] = [];
    const plan = planKindViewActions(PLAIN, null, { slug: "k", registered: true });
    await act(async () => {
      root.render(
        <FixItViewActions
          plan={plan}
          busy={false}
          onMakeMine={noop}
          onMakeOrg={noop}
          onEditLayer={noop}
          onRemoveLayer={noop}
          onUseShared={noop}
          switchedOff={{ message: "Your view is off" }}
          onUndoSwitchOff={() => undone.push("undo")}
        />,
      );
    });
    expect(container.textContent).toContain("Your view is off");
    await click(container, "Undo");
    expect(undone).toEqual(["undo"]);
    act(() => root.unmount());
  });

  it("with nothing switched off there is no Undo", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    const plan = planKindViewActions(PLAIN, null, { slug: "k", registered: true });
    await act(async () => {
      root.render(
        <FixItViewActions
          plan={plan}
          busy={false}
          onMakeMine={noop}
          onMakeOrg={noop}
          onEditLayer={noop}
          onRemoveLayer={noop}
          onUseShared={noop}
        />,
      );
    });
    expect(container.textContent).not.toContain("Undo");
    act(() => root.unmount());
  });
});

describe("the launch handlers", () => {
  it("waits for the active organization BEFORE opening the builder", async () => {
    let releaseOrg: (id: string) => void = () => undefined;
    const opened: unknown[] = [];
    const pending = launchLayerBuilder(
      {
        ensureOrgId: () => new Promise<string>((resolve) => (releaseOrg = resolve)),
        resolveAgentId: async () => "agent-1",
        readLayerAudience: async () => MINE_AUDIENCE,
        openRun: (options) => opened.push(options),
      },
      { kind: "k", target: "mine", registered: true, instance: { a: 1 }, offer: { kind_slug: "k" } },
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(opened).toHaveLength(0);
    releaseOrg(ORG);
    await pending;
    expect(opened).toHaveLength(1);
    expect(opened[0]).toMatchObject({
      initialAgentId: "agent-1",
      initialVariableValues: { kind_slug: "k", layer_target: "mine" },
    });
  });

  it("Make for my organization carries the active organization; Edit targets the row's own audience", async () => {
    const opened: Array<{ initialVariableValues?: Record<string, string> | null }> = [];
    const deps = {
      ensureOrgId: async () => ORG,
      resolveAgentId: async () => "agent-1",
      readLayerAudience: async () => ({ ...ORG_AUDIENCE, organizationId: "org-of-row" }),
      openRun: (options: { initialVariableValues?: Record<string, string> | null }) => opened.push(options),
    };
    await launchLayerBuilder(deps, { kind: "k", target: "organization", registered: true, instance: {}, offer: {} });
    expect(opened[0].initialVariableValues).toMatchObject({ layer_target: "organization", layer_organization_id: ORG });
    await launchLayerBuilder(deps, { kind: "k", target: "edit", layerRowId: "row-o", registered: true, instance: {}, offer: {} });
    expect(opened[1].initialVariableValues).toMatchObject({
      layer_target: "organization",
      layer_organization_id: "org-of-row",
      layer_component_id: "row-o",
    });
  });

  it("the shape page's actions are the same plan: a plain user who cannot edit gets Make my view", () => {
    const plan = planKindViewActions(PLAIN, null, { slug: "brand_intake_facts", registered: true });
    expect(plan).toEqual({ mode: "actions", makeMine: true, makeOrg: false, everyoneHref: null, orgName: null });
  });
});

it("the shape page's render-status strip renders the SAME per-person actions (no second copy)", () => {
  const strip = fs.readFileSync(
    path.join(__dirname, "../studio/components/ShapeRenderStatusStrip.tsx"),
    "utf8",
  );
  expect(strip).toMatch(/<KindViewActionsRow\b/);
  expect(strip).not.toMatch(/Make my view|For my organization|Change for everyone/);
});

it("the registry reads the shared tier through the package's public resolveShared — never the private overlay", () => {
  const source = fs.readFileSync(path.join(__dirname, "../registry/component-registry.ts"), "utf8");
  expect(source).toMatch(/super\.resolveShared\(/);
  expect(source).not.toMatch(/\boverlay\?: unknown|Object\.create\(this\)/);
});
