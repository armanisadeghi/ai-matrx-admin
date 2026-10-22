"use client";

/**
 * Opener for the `googleConnectWindow` overlay.
 *
 * Call this from ANYWHERE the user runs into Google and has not connected it —
 * the resource picker, a connector strip under the input, an export menu. The
 * window comes up over the page instead of sending them to settings, which is
 * the whole point of it existing.
 */

import { useMemo } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import type { AppDispatch } from "@/lib/redux/store";
import {
  createGoogleConnectCallbackGroup,
  type GoogleConnectWindowHandlers,
} from "./callbacks/googleConnectWindow";
import type { OverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";

const OVERLAY_ID = "googleConnectWindow" as const;
const opener = createOpener<object>(OVERLAY_ID);

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

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createGoogleConnectWindowOpener(store: { dispatch: AppDispatch }) {
  const dispatch = store.dispatch;
  return (options?: OpenGoogleConnectOptions): GoogleConnectWindowHandle => {
    const callbacks =
      options?.onDriveImported || options?.onWindowClose
        ? createGoogleConnectCallbackGroup({
            onDriveImported: options.onDriveImported,
            onWindowClose: options.onWindowClose,
          })
        : null;
    opener.open(dispatch, { data: {
          reason: options?.reason ?? null,
          mode: options?.mode ?? "workspace",
          initialConnectionId: options?.initialConnectionId ?? null,
          importDestinationFolderPath:
            options?.importDestinationFolderPath ?? null,
          accept: options?.accept ?? null,
          multiple: options?.multiple ?? true,
          callbackGroupId: callbacks?.callbackGroupId ?? null,
        } });
    const dispose = () => {
      callbacks?.dispose();
    };
    return {
      close: () => {
        dispatch(opener.close());
        dispose();
      },
      dispose,
    };
  };
}

export function useOpenGoogleConnectWindow() {
  const dispatch = useAppDispatch();
  return useMemo(() => createGoogleConnectWindowOpener({ dispatch }), [dispatch]);
}

export type GoogleConnectWindowDefinitionData = OpenGoogleConnectOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    googleConnectWindow: OverlayWire<GoogleConnectWindowDefinitionData>;
  }
}
