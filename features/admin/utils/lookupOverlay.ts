// features/admin/utils/lookupOverlay.ts
//
// Lookup helpers used by `<FeatureAdminPage>` to resolve human-readable
// metadata from the registries when rendering window-panel and overlay
// sections. The feature-admin config supplies an `overlayId`; this
// helper attaches the registry label, kind, instance mode, etc.
//
// Pure read-only — these helpers do not register anything.

import type { MobilePresentation } from "@ai-matrx/summon/open";
// The plain metadata index, never the registry: FeatureAdminPage is a server component and the
// definitions are client modules.
import { OVERLAY_META_INDEX, type OverlayMetaRow } from "@/features/overlays/definitions/overlay-meta-index";

type AppOverlay = OverlayMetaRow;

export interface ResolvedWindowPanel {
  overlayId: string;
  slug: string | null;
  label: string;
  kind: "window" | "overlay";
  instanceMode: "singleton" | "multi";
  mobilePresentation: MobilePresentation | undefined;
  deprecated?: { replacement?: string; reason?: string };
}

const find = (overlayId: string): AppOverlay | undefined => OVERLAY_META_INDEX.find((d) => d.id === overlayId);
const windowSlug = (d: AppOverlay): string => d.window?.windowId ?? d.id;

export function resolveWindowPanel(overlayId: string): ResolvedWindowPanel | null {
  const d = find(overlayId);
  if (!d?.window) return null;
  return {
    overlayId,
    slug: windowSlug(d),
    label: d.label,
    kind: "window",
    instanceMode: d.instance === "multi" ? "multi" : "singleton",
    mobilePresentation: d.window.mobile,
    deprecated: d.window.deprecated,
  };
}

export interface ResolvedOverlay {
  overlayId: string;
  label: string;
  instanceMode: "singleton" | "multi";
  isWindow: boolean;
}

export function resolveOverlay(overlayId: string): ResolvedOverlay | null {
  const d = find(overlayId);
  if (!d) return null;
  return { overlayId, label: d.label, instanceMode: d.instance === "multi" ? "multi" : "singleton", isWindow: !!d.window };
}

export function findWindowPanelsBySlugPrefix(prefix: string): ResolvedWindowPanel[] {
  return OVERLAY_META_INDEX.filter((d) => d.window && windowSlug(d).startsWith(prefix))
    .map((d) => resolveWindowPanel(d.id))
    .filter((r): r is ResolvedWindowPanel => r !== null);
}
