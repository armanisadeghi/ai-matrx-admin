/**
 * Shape layers — the defects the final independent check found (2026-10-14).
 * Each block names the defect; the planted break each one catches is in the
 * assertion's own wording.
 */
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { adminShapePath, planKindFixIt, planKindViewActions, type FixItViewer } from "../react/fixit/fixit-plan";
import { FixItViewActions, KindFixItBarView } from "../react/fixit/KindFixItBar";
import { readOwnInactiveLayerId } from "../react/fixit/layer-fixit";
import { initialBuilderNotes } from "../admin/kind-builder-notes";

const ME = "11111111-1111-1111-1111-111111111111";
const OWNER = "22222222-2222-2222-2222-222222222222";

const PLAIN: FixItViewer = { userId: ME, isSuperAdminPerson: false, isOrgAdmin: false };
const noop = () => undefined;
const SLUG = { slug: "brand_intake_facts", registered: true };

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

const userLayer = {
  scope: "user" as const,
  rowId: "55555555-5555-5555-5555-555555555555",
  createdBy: ME,
  updatedAt: "2026-10-14T10:00:00Z",
  sharedUpdatedAt: null,
};
const orgLayer = { ...userLayer, scope: "organization" as const, createdBy: OWNER };

describe("defect 2: a layered view never takes the other repairs away", () => {
  it("a plain member under an org view keeps Make my view beside the marker", () => {
    const markup = render(planKindFixIt(null, PLAIN, orgLayer, SLUG));
    expect(markup).toContain("My organization&#x27;s view");
    expect(markup).toContain("Make my view");
    expect(markup).not.toContain("For my organization");
    expect(markup).not.toContain("Remove");
  });

  it("a super admin with a view keeps the Change for everyone link", () => {
    const admin: FixItViewer = { ...PLAIN, isSuperAdminPerson: true };
    const markup = render(planKindFixIt(null, admin, userLayer, SLUG));
    expect(markup).toContain("My view");
    expect(markup).toContain("data-fixit-everyone");
    expect(markup).toContain("/administration/utilities/kind-registry/brand_intake_facts");
  });

  it("an org admin under their own view keeps For my organization", () => {
    const orgAdmin: FixItViewer = { ...PLAIN, isOrgAdmin: true };
    const markup = render(planKindFixIt(null, orgAdmin, userLayer, SLUG));
    expect(markup).toContain("For my organization");
    expect(markup).toContain("Remove");
    expect(markup).not.toContain("Make my view");
  });

  it("a person with their own view is not offered a second one", () => {
    expect(render(planKindFixIt(null, PLAIN, userLayer, SLUG))).not.toContain("Make my view");
  });
});

describe('defect 5: "Change for everyone" on an unregistered name carries the slug', () => {
  it("links to the builder with ?kind=<slug>, encoded", () => {
    expect(adminShapePath("my kind/x", false)).toBe(
      "/administration/utilities/kind-registry/build?kind=my%20kind%2Fx",
    );
    expect(adminShapePath("", false)).toBe("/administration/utilities/kind-registry/build");
    expect(adminShapePath("brand_intake_facts", true)).toBe(
      "/administration/utilities/kind-registry/brand_intake_facts",
    );
  });

  it("the layer plan uses the on-screen kind even when there is no diagnosis", () => {
    const admin: FixItViewer = { ...PLAIN, isSuperAdminPerson: true };
    const plan = planKindFixIt(null, admin, userLayer, { slug: "zz_unregistered", registered: false });
    expect(plan.mode === "layer" && plan.everyoneHref).toBe(
      "/administration/utilities/kind-registry/build?kind=zz_unregistered",
    );
  });

  it("the builder pre-fills the slug and its page reads ?kind=", () => {
    expect(initialBuilderNotes("zz_unregistered")).toContain('"zz_unregistered"');
    expect(initialBuilderNotes(null)).toBe("");
    const page = fs.readFileSync(
      path.join(__dirname, "../../../app/(admin)/administration/utilities/kind-registry/build/page.tsx"),
      "utf8",
    );
    expect(page).toMatch(/searchParams/);
    expect(page).toMatch(/initialKind=/);
  });
});

