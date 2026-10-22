"use client";

import ShellLayoutEditorWindow from "@/features/window-panels/windows/shell-layout/ShellLayoutEditorWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data, instanceId, close }: OverlayRenderProps) {
  const d = (data ?? {}) as Record<string, unknown>;
  const region = d.region === "header" || d.region === "dock" ? d.region : "sidebar";
  const target = d.target === "organization" ? "organization" : "person";
  return (
    <ShellLayoutEditorWindow
      key={instanceId}
      instanceId={instanceId}
      onClose={() => close()}
      region={region}
      target={target}
      organizationId={typeof d.organizationId === "string" ? d.organizationId : null}
    />
  );
}
