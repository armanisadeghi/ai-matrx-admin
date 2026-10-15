"use client";

// Starts the config-read recorder once this tab is signed in (lib/config-attestation/recorder.client.ts).
// Renders nothing. Polls cheaply for sign-in because the root layout sits above the Redux provider.
import { useEffect } from "react";
import { startConfigAttestation } from "@/lib/config-attestation/recorder.client";

const RETRY_MS = 5_000;

export function ConfigAttestationBoot() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;
    const attempt = () => {
      void startConfigAttestation()
        .then((done) => {
          if (!done && !stopped) timer = setTimeout(attempt, RETRY_MS);
        })
        .catch((error: unknown) => console.error("[config-attestation] start failed", error));
    };
    attempt();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, []);
  return null;
}
