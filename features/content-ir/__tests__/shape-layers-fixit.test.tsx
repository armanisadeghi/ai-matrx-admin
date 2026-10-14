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
  isSuperAdminInLane: false,
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
      expect({ file, adminLane: /adminLane|admin-lane|withAdminLane|adminDoorOpen/.test(source) }).toEqual({
        file,
        adminLane: false,
      });
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

  it("resolveShared answers the SHARED tier under a layered winner", () => {
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
