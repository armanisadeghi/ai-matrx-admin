"use client";

/**
 * Opener for the `contextItemsWindow` overlay — the Add/Edit/Manage window
 * for a scope type's context items (sidebar list + closeable tabs).
 *
 * - `useOpenContextItemsWindow()` — imperative hook; returns a `close()` handle.
 * - `<ContextItemsWindowController />` — declarative wrapper (mount = open).
 */

import type { ContextItemsWindowData } from "@/features/window-panels/windows/context-scopes/ContextItemsWindow";
import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "contextItemsWindow" as const;

export type OpenContextItemsWindowOptions = ContextItemsWindowData;

export interface ContextItemsWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenContextItemsWindowOptions>(OVERLAY_ID, {
  instanceId: () => undefined,
  data: (opts: OpenContextItemsWindowOptions) => ({
            scopeTypeId: opts.scopeTypeId,
            initialItemId: opts.initialItemId ?? null,
            openNewOnMount: opts.openNewOnMount ?? false,
          }),
});

export const useOpenContextItemsWindow = opener.useOpen;

export const ContextItemsWindowController = opener.Controller;

export type ContextItemsWindowDefinitionData = OpenContextItemsWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    contextItemsWindow: OverlayWire<ContextItemsWindowDefinitionData>;
  }
}
