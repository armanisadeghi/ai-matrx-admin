"use client";

import AudioControlWindow from "@/features/window-panels/windows/AudioControlWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data, instanceId, close }: OverlayRenderProps) {

        return (
          <AudioControlWindow
            isOpen
            onClose={() =>
              close()
            }
          />
        );
}
