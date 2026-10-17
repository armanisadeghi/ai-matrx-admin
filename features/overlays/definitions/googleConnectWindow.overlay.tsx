"use client";

/**
 * Opener for the `googleConnectWindow` overlay.
 *
 * Call this from ANYWHERE the user runs into Google and has not connected it —
 * the resource picker, a connector strip under the input, an export menu. The
 * window comes up over the page instead of sending them to settings, which is
 * the whole point of it existing.
 */

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import {
  createGoogleConnectCallbackGroup,
  type GoogleConnectWindowHandlers,
} from "./callbacks/googleConnectWindow";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "googleConnectWindow" as const;

export interface OpenGoogleConnectOptions extends GoogleConnectWindowHandlers {
  /** One line saying why, e.g. "to attach a doc to this message". */
  reason?: string;
  /** Workspace keeps live Docs/Sheets; import returns ordinary browser Files. */
  mode?: "overview" | "workspace" | "drive-import";
  /** Seed the account chooser from the invoking Google surface. */
  initialConnectionId?: string;
  /** Logical Matrx Files folder used by the canonical provider import. */
  importDestinationFolderPath?: string;
  accept?: string;
  multiple?: boolean;
}

export interface GoogleConnectWindowHandle {
  close: () => void;
  dispose: () => void;
}

export function useOpenGoogleConnectWindow() {
  const dispatch = useAppDispatch();

  return useCallback(
    (options?: OpenGoogleConnectOptions): GoogleConnectWindowHandle => {
      const callbacks =
        options?.onDriveImported || options?.onWindowClose
          ? createGoogleConnectCallbackGroup({
              onDriveImported: options.onDriveImported,
              onWindowClose: options.onWindowClose,
            })
          : null;
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            reason: options?.reason ?? null,
            mode: options?.mode ?? "workspace",
            initialConnectionId: options?.initialConnectionId ?? null,
            importDestinationFolderPath:
              options?.importDestinationFolderPath ?? null,
            accept: options?.accept ?? null,
            multiple: options?.multiple ?? true,
            callbackGroupId: callbacks?.callbackGroupId ?? null,
          },
        }),
      );
      const dispose = () => {
        callbacks?.dispose();
      };
      return {
        close: () => {
          dispatch(closeOverlay({ overlayId: OVERLAY_ID }));
          dispose();
        },
        dispose,
      };
    },
    [dispatch],
  );
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type GoogleConnectWindowDefinitionData = OpenGoogleConnectOptions;

export const googleConnectWindowOverlay = defineOverlay<GoogleConnectWindowDefinitionData>()({
  id: "googleConnectWindow",
  label: "Connect Google",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { reason: null },
    windowId: "google-connect-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
  link: {
    key: "google_connect",
    hydrate: (ctx) => import("./googleConnectWindow.link").then((m) => m.hydrate(ctx)),
  },
  render: () => import("./googleConnectWindow.render"),
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    googleConnectWindow: OverlayWire<GoogleConnectWindowDefinitionData>;
  }
}
