/**
 * KIND COMPONENT TIER GUARD. The (kind, platform, role) -> component resolver, its database loaders,
 * the viewer's layer overlay and the session-ready barrier live in @ai-matrx/rich-content (one tier
 * the web and Matrx 2 share, behind registerKindHost). This app passes its session barrier as
 * `sessionReady`; its own component-registry / schema-source-kind-components / kind-component-layers /
 * system-components files are re-exports of the package.
 *
 * Census: every kind the web knew before the move (fixtures/kind-component-census.before.json, captured
 * on the old wiring) resolves its output / input component exactly as before.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import "@/providers/richContentHost";
import { kindRegistry } from "@/features/content-ir/registry/kind-registry";
import { componentRegistry } from "@/features/content-ir/registry/component-registry";
import { hostCapability } from "@ai-matrx/rich-content/host";
import { packageComponentRegistry } from "@ai-matrx/rich-content/kinds/registry/component-registry";
import { bareSessionReady } from "@ai-matrx/rich-content/kinds/registry/kind-session-ready";

const FIXTURE = path.join(__dirname, "fixtures/kind-component-census.before.json");

function census() {
  const out: Record<string, unknown> = {};
  const kinds = kindRegistry.listDefinitions().map((d) => d.kind).sort();
  for (const kind of kinds) {
    const row: Record<string, unknown> = {};
    for (const role of ["output", "input", "loading"] as const) {
      const r = componentRegistry.resolve(kind, "web", role);
      row[role] = r ? `${r.resolvedBy}:${r.source}:${r.componentKey}:${r.isActive}` : null;
    }
    out[kind] = row;
  }
  return out;
}

describe("the kind component tier is the package's", () => {
  it("this app's componentRegistry IS the package registry, and it is the host's", () => {
    expect(componentRegistry).toBe(packageComponentRegistry());
    // The app registers no componentRegistry of its own: registerKindHost installs the package's.
    // (This jest harness pre-registers a late proxy over the same instance for tests that skip the host.)
    const host = readFileSync(path.join(__dirname, "../../../providers/richContentHost.ts"), "utf8");
    expect(host).not.toMatch(/\bcomponentRegistry\b/);
    expect(host).toMatch(/sessionReady:/);
  });

  it("this app passes its session barrier as sessionReady (never the bare timer default)", () => {
    const ready = hostCapability("sessionReady" as never) as { hasSession(): boolean; whenSessionReady(l: () => void): () => void } | undefined;
    expect(ready).toBeDefined();
    expect(ready).not.toBe(bareSessionReady);
    expect(typeof ready!.hasSession()).toBe("boolean");
    expect(hostCapability("kindViewerOrganizations" as never)).toBeDefined();
  });

  it("every kind resolves its components exactly as before the move", () => {
    const now = census();
    if (process.env.CAPTURE_KIND_COMPONENT_CENSUS === "1") {
      writeFileSync(FIXTURE, JSON.stringify({ count: Object.keys(now).length, kinds: now }, null, 2) + "\n");
    }
    expect(existsSync(FIXTURE)).toBe(true);
    const before = JSON.parse(readFileSync(FIXTURE, "utf8")) as { count: number; kinds: Record<string, unknown> };
    const drifted = Object.keys(before.kinds).filter((k) => JSON.stringify(now[k]) !== JSON.stringify(before.kinds[k]))
      .map((k) => `${k}: ${JSON.stringify(before.kinds[k])} -> ${JSON.stringify(now[k])}`);
    expect(drifted).toEqual([]);
  });
});
