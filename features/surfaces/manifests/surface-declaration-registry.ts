/**
 * THE ONE SURFACE DECLARATION-REGISTRY CONFIG (BUNDLE-3, step 2).
 *
 * The full registry (`registry.ts`: admin, scripts, guards, SSR) and the
 * per-surface body loader (`surface-body-loader.ts`: the browser) resolve
 * manifests through exactly this registry shape — baselines, the table-row
 * baseline item type, the inheritance depth and the agent-roles extension —
 * so a body resolved from its parent chain alone equals the full registry's
 * (`pnpm check:surface-index` proves it surface by surface).
 */
import {
  createDeclarationRegistry,
  DEFAULT_MAX_INHERITANCE_DEPTH,
  TABLE_ROW_ITEM_TYPE,
} from "@ai-matrx/alchemy/declare";
import type { SurfaceManifest } from "@ai-matrx/chat/surfaces/types";
import type { SurfaceBody, SurfaceBodyRecord } from "@ai-matrx/chat/surfaces/runtime/registry";
import { agentRolesExtension } from "@ai-matrx/chat/surfaces/declare/surface-declare";
import { BASELINE_VALUES } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";

/**
 * Most ANCESTORS a surface may have (5): AI Matrx › module › feature › sub-feature, plus the
 * database root `matrx-default/default` (surface declarations D5, Arman 2026-10-22). Equals
 * alchemy's `DEFAULT_MAX_INHERITANCE_DEPTH` (one number, never a second literal); the browser
 * index (`providers/chat-surface-manifests.ts`) is built with that same constant.
 */
export const MAX_INHERITANCE_DEPTH: number = DEFAULT_MAX_INHERITANCE_DEPTH;

export function createSurfaceDeclarationRegistry() {
  const registry = createDeclarationRegistry<SurfaceManifest>({
    baselineValues: Object.values(BASELINE_VALUES),
    // ALC-18 (D4): a canonical table can sit on any screen, so its row is a baseline ITEM type of
    // every surface (`table_row`); `@ai-matrx/context-menu (src/engine/table-row-item.ts)` resolves it.
    baselineItemTypes: [TABLE_ROW_ITEM_TYPE],
    maxInheritanceDepth: MAX_INHERITANCE_DEPTH,
  });
  registry.registerExtension(agentRolesExtension);
  return registry;
}

/** Resolve one surface from its parent chain (ROOT FIRST, the surface last). */
export function resolveSurfaceChain(
  chain: readonly SurfaceManifest[],
): SurfaceBodyRecord | undefined {
  const own = chain[chain.length - 1];
  if (!own) return undefined;
  const registry = createSurfaceDeclarationRegistry();
  for (const manifest of chain) registry.register(manifest);
  const body = registry.get(own.surfaceName) as unknown as SurfaceBody | undefined;
  const raw = registry.getRaw(own.surfaceName);
  return body && raw ? { body, raw } : undefined;
}