describe("defects 3 + 4: the render-status strip speaks for the SHARED view, on one line", () => {
  const strip = fs.readFileSync(
    path.join(__dirname, "../studio/components/ShapeRenderStatusStrip.tsx"),
    "utf8",
  );

  it("never says 'This shape renders through' beside a personal marker", () => {
    expect(strip).not.toMatch(/This shape renders through/);
    expect(strip).toMatch(/SHARED_VIEW_PREFIX\} \{status\.sourceLabel\}/);
    expect(strip).toMatch(/SHARED_VIEW_PREFIX = "Shared view:"/);
  });

  it("status and Why are one line each; the controls get their own row below", () => {
    expect(strip).toMatch(/className="truncate text-sm font-medium text-foreground"/);
    expect(strip).toMatch(/className="mt-0\.5 truncate text-xs text-muted-foreground"/);
    const actionsRow = strip.indexOf("min-h-7");
    expect(actionsRow).toBeGreaterThan(strip.indexOf("Why: {asClause"));
    expect(actionsRow).toBeLessThan(strip.indexOf("<KindViewActionsRow"));
  });
});

describe("defect 6: a switched-off view is offered back from the DATA, not from memory", () => {
  function fakeClient(rows: Array<{ id: string }>, calls: string[]) {
    const builder: Record<string, unknown> = {};
    for (const method of ["eq", "is", "order", "limit"]) {
      builder[method] = (...args: unknown[]) => {
        calls.push(`${method}:${args.map((a) => JSON.stringify(a)).join(",")}`);
        return method === "limit" ? Promise.resolve({ data: rows, error: null }) : builder;
      };
    }
    return { schema: () => ({ from: () => ({ select: () => builder }) }) };
  }

  it("reads the viewer's own inactive row with an explicit audience predicate", async () => {
    const calls: string[] = [];
    const id = await readOwnInactiveLayerId("zz_kind", ME, fakeClient([{ id: "off-1" }], calls));
    expect(id).toBe("off-1");
    expect(calls).toContain(`eq:"audience_user_id","${ME}"`);
    expect(calls).toContain('eq:"is_active",false');
    expect(calls).toContain('eq:"kind","zz_kind"');
    expect(calls).toContain('is:"deleted_at",null');
  });

  it("is null when the viewer has no switched-off view", async () => {
    expect(await readOwnInactiveLayerId("zz_kind", ME, fakeClient([], []))).toBeNull();
  });

  it("the marker offers Turn on for it (not Undo), and the hook wires the read", () => {
    const markup = renderToStaticMarkup(
      <FixItViewActions
        plan={{ mode: "none" }}
        busy={false}
        onMakeMine={noop}
        onMakeOrg={noop}
        onEditLayer={noop}
        onRemoveLayer={noop}
        onUseShared={noop}
        switchedOff={{ message: "Your view is off", turnOn: true }}
        onUndoSwitchOff={noop}
      />,
    );
    expect(markup).toContain("Your view is off");
    expect(markup).toContain("Turn on");
    expect(markup).not.toContain("Undo");
    const hook = fs.readFileSync(path.join(__dirname, "../react/fixit/useKindViewActions.ts"), "utf8");
    expect(hook).toMatch(/readOwnInactiveLayerId\(input\.kind, viewerKey\)/);
  });
});

describe("defect 1: the Preview verdict re-runs when a view lands or switches off", () => {
  const read = (file: string) => fs.readFileSync(path.join(__dirname, file), "utf8");

  it("passes the registry version INTO the run — a dep the callback never reads is dropped by the compiler", () => {
    const source = read("../render-paths/KindRenderPaths.tsx");
    expect(source).toMatch(/runRenderPath\(pathId, kind, value, undefined, registryVersion\)/);
  });

  it("runRenderPath accepts the version as a documented, intentionally unused memo key", () => {
    const source = read("../render-paths/run-path.ts");
    expect(source).toMatch(/registryVersion\?: number,\s*\): RenderPathRun \| null \{\s*void registryVersion;/);
  });
});

// ── Second review round ──────────────────────────────────────────────────────
import {
  instanceToBuilderText,
  stashBuilderInstance,
  takeBuilderInstance,
  withBuilderHandoff,
} from "../admin/kind-builder-handoff";

describe("round 2, defect 1: the card remounts when the winning view changes", () => {
  const read = (file: string) => fs.readFileSync(path.join(__dirname, file), "utf8");
  it("blocks are keyed by block id AND the resolved view identity", () => {
    const source = read("../render-paths/KindRenderPaths.tsx");
    expect(source).toMatch(/key=\{`\$\{block\.blockId\}:\$\{viewKey\}`\}/);
    expect(read("../studio/shared-view-truth.ts")).toMatch(/layer\?\.rowId \?\? resolution\.componentKey\}@\$\{resolution\.updatedAt/);
  });
});

