"use client";

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "sandboxManagementWindow" as const;

export interface OpenSandboxManagementWindowOptions {
  /** Sandbox row UUID, never the display-friendly sbx-XXX identifier. */
  sandboxId: string;
  /** A display label for the window title. */
  title?: string;
}

export interface SandboxManagementWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenSandboxManagementWindowOptions>(OVERLAY_ID, {
  data: (opts: OpenSandboxManagementWindowOptions) => ({
            sandboxId: opts.sandboxId,
            title: opts.title ?? null,
          }),
});

export const useOpenSandboxManagementWindow = opener.useOpen;

/** Opens while mounted and closes when the owning view unmounts. */
export const SandboxManagementWindowController = opener.Controller;

export type SandboxManagementWindowDefinitionData = OpenSandboxManagementWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    sandboxManagementWindow: OverlayWire<SandboxManagementWindowDefinitionData>;
  }
}
