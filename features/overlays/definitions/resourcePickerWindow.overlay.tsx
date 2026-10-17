"use client";

/**
 * Opener for the `resourcePickerWindow` overlay — the resource picker in a
 * window, opened at one view with the host's own handlers (see
 * `features/overlays/callbacks/resourcePickerWindow.ts`). The overlay owns
 * the callback group's lifetime and disposes it on close.
 */

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { openOverlay } from "@ai-matrx/summon";
import {
  createResourcePickerWindowCallbackGroup,
  type ResourcePickerWindowCallbackGroup,
} from "./callbacks/resourcePickerWindow";
import type { ResourcePickerViewId } from "@/features/resource-manager/resource-picker/resource-picker-menu-items";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { UntypedOverlayWire } from "./overlay-types";

export interface OpenResourcePickerWindowOptions extends ResourcePickerWindowCallbackGroup {
  initialView: Exclude<ResourcePickerViewId, null>;
}

export interface ResourcePickerWindowOverlayData {
  callbackGroupId: string;
  initialView: Exclude<ResourcePickerViewId, null>;
}

export function useOpenResourcePickerWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    ({ initialView, ...group }: OpenResourcePickerWindowOptions) => {
      const { callbackGroupId } = createResourcePickerWindowCallbackGroup(group);
      const data: ResourcePickerWindowOverlayData = { callbackGroupId, initialView };
      dispatch(openOverlay({ overlayId: "resourcePickerWindow", data }));
    },
    [dispatch],
  );
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type ResourcePickerWindowDefinitionData = OpenResourcePickerWindowOptions;

export const resourcePickerWindowOverlay = defineOverlay<ResourcePickerWindowDefinitionData>()({
  id: "resourcePickerWindow",
  label: "Resource Picker Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { lastResourceType: null },
    windowId: "resource-picker-window",
    mobile: "drawer",
    ephemeral: true,
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    resourcePickerWindow: UntypedOverlayWire;
  }
}
