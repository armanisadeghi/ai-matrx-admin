"use client";

import type { FilesystemAdapter } from "@/features/code/adapters/FilesystemAdapter";
import type { ProcessAdapter } from "@/features/code/adapters/ProcessAdapter";
import { CodeWorkspaceWindow } from "@/features/code/host/CodeWorkspaceWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";
import type { ReactNode } from "react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        return (
          <CodeWorkspaceWindow
            key={instanceId}
            onClose={() =>
              close()
            }
            windowInstanceId={
              typeof data?.windowInstanceId === "string"
                ? data.windowInstanceId
                : ""
            }
            title={typeof data?.title === "string" ? data.title : null}
            adapter={data?.adapter as FilesystemAdapter | undefined}
            process={data?.process as ProcessAdapter | undefined}
            rightSlot={data?.rightSlot as ReactNode}
            farRightSlot={data?.farRightSlot as ReactNode}
            hideChat={
              typeof data?.hideChat === "boolean" ? data.hideChat : undefined
            }
            hideHistory={
              typeof data?.hideHistory === "boolean"
                ? data.hideHistory
                : undefined
            }
          />
        );
}
