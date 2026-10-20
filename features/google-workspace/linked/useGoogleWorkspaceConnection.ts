"use client";

import { useStoreRead } from "@/lib/redux/store-reads/useStoreRead";
import {
  resolveGoogleWorkspaceConnection,
  type GoogleConnectionRef,
} from "@/features/google-workspace/connection";
import { useOpenGoogleConnectWindow } from "@/features/overlays/definitions/googleConnectWindow.overlay";

export type GoogleWorkspaceConnectionState =
  | { status: "loading" }
  | { status: "none" }
  | { status: "error"; error: string }
  | { status: "ready"; connection: GoogleConnectionRef };

/**
 * The Google account Docs/Sheets work goes through, plus the one-click connect
 * door. `connect()` re-resolves when the connect window closes, so a card that
 * said "Connect" turns into actions without a reload.
 */
export function useGoogleWorkspaceConnection(active = true) {
  const openConnect = useOpenGoogleConnectWindow();
  // Kept once per tab (a tile waking or remounting renders the kept account and reads nothing); a
  // failed read is not kept. `refresh` is the deliberate re-read after the connect window closes.
  const read = useStoreRead<GoogleConnectionRef | null>(
    "google.workspace.connection",
    () => resolveGoogleWorkspaceConnection(),
    { enabled: active, staleAfterMs: 300_000 },
  );

  const state: GoogleWorkspaceConnectionState = !active
    ? { status: "loading" }
    : read.isError
      ? { status: "error", error: read.error ?? "The Google connection could not be read" }
      : !read.hasData
        ? { status: "loading" }
        : read.data
          ? { status: "ready", connection: read.data }
          : { status: "none" };

  const connect = (reason?: string) =>
    openConnect({
      mode: "workspace",
      reason,
      onWindowClose: () => void read.refresh(),
    });

  return { state, connect, refresh: () => void read.refresh() };
}
