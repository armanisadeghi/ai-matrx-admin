"use client";

/**
 * `lazyToolRenderer(name)` — a component field for a tool-renderer registration that loads from
 * THE ONE implementation module (`./toolRendererImpls`) the first time a tool result draws.
 *
 * Registration stays synchronous (the registry is not reactive): the descriptor is static and
 * only its component is lazy. Every name shares one `import()` of one module, so the registry has
 * exactly ONE async edge (code-splitting rule 3). While the chunk loads, the result's place shows
 * a rows skeleton — never a blank. `clientLazy` carries its own Suspense; no boundary is added.
 */

import type { ComponentProps, ComponentType } from "react";
import { clientLazy } from "@ai-matrx/kit/client-lazy";
import { RegionSkeleton } from "@ai-matrx/design-system/controls";

type ToolRendererImpls = typeof import("./toolRendererImpls");
export type ToolRendererImplName = keyof ToolRendererImpls;
type ImplProps<K extends ToolRendererImplName> = ComponentProps<ToolRendererImpls[K]>;

/** What a tool result shows while its renderer's chunk loads. */
export function ToolResultLoading() {
  return <RegionSkeleton shape="rows" count={3} aria-label="Loading the result" />;
}

const loadToolRendererImpls = (): Promise<ToolRendererImpls> => import("./toolRendererImpls");

export function lazyToolRenderer<K extends ToolRendererImplName>(
  name: K,
  loading: ComponentType = ToolResultLoading,
): ComponentType<ImplProps<K>> {
  const Lazy = clientLazy<ImplProps<K>>(
    async () => {
      const impls = await loadToolRendererImpls();
      // Each export of the impl module is a component taking exactly `ImplProps<K>`.
      return impls[name] as ComponentType<ImplProps<K>>;
    },
    { loading },
  );
  Lazy.displayName = `Lazy(${String(name)})`;
  return Lazy;
}
