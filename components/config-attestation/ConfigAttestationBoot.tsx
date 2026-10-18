"use client";

// Starts the config-read recorder once this tab is signed in (lib/config-attestation/recorder.client.ts).
// Renders nothing. Polls cheaply for sign-in because the root layout sits above the Redux provider.
// LATE TIER (owner rule, 2026-10-16): telemetry nobody waits for starts only after the page has
// fully settled AND been engaged (lib/boot/engagedLate, 2026-10-17). Config reads made before then wait in the ledger's capped
// pre-attach queue (lib/config-attestation/readLedger.ts), so nothing is lost by waiting.
import { useEffect } from "react";
import { whenEngagedLate } from "@/lib/boot/engagedLate";
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
    const controller = new AbortController();
    void whenEngagedLate(undefined, controller.signal).then((ok) => {
      if (ok && !stopped) {
        performance.mark("load:lazy:config attestation"); // LOAD MARKER (lazy) — page-load trace, no import
        attempt();
      }
    });
    return () => {
      stopped = true;
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, []);
  return null;
}
