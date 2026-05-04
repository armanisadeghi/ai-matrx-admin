/**
 * Module registry. Modules call `registerModule(def)` once at app boot via
 * the side-effect `modules/index.ts` import. The registry is a Map; lookup
 * is O(1) by `ModuleId`.
 *
 * The dynamic registration model (vs a static map) lets each module ship its
 * `buildScope` / `parseRun` functions inside its own file, keeping the runtime
 * lazy and the metadata file safe for server-side imports.
 */

import type { ModuleId } from "../types";
import type { ModuleDefinition } from "./types";

const REGISTRY = new Map<ModuleId, ModuleDefinition>();

export function registerModule(def: ModuleDefinition): void {
  if (REGISTRY.has(def.id)) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(
        `[transcript-studio] Module "${def.id}" was registered twice. ` +
          "The second registration overwrites the first.",
      );
    }
  }
  REGISTRY.set(def.id, def);
}

export function getModule(id: ModuleId): ModuleDefinition | null {
  return REGISTRY.get(id) ?? null;
}

export function listModules(): ModuleDefinition[] {
  return Array.from(REGISTRY.values());
}

/** True iff at least one module has registered — used as a boot-readiness check. */
export function hasAnyModule(): boolean {
  return REGISTRY.size > 0;
}
