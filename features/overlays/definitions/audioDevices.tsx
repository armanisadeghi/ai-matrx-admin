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

import { appOpener } from "./app-opener";

const OVERLAY_ID = "audioControlWindow" as const;

export type OpenAudioDevicesOptions = Record<string, never>;

export interface AudioDevicesHandle {
  close: () => void;
}

// `nonce` forces a re-sync even if the window is already open on the other tab; the unified window reads
// `data.tab` to select Devices.
const opener = appOpener<OpenAudioDevicesOptions>(OVERLAY_ID, {
  data: () => ({ tab: "devices", nonce: Date.now() }),
});

export const useOpenAudioDevices = opener.useOpen;
/** Plain opener of the store, for boot-graph callers (ProTextarea, via useLazyAppOpener). */
export const createAudioDevicesOpener = opener.forStore;
export const AudioDevicesController = opener.Controller;