describe("round 2, defect 2: Turn on stays beside an org view", () => {
  it("only MY OWN winning view hides the data-read Turn on", () => {
    const hook = fs.readFileSync(path.join(__dirname, "../react/fixit/useKindViewActions.ts"), "utf8");
    expect(hook).toMatch(/\?\.scope === "user"\s*:\s*false/);
    expect(hook).toMatch(/switchedOff: layer\?\.scope === "user"/);
  });
  it("the layer marker and the Turn on row render together", () => {
    const markup = renderToStaticMarkup(
      <FixItViewActions
        plan={planKindViewActions(PLAIN, orgLayer, SLUG)}
        busy={false}
        onMakeMine={noop}
        onMakeOrg={noop}
        onEditLayer={noop}
        onRemoveLayer={noop}
        onUseShared={noop}
        switchedOff={{ message: "Your view is off", turnOn: true }}
        onUndoSwitchOff={noop}
      />,
    );
    expect(markup).toContain("My organization&#x27;s view");
    expect(markup).toContain("Your view is off");
    expect(markup).toContain("Turn on");
  });
});

describe("round 2, defect 3: For my organization hides only under the ACTIVE organization's view", () => {
  const ADMIN: FixItViewer = { ...PLAIN, isOrgAdmin: true, activeOrganizationId: "org-active" };
  it("another organization's view keeps it; the active one's does not; unknown hides", () => {
    const own = planKindFixIt(null, ADMIN, { ...orgLayer, organizationId: "org-active" }, SLUG);
    const other = planKindFixIt(null, ADMIN, { ...orgLayer, organizationId: "org-other" }, SLUG);
    const unknown = planKindFixIt(null, ADMIN, { ...orgLayer, organizationId: null }, SLUG);
    expect(own.mode === "layer" && own.makeOrg).toBe(false);
    expect(other.mode === "layer" && other.makeOrg).toBe(true);
    expect(unknown.mode === "layer" && unknown.makeOrg).toBe(false);
  });
});

describe("round 2, defect 4: the fix-it bar and the strip get Turn on from one plan", () => {
  it("the bar passes switchedOff + undo to the same actions view", () => {
    const bar = fs.readFileSync(path.join(__dirname, "../react/fixit/KindFixItBar.tsx"), "utf8");
    expect(bar).toMatch(/switchedOff=\{actions\.switchedOff\}[\s\S]{0,60}onUndoSwitchOff=\{actions\.onUndoSwitchOff\}/);
  });
  it("a gaps plan with a switched-off view renders Turn on beside Make my view", () => {
    const markup = renderToStaticMarkup(
      <KindFixItBarView
        plan={{ mode: "gaps", rows: [], makeMine: true, makeOrg: false, everyoneHref: null }}
        busy={false}
        onMakeMine={noop}
        onMakeOrg={noop}
        onOwnerAction={noop}
        onEditLayer={noop}
        onRemoveLayer={noop}
        onUseShared={noop}
        switchedOff={{ message: "Your view is off", turnOn: true }}
        onUndoSwitchOff={noop}
      />,
    );
    expect(markup).toContain("Turn on");
    expect(markup).toContain("Make my view");
  });
});

