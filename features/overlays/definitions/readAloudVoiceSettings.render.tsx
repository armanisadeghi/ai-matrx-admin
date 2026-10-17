"use client";

import ReadAloudVoiceSettingsWindow from "@ai-matrx/chat/window-panels/windows/listen/ReadAloudVoiceSettingsWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ close }: OverlayRenderProps) {
  return <ReadAloudVoiceSettingsWindow isOpen onClose={() => close()} />;
}
