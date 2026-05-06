"use client";

import { assertLazyLoaded } from "./utils/lazy-bundle-guard";
assertLazyLoaded("features/window-panels/OverlaySurface.tsx");

/**
 * OverlaySurface — renders one registry entry.
 *
 * Subscribes to only that entry's overlay state and lazy-loads the component
 * via `entry.componentImport()`. Handles both singleton and multi-instance
 * modes. Stable module references via a module-level lazy cache — a reopened
 * overlay does not re-fetch its chunk.
 *
 * Prop flow: the resolved component receives `isOpen={true}` plus `onClose`
 * plus the overlay's data spread as individual props, with `entry.defaultData`
 * as a fallback layer underneath. This matches what the legacy OverlayController
 * does inline per window, except the prop-name-to-data-key mapping is now the
 * responsibility of each window component (by convention, window components
 * already accept props named after their `defaultData` keys).
 *
 * Kind handling (Phase 2a — desktop only):
 * - "window" → component mounts <WindowPanel> internally; this surface just
 *   wires state. Mobile routing to drawer/card surfaces comes in Phase 5.
 * - "widget" | "sheet" | "modal" → component owns its own portal/positioning;
 *   we render it identically.
 */
import { lazy, memo, Suspense, useMemo, type ComponentType } from "react";
import {
  getRegistryEntryByOverlayId,
  type WindowRegistryEntry,
} from "@/features/window-panels/registry/windowRegistry";
import {
  useCloseOverlay,
  useOverlayData,
  useOverlayInstances,
  useOverlayOpen,
} from "@/features/window-panels/hooks/useOverlay";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentType<any>;

// Module-level cache so a given overlayId resolves to the same React.lazy
// reference across re-renders — preserves Suspense boundary state and avoids
// re-fetching the chunk when the overlay is reopened.
const LAZY_CACHE = new Map<string, AnyComponent>();

function getLazyComponent(entry: WindowRegistryEntry): AnyComponent {
  const cached = LAZY_CACHE.get(entry.overlayId);
  if (cached) return cached;
  const Component = lazy(entry.componentImport);
  LAZY_CACHE.set(entry.overlayId, Component);
  return Component;
}

interface SurfaceProps {
  overlayId: string;
}

function SingletonSurface({ overlayId }: SurfaceProps) {
  const entry = getRegistryEntryByOverlayId(overlayId);
  const isOpen = useOverlayOpen(overlayId);
  const data = useOverlayData<Record<string, unknown>>(overlayId);
  const onClose = useCloseOverlay(overlayId);

  const mergedProps = useMemo(
    () => ({
      ...(entry?.defaultData ?? {}),
      ...(data ?? {}),
    }),
    [entry, data],
  );

  if (!entry || !isOpen) return null;
  const Component = getLazyComponent(entry);

  return (
    <Suspense fallback={null}>
      <Component isOpen={true} onClose={onClose} {...mergedProps} />
    </Suspense>
  );
}

function InstancedSurface({ overlayId }: SurfaceProps) {
  const entry = getRegistryEntryByOverlayId(overlayId);
  const instances = useOverlayInstances<Record<string, unknown>>(overlayId);

  if (!entry || instances.length === 0) return null;
  const Component = getLazyComponent(entry);
  const defaults = entry.defaultData ?? {};

  return (
    <Suspense fallback={null}>
      {instances.map((inst) => (
        <InstanceChild
          key={inst.instanceId}
          overlayId={overlayId}
          instanceId={inst.instanceId}
          Component={Component}
          defaults={defaults}
          data={inst.data}
        />
      ))}
    </Suspense>
  );
}

function InstanceChild({
  overlayId,
  instanceId,
  Component,
  defaults,
  data,
}: {
  overlayId: string;
  instanceId: string;
  Component: AnyComponent;
  defaults: Record<string, unknown>;
  data: Record<string, unknown> | null;
}) {
  const onClose = useCloseOverlay(overlayId, instanceId);
  const merged = useMemo(
    () => ({ ...defaults, ...(data ?? {}) }),
    [defaults, data],
  );
  return (
    <Component
      isOpen={true}
      instanceId={instanceId}
      onClose={onClose}
      {...merged}
    />
  );
}

export const OverlaySurface = memo(function OverlaySurface({
  overlayId,
}: SurfaceProps) {
  const entry = getRegistryEntryByOverlayId(overlayId);
  if (!entry) return null;
  if (entry.instanceMode === "multi") {
    return <InstancedSurface overlayId={overlayId} />;
  }
  return <SingletonSurface overlayId={overlayId} />;
});
