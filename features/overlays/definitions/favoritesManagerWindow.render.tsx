"use client";

import FavoritesManagerWindow from "@/features/window-panels/windows/FavoritesManagerWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        if (!isOpen) return null;
        return (
          <FavoritesManagerWindow
            isOpen
            onClose={() =>
              close()
            }
          />
        );
}
