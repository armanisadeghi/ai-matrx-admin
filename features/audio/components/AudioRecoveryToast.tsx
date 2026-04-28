/**
 * Audio Recovery Toast — thin client shell.
 *
 * Triggers the IndexedDB scan via `initialize()` (cheap) and gates on
 * `hasRecoveredData`. Returns `null` for the ~99% of mounts where no
 * orphaned recordings exist. The toast body — motion/react animations,
 * lucide icons, AudioRecoveryModal and its tree — lives in
 * `AudioRecoveryToastImpl.tsx` and only fetches its chunk after a real
 * recovery event.
 */

"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useAudioRecovery } from "../providers/AudioRecoveryProvider";

const AudioRecoveryToastImpl = dynamic(
  () => import("./AudioRecoveryToastImpl"),
  { ssr: false, loading: () => null },
);

export function AudioRecoveryToast() {
  const { hasRecoveredData, initialize } = useAudioRecovery();
  useEffect(() => {
    initialize();
  }, [initialize]);
  if (!hasRecoveredData) return null;
  return <AudioRecoveryToastImpl />;
}
