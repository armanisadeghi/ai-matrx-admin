/**
 * THE OVERLAY REGISTRATION GUARD for `copySubsetWindow`.
 *
 * The overlay-system skill's three steps are catalogue entry → component →
 * controller block + opener. A missing step fails silently at runtime (the
 * dispatch fires, nothing renders). This test pins all three from source so
 * a refactor that drops one is loud in CI, not on Arman's screen.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { APP_OVERLAYS } from "@/features/overlays/definitions/registry";

/** The old catalogue's shape, read from the definitions (the catalogue file is gone). */
const OVERLAYS_BY_ID: Record<string, { label: string; isWindow: boolean; instanceMode: "singleton" | "multi"; closesOnNavigation: boolean }> = Object.fromEntries(
  APP_OVERLAYS.map((d) => [d.id, { label: d.label, isWindow: !!d.window, instanceMode: d.instance === "multi" ? "multi" : "singleton", closesOnNavigation: !!d.closesOnNavigation }]),
);


const ROOT = process.cwd();

describe("copySubsetWindow overlay registration", () => {
  it("is in the catalogue as a multi-instance window", () => {
    expect(OVERLAYS_BY_ID).toHaveProperty("copySubsetWindow");
    const entry = (OVERLAYS_BY_ID as Record<string, unknown>)
      .copySubsetWindow as { instanceMode: string; isWindow: boolean };
    expect(entry.instanceMode).toBe("multi");
    expect(entry.isWindow).toBe(true);
  });

  it("has a definition whose render module renders the window per instance", () => {
    const definition = readFileSync(join(ROOT, "features/overlays/definitions/copySubsetWindow.definition.tsx"), "utf8");
    // Definitions carry no render; the host's generated render map loads it (host-build law).
    const renderMap = readFileSync(join(ROOT, "features/overlays/definitions/render-map.ts"), "utf8");
    expect(renderMap).toContain('copySubsetWindow: () => import("./copySubsetWindow.render")');
    expect(definition).toContain('instance: "multi"');
    const render = readFileSync(join(ROOT, "features/overlays/definitions/copySubsetWindow.render.tsx"), "utf8");
    expect(render).toContain('from "@/components/agent-copy/copy-subset/CopySubsetWindow"');
    expect(render).toContain("instanceId");
  });

  it("keeps the typed opener (hook + controller component) in the opener file", () => {
    const opener = readFileSync(join(ROOT, "features/overlays/definitions/copySubsetWindow.overlay.tsx"), "utf8");
    expect(opener).toContain("export function useOpenCopySubsetWindow");
    expect(opener).toContain("export function CopySubsetWindowController");
    expect(opener).toContain('const OVERLAY_ID = "copySubsetWindow" as const');
    // Rows and callbacks never enter Redux: only the session id travels.
    expect(opener).toContain("registerCopySubsetSession(");
    expect(opener).not.toMatch(/data:\s*\{[^}]*rows/);
  });
});
