"use client";

/**
 * Opener for the `resourcePickerWindow` overlay — the resource picker in a
 * window, opened at one view with the host's own handlers (see
 * `features/overlays/callbacks/resourcePickerWindow.ts`). The overlay owns
 * the callback group's lifetime and disposes it on close.
 */

import { useMemo } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import type { AppDispatch } from "@/lib/redux/store";
import {
  createResourcePickerWindowCallbackGroup,
  type ResourcePickerWindowCallbackGroup,
} from "./callbacks/resourcePickerWindow";
import type { ResourcePickerViewId } from "@/features/resource-manager/resource-picker/resource-picker-menu-items";
import type { UntypedOverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";

const opener = createOpener<object>("resourcePickerWindow");

export interface OpenResourcePickerWindowOptions extends ResourcePickerWindowCallbackGroup {
  initialView: Exclude<ResourcePickerViewId, null>;
}

export interface ResourcePickerWindowOverlayData {
  callbackGroupId: string;
  initialView: Exclude<ResourcePickerViewId, null>;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createResourcePickerWindowOpener(store: { dispatch: AppDispatch }) {
  const dispatch = store.dispatch;
  return ({ initialView, ...group }: OpenResourcePickerWindowOptions) => {
    const { callbackGroupId } = createResourcePickerWindowCallbackGroup(group);
    const data: ResourcePickerWindowOverlayData = { callbackGroupId, initialView };
    opener.open(dispatch, { data });
  };
}

export function useOpenResourcePickerWindow() {
  const dispatch = useAppDispatch();
  return useMemo(() => createResourcePickerWindowOpener({ dispatch }), [dispatch]);
}

export type ResourcePickerWindowDefinitionData = OpenResourcePickerWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    resourcePickerWindow: UntypedOverlayWire;
  }
}
