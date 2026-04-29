"use client";

/**
 * SandboxInspectorTab — embeds the existing SandboxDiagnosticsPanel inside
 * the bottom-panel "Inspector" tab. Same component the create-sandbox flow
 * uses to gate on `overall_ok=true`, just rendered in workspace context.
 *
 * Hides its own Reset button — destructive ops should stay in the side
 * panel where the sandbox-list is, so the user has the full row context
 * before nuking a container.
 */

import React from "react";
import { SandboxDiagnosticsPanel } from "../views/sandboxes/SandboxDiagnosticsPanel";

interface SandboxInspectorTabProps {
  sandboxId: string;
  className?: string;
}

export const SandboxInspectorTab: React.FC<SandboxInspectorTabProps> = ({
  sandboxId,
  className,
}) => {
  return (
    <div className={className ?? "h-full overflow-auto"}>
      <SandboxDiagnosticsPanel
        sandboxId={sandboxId}
        showLogs
        showResetButton={false}
      />
    </div>
  );
};

export default SandboxInspectorTab;
