"use client";

import { useEffect, useState } from "react";

import {
  resolveGoogleWorkspaceConnection,
  type GoogleConnectionRef,
} from "@/features/google-workspace/connection";
import { useOpenGoogleConnectWindow } from "@/features/overlays/openers/googleConnectWindow";

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
export function useGoogleWorkspaceConnection() {
  const [state, setState] = useState<GoogleWorkspaceConnectionState>({ status: "loading" });
  const [nonce, setNonce] = useState(0);
  const openConnect = useOpenGoogleConnectWindow();

  useEffect(() => {
    const controller = new AbortController();
    resolveGoogleWorkspaceConnection(controller.signal)
      .then((connection) => {
        if (controller.signal.aborted) return;
        setState(connection ? { status: "ready", connection } : { status: "none" });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", error: error instanceof Error ? error.message : String(error) });
      });
    return () => controller.abort();
  }, [nonce]);

  const connect = (reason?: string) =>
    openConnect({
      mode: "workspace",
      reason,
      onWindowClose: () => setNonce((n) => n + 1),
    });

  return { state, connect, refresh: () => setNonce((n) => n + 1) };
}
