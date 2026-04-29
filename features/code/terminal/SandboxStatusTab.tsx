"use client";

/**
 * SandboxStatusTab — readiness checks only.
 *
 * Mounts the existing SandboxDiagnosticsPanel in `view="status"` mode so the
 * bottom-panel "Status" tab shows just the health badges (container,
 * matrx_agent, aidream, env passthrough count) without nesting an internal
 * Tabs strip. Files / Env / Logs each get their own top-level tab.
 */

import React from "react";
import { SandboxDiagnosticsPanel } from "../views/sandboxes/SandboxDiagnosticsPanel";

interface SandboxStatusTabProps {
  sandboxId: string;
  className?: string;
}

export const SandboxStatusTab: React.FC<SandboxStatusTabProps> = ({
  sandboxId,
  className,
}) => (
  <div className={className ?? "h-full overflow-auto p-3"}>
    <SandboxDiagnosticsPanel
      sandboxId={sandboxId}
      view="status"
      showLogs={false}
      showResetButton={false}
    />
  </div>
);

export default SandboxStatusTab;
