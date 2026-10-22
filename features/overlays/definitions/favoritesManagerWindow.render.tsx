"use client";

import FavoritesManagerWindow from "@/features/window-panels/windows/FavoritesManagerWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data, instanceId, close }: OverlayRenderProps) {

        return (
          <FavoritesManagerWindow
            isOpen
            onClose={() =>
              close()
            }
          />
        );
}
