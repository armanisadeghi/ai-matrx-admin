"use client";

/**
 * Opener for audio-DEVICES settings (mic / speaker picker + permission + live
 * input meter + speaker test).
 *
 * Devices and the playback queue now live in ONE unified "Audio" window
 * (`audioControlWindow`) with Player / Devices tabs — so this opener targets
 * that window and selects the Devices tab via overlay `data`. The public API is
 * unchanged so existing callers (MicDeviceMenu, etc.) keep working.
 *
 * - `useOpenAudioDevices()` — imperative hook. Call to open on the Devices tab;
 *   returns a handle with a `close()` method.
 * - `<AudioDevicesController />` — declarative wrapper.
 */

import { useEffect, useMemo } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import type { AppDispatch } from "@/lib/redux/store";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/boot";

const OVERLAY_ID = "audioControlWindow" as const;

export type OpenAudioDevicesOptions = Record<string, never>;

export interface AudioDevicesHandle {
  close: () => void;
}

/**
 * Store-bound opener — the lazy form `useLazyAppOpener("audioControlWindow", …)`
 * loads (ProTextarea's mic menu). `useOpenAudioDevices` is the same opener bound
 * to the hook's dispatch.
 */
export function createAudioDevicesOpener(store: { dispatch: AppDispatch }) {
  const dispatch = store.dispatch;
  return (_opts: OpenAudioDevicesOptions = {}): AudioDevicesHandle => {
    dispatch(
      openOverlay({
        overlayId: OVERLAY_ID,
        // `nonce` forces a re-sync even if the window is already open on the
        // other tab; the unified window reads `data.tab` to select Devices.
        data: { tab: "devices", nonce: Date.now() },
      }),
    );
    return {
      close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
    };
  };
}

export function useOpenAudioDevices() {
  const dispatch = useAppDispatch();
  return useMemo(() => createAudioDevicesOpener({ dispatch }), [dispatch]);
}

export function AudioDevicesController(
  props: OpenAudioDevicesOptions,
): null {
  const open = useOpenAudioDevices();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open]);
  return null;
}
