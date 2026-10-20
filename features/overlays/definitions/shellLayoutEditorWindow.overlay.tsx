"use client";

/**
 * Opener for the `shellLayoutEditorWindow` overlay — "Edit sidebar…", "Customize header…", "Customize dock…"
 * (custom-experience). `useOpenShellLayoutEditor()({ region, target, organizationId })`.
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */
import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "shellLayoutEditorWindow" as const;

export interface OpenShellLayoutEditorOptions {
  region?: "sidebar" | "header" | "dock" | "look";
  /** `organization` edits the organization's layout (owner/admin); default the person's own. */
  target?: "person" | "organization";
  /** The organization whose layout is edited (target `organization`). */
  organizationId?: string | null;
}

export function useOpenShellLayoutEditor() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenShellLayoutEditorOptions = {}) => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: { region: opts.region ?? "sidebar", target: opts.target ?? "person", organizationId: opts.organizationId ?? null },
        }),
      );
      return { close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })) };
    },
    [dispatch],
  );
}

export type ShellLayoutEditorWindowDefinitionData = Record<string, unknown>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    shellLayoutEditorWindow: OverlayWire<ShellLayoutEditorWindowDefinitionData>;
  }
}
