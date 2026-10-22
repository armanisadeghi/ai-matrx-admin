"use client";

import { useCallback } from "react";
import { Mic } from "lucide-react";
import { DeviceMenuPanel } from "@ai-matrx/media/voice";
import { useAudioDevices } from "@/features/audio/useAudioDevices";
import { useOpenAudioDevices } from "@/features/overlays/definitions/audioDevices";

export const MIC_SYSTEM_DEFAULT = "__system_default__";

export function useMicDevicePicker() {
  const { inputs, selectedInputId, setInput, requestPermission } =
    useAudioDevices();
  const openSettings = useOpenAudioDevices();

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) void requestPermission();
    },
    [requestPermission],
  );

  const choose = useCallback(
    (deviceId: string) => {
      if (deviceId === MIC_SYSTEM_DEFAULT) {
        setInput("", "");
        return;
      }
      const dev = inputs.find((d) => d.deviceId === deviceId);
      setInput(deviceId, dev?.label ?? "");
    },
    [inputs, setInput],
  );

  const currentValue = selectedInputId || MIC_SYSTEM_DEFAULT;

  return {
    inputs,
    currentValue,
    choose,
    handleOpenChange,
    openSettings,
  };
}

export function MicDeviceMenuPanel({
  onOpenSettings,
}: {
  onOpenSettings: () => void;
}) {
  const { inputs, currentValue, choose } = useMicDevicePicker();

  return (
    <DeviceMenuPanel
      heading="Microphone"
      icon={<Mic className="h-3.5 w-3.5" />}
      devices={inputs}
      selectedId={currentValue === MIC_SYSTEM_DEFAULT ? "" : currentValue}
      defaultLabel="System default"
      fallbackLabel="Microphone"
      onSelect={(deviceId) => choose(deviceId || MIC_SYSTEM_DEFAULT)}
      onOpenSettings={onOpenSettings}
    />
  );
}

/** The canonical compact device popover body (mic, camera and speaker pickers all draw it): the package's. */
export { DeviceMenuPanel, type DeviceMenuPanelProps } from "@ai-matrx/media/voice";
