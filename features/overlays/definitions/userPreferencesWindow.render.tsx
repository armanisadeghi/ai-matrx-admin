"use client";

import SettingsShellOverlay from "@/features/settings/components/SettingsShellOverlay";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsOverlayOpen } from "@ai-matrx/summon";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data, instanceId, close }: OverlayRenderProps) {
  const isOpenById = {
    userPreferences: useAppSelector((s) =>
      selectIsOverlayOpen(s, "userPreferences"),
    ),
  };
  if (isOpenById.userPreferences) return null;
  return (true ? (
        <SettingsShellOverlay />
      ) : null);
}
