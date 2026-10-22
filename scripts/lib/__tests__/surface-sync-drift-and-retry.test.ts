/**
 * Release v0.4.3448 (2026-10-22): the post-release surface sync failed for 87 of 271 surfaces
 * on `Cannot find module …/surface-declare` (the shared node_modules was being reinstalled),
 * nothing retried, and the module surfaces never got their parent because no manifest could
 * claim the database root. These tests pin the three halves of the fix with fixtures only.
 */
import { planSurfaceSync } from "@ai-matrx/alchemy/checks";
import { createDeclarationRegistry } from "@ai-matrx/alchemy/declare";
import {
  DATABASE_ROOT_SURFACE,
  driftedSurfaceNames,
  surfaceMetadataFailures,
  withDatabaseRoot,
} from "../surface-sync-check";
import { syncSummaryLines, syncSurfacesWithRetry, type SyncRunResult } from "../surface-sync-runner";

const ORG = "39c38960-d30c-4840-b0c1-c9960de95582";
const value = { name: "status", label: "Status", description: "The status.", valueType: "string" as const, alwaysAvailable: true, typicalCharCount: 20 };
const base = { client: "matrx-user", executionMode: "python-stream" as const, readiness: "partial" as const, values: [value] };

function fixturePlan() {
  const registry = createDeclarationRegistry();
  const declarations = [
    { ...base, surfaceName: "matrx-default/fixture-module", label: "Module", description: "A module.", situation: "In the module.", taxonomyNode: "fixture-module" },
    { ...base, surfaceName: "matrx-user/fixture-page", label: "Page", description: "A page.", inheritsFrom: "matrx-default/fixture-module", situation: "On the page." },
  ];
  for (const d of declarations) registry.register(d);
  const plan = planSurfaceSync(registry.all(), { organizationId: ORG, syncedFrom: "check" });
  return { plan: withDatabaseRoot(plan, declarations), declarations };
}

/** The live row exactly as the plan would write it (no drift). */
const rowFor = (surface: { update: Record<string, unknown> }) => ({ ...surface.update });

describe("drift: a surface column alone is drift (parent, situation, taxonomy)", () => {
  const { plan } = fixturePlan();
  const page = plan.surfaces.find((s) => s.name === "matrx-user/fixture-page")!;
  const mod = plan.surfaces.find((s) => s.name === "matrx-default/fixture-module")!;

  it("a matching row has no drift", () => {
    expect(surfaceMetadataFailures(page, rowFor(page))).toEqual([]);
    expect(surfaceMetadataFailures(mod, rowFor(mod))).toEqual([]);
  });

  it("a pure re-parent (values untouched) is reported", () => {
    expect(surfaceMetadataFailures(page, { ...rowFor(page), parent_surface_name: DATABASE_ROOT_SURFACE })).toEqual([
      "surface matrx-user/fixture-page: parent_surface_name differs",
    ]);
  });

  it("a missing situation and a moved taxonomy node are reported", () => {
    expect(surfaceMetadataFailures(mod, { ...rowFor(mod), situation: null, taxonomy_node_slug: "other" })).toEqual([
      "surface matrx-default/fixture-module: situation differs",
      "surface matrx-default/fixture-module: taxonomy_node_slug differs",
    ]);
  });

  it("a manifest with no inheritsFrom claims the database root, so a NULL parent is drift", () => {
    expect(mod.update.parent_surface_name).toBe(DATABASE_ROOT_SURFACE);
    expect(mod.insert.parent_surface_name).toBe(DATABASE_ROOT_SURFACE);
    expect(surfaceMetadataFailures(mod, { ...rowFor(mod), parent_surface_name: null })).toEqual([
      "surface matrx-default/fixture-module: parent_surface_name differs",
    ]);
    // A declared parent is never replaced by the root.
    expect(page.update.parent_surface_name).toBe("matrx-default/fixture-module");
  });

  it("the root itself is never parented to itself", () => {
    const registry = createDeclarationRegistry();
    const root = { ...base, surfaceName: DATABASE_ROOT_SURFACE, label: "AI Matrx", description: "Root." };
    registry.register(root);
    const p = withDatabaseRoot(planSurfaceSync(registry.all(), { organizationId: ORG, syncedFrom: "check" }), [root]);
    expect(p.surfaces[0]!.update.parent_surface_name).toBeUndefined();
  });

  it("reads the surfaces a --check names for repair", () => {
    const stderr = [
      "FAIL surface matrx-user/notes: parent_surface_name differs",
      "Repair only the affected manifest mirrors, then rerun this check:",
      "  pnpm exec tsx scripts/sync-surface-manifests-direct.ts --surface matrx-user/notes",
      "  pnpm exec tsx scripts/sync-surface-manifests-direct.ts --surface matrx-default/content",
      "  pnpm exec tsx scripts/sync-surface-manifests-direct.ts --surface matrx-user/notes",
    ].join("\n");
    expect(driftedSurfaceNames(stderr)).toEqual(["matrx-user/notes", "matrx-default/content"]);
  });
});

describe("retry: a surface that fails is retried, and a run that still fails says so", () => {
  const ok: SyncRunResult = { status: 0, stdout: "SYNC PASS", stderr: "" };
  const moduleMissing: SyncRunResult = {
    status: 1,
    stdout: "",
    stderr: "Error: Cannot find module '@ai-matrx/chat/surfaces/declare/surface-declare'\nRequire stack: …",
  };
  const realFailure: SyncRunResult = { status: 1, stdout: "", stderr: "FAIL surface matrx-user/broken: missing ui.ui_surface row" };

  it("recovers surfaces that failed while the install moved, and names the one that never synced", async () => {
    const tries = new Map<string, number>();
    const sleeps: number[] = [];
    const run = (args: string[]): SyncRunResult => {
      const name = args[1]!;
      const n = (tries.get(name) ?? 0) + 1;
      tries.set(name, n);
      if (name === "matrx-user/broken") return realFailure;
      if (name === "matrx-user/notes" && n < 3) return moduleMissing;
      if (name === "matrx-user/crm" && n < 2) return moduleMissing;
      return ok;
    };
    const outcome = await syncSurfacesWithRetry(run, ["matrx-user/notes", "matrx-user/crm", "matrx-user/tasks", "matrx-user/broken"], {
      attempts: 3,
      delayMs: 1000,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });
    expect(outcome.synced.sort()).toEqual(["matrx-user/crm", "matrx-user/notes", "matrx-user/tasks"]);
    expect(outcome.recovered.sort()).toEqual(["matrx-user/crm", "matrx-user/notes"]);
    expect(outcome.failed).toEqual([
      { name: "matrx-user/broken", attempts: 3, moduleMissing: false, error: "FAIL surface matrx-user/broken: missing ui.ui_surface row" },
    ]);
    expect(tries.get("matrx-user/tasks")).toBe(1);
    expect(sleeps).toEqual([1000, 2000]);
    const summary = syncSummaryLines(outcome, 4);
    expect(summary[0]).toBe("SURFACE SYNC SUMMARY: 4 drifted · 3 synced (2 on a retry) · 1 FAILED");
    expect(summary.join("\n")).toContain("FAILED matrx-user/broken after 3 tries");
  });

  it("names a module that stayed missing on every try as the install moving", async () => {
    const outcome = await syncSurfacesWithRetry(() => moduleMissing, ["matrx-user/notes"], { attempts: 2, delayMs: 0, sleep: async () => {} });
    expect(outcome.failed[0]!.moduleMissing).toBe(true);
    expect(syncSummaryLines(outcome, 1).join("\n")).toContain("the shared node_modules kept changing");
  });
});
