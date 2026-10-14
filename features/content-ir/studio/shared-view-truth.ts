"use client";

/**
 * THE SHARED ANSWER for a shape, as the shape page's headers read it.
 *
 * "Does this shape have a component?" is a question about the SHARED view —
 * what everyone gets — never about the viewer's own "My view" / "My
 * organization's view" winner (`resolveComponent`). Reading the winner made a
 * person's own view stand in for the shared truth in three places on the shape
 * page (the render-status strip, the owner's activation panel, the Preview
 * verdict).
 *
 * `registryVersion` is unused in the readers' bodies on purpose: it is the
 * React Compiler's memo key (see `readLayerFacts`, commit 492439bc997) — a
 * caller that passes the live version re-reads when the registry's tiers change
 * instead of keeping its first answer.
 */

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  componentRegistry,
  resolveComponent,
  resolveSharedComponent,
  subscribeKindComponents,
} from "@/features/content-ir/registry/component-registry";
import { GENERIC_STRUCTURED_COMPONENT_KEY } from "@/features/content-ir/registry/schema-source-kind-components";

type Resolution = ReturnType<typeof resolveSharedComponent>;

/** The registry's change counter — repaints a caller when its tiers change. */
export function useRegistryVersion(): number {
  return useSyncExternalStore(
    subscribeKindComponents,
    () => componentRegistry.getVersion(),
    () => 0,
  );
}

/** The SHARED tier's answer for the web output role. */
export function readSharedResolution(kind: string, registryVersion?: number): Resolution {
  void registryVersion;
  return resolveSharedComponent(kind, "web", "output");
}

/** Whose view wins for THIS viewer — a personal / organization layer, or none. */
export function readViewerLayerScope(
  kind: string,
  registryVersion?: number,
): "user" | "organization" | null {
  void registryVersion;
  return resolveComponent(kind, "web", "output")?.layer?.scope ?? null;
}

/**
 * The identity of what draws for THIS viewer: the winning row (layered row id,
 * or the shared component key) plus its `updated_at`. A mounted sandbox frame
 * keeps the component it was handed, so a card keyed by this remounts when the
 * winner changes (a view switched off, edited, or turned on).
 */
export function readViewerViewKey(kind: string, registryVersion?: number): string {
  void registryVersion;
  const resolution = resolveComponent(kind, "web", "output");
  if (!resolution) return "none";
  return `${resolution.layer?.rowId ?? resolution.componentKey}@${resolution.updatedAt ?? ""}`;
}

/** True when the shared answer is a real component (generic viewer / none = false). */
export function sharedHasComponent(resolution: Resolution): boolean {
  return resolution !== null && resolution.componentKey !== GENERIC_STRUCTURED_COMPONENT_KEY;
}

/**
 * Measured, never assumed: "checking" until the registry's list has landed,
 * "unknown" when it could not be read, else the shared answer.
 */
export type SharedViewState = "checking" | "unknown" | "component" | "generic";

export function useSharedViewState(kind: string): SharedViewState {
  const version = useRegistryVersion();
  const [warm, setWarm] = useState<"checking" | "ready" | "failed">("checking");
  useEffect(() => {
    let cancelled = false;
    Promise.resolve(componentRegistry.ensureWarm()).then(
      () => {
        if (!cancelled) setWarm("ready");
      },
      () => {
        if (!cancelled) setWarm("failed");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [kind]);
  const resolution = readSharedResolution(kind, version);
  if (warm === "checking") return "checking";
  if (warm === "failed") return "unknown";
  return sharedHasComponent(resolution) ? "component" : "generic";
}

/** The owner's activation panel sentence while the shape is live. */
export function describeLiveRender(state: SharedViewState): string {
  switch (state) {
    case "component":
      return "Renders through its component and can be bound to an agent's output.";
    case "generic":
      return "Renders through the generic viewer. Can be bound to an agent's output.";
    default:
      return "Can be bound to an agent's output.";
  }
}

/** The Preview verdict's headline — what the route returned, against the SHARED truth. */
export function describeRenderVerdict(input: {
  reached: boolean;
  sharedHasComponent: boolean;
  layerScope: "user" | "organization" | null;
}): string {
  if (!input.reached) return "The reader gets the generic key/value view here.";
  if (input.sharedHasComponent) return "This shape's own component rendered.";
  if (input.layerScope === "user") return "Your view rendered. The shared view is the generic viewer.";
  if (input.layerScope === "organization") {
    return "Your organization's view rendered. The shared view is the generic viewer.";
  }
  // No shared component and no layered view of the viewer's: nothing of the
  // shape's own can have drawn it, whatever marker the route carried.
  return "The reader gets the generic key/value view here.";
}

/**
 * The Deactivate dialog's consequence, said first. Deactivating changes BINDING
 * only: the component row's own `is_active` — not the definition's — decides how
 * the shape renders, so it keeps rendering through whatever the SHARED view
 * measured as. Never "falls back to the generic viewer" unless that is the
 * measured answer already.
 */
export function describeDeactivateConsequence(state: SharedViewState): string {
  const rest = "Agents can no longer be bound to emit it. Saved instances are untouched.";
  switch (state) {
    case "component":
      return `It keeps rendering through its component. ${rest}`;
    case "generic":
      return `It keeps rendering through the generic viewer. ${rest}`;
    default:
      return rest;
  }
}
