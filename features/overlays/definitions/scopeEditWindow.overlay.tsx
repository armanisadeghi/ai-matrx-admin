"use client";

/**
 * Opener for the `scopeEditWindow` overlay — a draggable window panel that
 * creates or edits a single Scope (reusing the shared `ScopeForm` core).
 *
 * - `useOpenScopeEditWindow()` — imperative hook; returns a `close()` handle.
 * - `<ScopeEditWindowController />` — declarative wrapper (mount = open).
 */

import type { ScopeEditWindowData } from "@/features/window-panels/windows/context-scopes/ScopeEditWindow";
import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "scopeEditWindow" as const;

export type OpenScopeEditWindowOptions = ScopeEditWindowData;

export interface ScopeEditWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenScopeEditWindowOptions>(OVERLAY_ID, {
  instanceId: () => undefined,
  data: (opts: OpenScopeEditWindowOptions) => ({
            scopeId: opts.scopeId ?? null,
            scopeTypeId: opts.scopeTypeId,
            organizationId: opts.organizationId,
            parentScopeId: opts.parentScopeId ?? null,
          }),
});

export const useOpenScopeEditWindow = opener.useOpen;

export const ScopeEditWindowController = opener.Controller;

export type ScopeEditWindowDefinitionData = OpenScopeEditWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    scopeEditWindow: OverlayWire<ScopeEditWindowDefinitionData>;
  }
}
