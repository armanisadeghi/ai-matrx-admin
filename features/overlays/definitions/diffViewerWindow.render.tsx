"use client";

// The compare window's body is the chat package's (one body on the web and Matrx 2).
import DiffViewerWindow from "@ai-matrx/chat/window-panels/windows/diff/DiffViewerWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {
  const data = overlayData as Record<string, unknown> | null | undefined;
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  return (
    <DiffViewerWindow
      key={instanceId}
      windowInstanceId={str(data?.windowInstanceId) ?? instanceId}
      onClose={() => close()}
      original={str(data?.original) ?? ""}
      modified={str(data?.modified) ?? ""}
      originalLabel={str(data?.originalLabel)}
      modifiedLabel={str(data?.modifiedLabel)}
      title={str(data?.title) ?? null}
      engine={data?.engine === "light" || data?.engine === "monaco" || data?.engine === "auto" ? data.engine : "auto"}
      language={str(data?.language)}
      defaultView={data?.defaultView === "inline" || data?.defaultView === "highlight" ? data.defaultView : "split"}
    />
  );
}
