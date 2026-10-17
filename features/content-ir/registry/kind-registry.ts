/**
 * The canonical kind registry — ONE key (the kind slug), many facets — is the PACKAGE's one registry
 * (`packageKindRegistry()` in @ai-matrx/rich-content, a page singleton via Symbol.for). Matrx 2 and
 * this app share it: both make the same `registerKindHost` call (providers/richContentHost.ts here),
 * which fills its database tiers (light catalog warm, per-kind cold fetch, table kinds) from the
 * host's `kindDataClient` / `loadTableKindSource` and installs its invalidation + identity-flush
 * refreshes once per page.
 *
 * This module registers the compiled kinds at import — system-kinds.ts: the package's core kinds
 * (flashcards, quiz, study pack, study notes, lesson scripts) in their place, and this app's own — so speculation
 * and validation work from the first streamed byte in every importer, including suites and code paths
 * that never load the host. The component tier (kind_component rows, layers) stays this app's own
 * (component-registry.ts).
 */
import { setJsonRootKeyLookup } from "@ai-matrx/content-ir";
import {
  packageKindRegistry,
  type PackageKindRegistry,
} from "@ai-matrx/rich-content/kinds/registry/package-kind-registry";
import { SYSTEM_KIND_DEFINITIONS } from "./system-kinds";
import { getSurfaceForJsonRootKey } from "./surface-registry";

// The host owns the surface table; the kernel stays importless. Registered here
// because this module is on the import path of every real parse entry point.
setJsonRootKeyLookup((key) => getSurfaceForJsonRootKey(key)?.kind ?? null);

export type KindRegistry = PackageKindRegistry;

export const kindRegistry: KindRegistry = packageKindRegistry();
kindRegistry.registerDefinitions(SYSTEM_KIND_DEFINITIONS, "override");
// This app has its own kind component tier (component-registry.ts, the generic structured fallback):
// every kind it knows draws here, view or not — never the package's "Open on the web" stand-in.
kindRegistry.setDrawsEveryKnownKind(true);
