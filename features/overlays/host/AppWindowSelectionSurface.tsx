"use client";

import type { ReactNode } from "react";
import { useContentTransferSurface } from "@ai-matrx/alchemy/react/workspace";
import { NonEditableContextMenu } from "@ai-matrx/context-menu/react";

/** Every window body sits inside the app's right-click menu for read-only content. */
export function AppWindowSelectionSurface({ children }: { children: ReactNode }) {
  const surfaceName = useContentTransferSurface()?.surfaceName ?? undefined;
  return (
    <NonEditableContextMenu sourceFeature="system" surfaceName={surfaceName}>
      <div className="contents" data-window-selection-surface="">
        {children}
      </div>
    </NonEditableContextMenu>
  );
}