describe("round 2, defect 5: the instance rides a nonce, never the URL", () => {
  beforeEach(() => window.localStorage.clear());

  it("parks, reads once, and the URL carries only the nonce", () => {
    const nonce = stashBuilderInstance({ __kind: "x", secret: "payload" }, 1_000);
    expect(nonce).toBeTruthy();
    const href = withBuilderHandoff("/administration/utilities/kind-registry/build?kind=x", nonce as string);
    expect(href).toContain(`handoff=${nonce}`);
    expect(href).not.toContain("payload");
    expect(takeBuilderInstance(nonce, 2_000)).toBe(instanceToBuilderText({ __kind: "x", secret: "payload" }));
    expect(takeBuilderInstance(nonce, 2_000)).toBeNull();
  });

  it("an entry past its lease is refused", () => {
    const nonce = stashBuilderInstance({ a: 1 }, 0) as string;
    expect(takeBuilderInstance(nonce, 11 * 60 * 1000)).toBeNull();
  });

  it("the link click stashes, and the builder box is filled from the nonce", () => {
    const bar = fs.readFileSync(path.join(__dirname, "../react/fixit/KindFixItBar.tsx"), "utf8");
    expect(bar).toMatch(/stashBuilderInstance\(instance\)/);
    const client = fs.readFileSync(path.join(__dirname, "../admin/KindBuilderClient.tsx"), "utf8");
    expect(client).toMatch(/takeBuilderInstance\(handoff\)/);
    expect(client).toMatch(/setStructure\(/);
  });
});

// ── Round 3 ──────────────────────────────────────────────────────────────────
import { composeLayerSeed } from "../react/fixit/layer-fixit";
import { layerMarkerLabel, orgActionLabel } from "../react/fixit/fixit-plan";
import { viewActionItems } from "../react/fixit/KindFixItBar";

const handlers = {
  busy: false,
  onMakeMine: noop,
  onMakeOrg: noop,
  onEditLayer: noop,
  onRemoveLayer: noop,
  onUseShared: noop,
};

describe("round 3, defect 2: the organization is named", () => {
  it("labels For <org>, shortened inside the budget, and falls back when unknown", () => {
    expect(orgActionLabel("Harbor Dental Group")).toBe("For Harbor Dental Group");
    expect(orgActionLabel("A Very Long Organization Name Incorporated").length).toBeLessThanOrEqual(28);
    expect(orgActionLabel(null)).toBe("For my organization");
  });
  it("the marker names its organization only when it is not the active one", () => {
    const admin: FixItViewer = { ...PLAIN, isOrgAdmin: true, activeOrganizationId: "a", activeOrganizationName: "Alpha" };
    const foreign = planKindViewActions(admin, { ...orgLayer, organizationId: "b", organizationName: "Harbor Dental Group" }, SLUG);
    const own = planKindViewActions(admin, { ...orgLayer, organizationId: "a", organizationName: "Alpha" }, SLUG);
    expect(foreign.mode === "layer" && layerMarkerLabel(foreign)).toBe("Harbor Dental Group's view");
    expect(own.mode === "layer" && layerMarkerLabel(own)).toBe("My organization's view");
    const markup = renderToStaticMarkup(<FixItViewActions plan={foreign} {...handlers} />);
    expect(markup).toContain("For Alpha");
  });
});

describe("round 3, defect 3: a switched-off view is edited, never duplicated", () => {
  it("Make my view becomes Edit my view on the existing row id", () => {
    const calls: string[] = [];
    const plan = planKindViewActions(PLAIN, null, SLUG);
    const items = viewActionItems(plan, {
      ...handlers,
      onEditLayer: (id) => calls.push(id),
      switchedOff: { message: "Your view is off", turnOn: true, rowId: "off-row" },
    });
    expect(items.map((i) => i.label)).toEqual(["Edit my view"]);
    items[0].onClick?.();
    expect(calls).toEqual(["off-row"]);
    expect(viewActionItems(plan, handlers).map((i) => i.label)).toEqual(["Make my view"]);
  });
  it("the edit seed tells the agent: one view per person, update by id, switch it back on", () => {
    const seed = composeLayerSeed({ kind: "k", target: "mine", organizationId: "o", registered: true, layerRowId: "off-row", instance: {} });
    expect(seed.variables.task_brief).toContain('component_id "off-row"');
    expect(seed.variables.task_brief).toMatch(/never create a second/);
    expect(seed.variables.task_brief).toMatch(/is_active true/);
  });
});

describe("round 3, defect 1: the busiest strip state is one row", () => {
  it("compact: marker + one primary inline, the rest folded into a menu", () => {
    const admin: FixItViewer = { ...PLAIN, isSuperAdminPerson: true, isOrgAdmin: true, activeOrganizationId: "a", activeOrganizationName: "Alpha" };
    const plan = planKindViewActions(admin, userLayer, SLUG);
    const items = viewActionItems(plan, handlers);
    expect(items.length).toBeGreaterThanOrEqual(4);
    const markup = renderToStaticMarkup(
      <FixItViewActions plan={plan} {...handlers} compact extraActions={[{ key: "b", label: "Build shared view", onClick: noop }]} />,
    );
    expect(markup).toContain("flex-nowrap");
    expect(markup).not.toContain("flex-wrap");
    expect(markup).toContain("More view actions");
    expect(markup).not.toContain("Build shared view");
    expect((markup.match(/<button/g) ?? []).length).toBeLessThanOrEqual(2);
  });
  it("the strip folds Build shared view into the row instead of a second control group", () => {
    const strip = fs.readFileSync(path.join(__dirname, "../studio/components/ShapeRenderStatusStrip.tsx"), "utf8");
    expect(strip).toMatch(/extraActions=\{/);
    expect(strip).not.toMatch(/Build shared view<\/Button>/);
    expect(strip).toMatch(/flex-nowrap items-center overflow-hidden/);
  });
});
