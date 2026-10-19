"use client";

/**
 * Opener for the `resourcePickerWindow` overlay — the resource picker in a
 * window, opened at one view with the host's own handlers (see
 * `features/overlays/callbacks/resourcePickerWindow.ts`). The overlay owns
 * the callback group's lifetime and disposes it on close.
 */

import { useMemo } from "react";
import { useAppStore } from "@/lib/redux/hooks";
import type { AppStore } from "@/lib/redux/store";
import { openOverlay } from "@ai-matrx/summon/open";
import {
  createResourcePickerWindowCallbackGroup,
  type ResourcePickerWindowCallbackGroup,
} from "./callbacks/resourcePickerWindow";
import type { ResourcePickerViewId } from "@/features/resource-manager/resource-picker/resource-picker-menu-items";
import type { UntypedOverlayWire } from "./overlay-types";

export interface OpenResourcePickerWindowOptions extends ResourcePickerWindowCallbackGroup {
  initialView: Exclude<ResourcePickerViewId, null>;
}

export interface ResourcePickerWindowOverlayData {
  callbackGroupId: string;
  initialView: Exclude<ResourcePickerViewId, null>;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createResourcePickerWindowOpener(store: Pick<AppStore, "dispatch">) {
  const dispatch = store.dispatch;
  return ({ initialView, ...group }: OpenResourcePickerWindowOptions) => {
    const { callbackGroupId } = createResourcePickerWindowCallbackGroup(group);
    const data: ResourcePickerWindowOverlayData = { callbackGroupId, initialView };
    dispatch(openOverlay({ overlayId: "resourcePickerWindow", data }));
  };
}

export function useOpenResourcePickerWindow() {
  const store = useAppStore();
  return useMemo(() => createResourcePickerWindowOpener(store), [store]);
}

export type ResourcePickerWindowDefinitionData = OpenResourcePickerWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    resourcePickerWindow: UntypedOverlayWire;
  }
}
