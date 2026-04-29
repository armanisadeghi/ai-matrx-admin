"use client";

/**
 * SandboxFilesTab — agent filesystem browser only.
 *
 * Mounts the existing SandboxDiagnosticsPanel in `view="filesystem"` mode.
 * The user can poke at /home/agent and beyond without leaving the editor.
 * Distinct from the left-side Explorer — that one shows the project mounted
 * via SandboxFilesystemAdapter, while this one talks directly to the
 * matrx_agent's `/fs/list` endpoint and can browse arbitrary paths.
 */

import React from "react";
import { SandboxDiagnosticsPanel } from "../views/sandboxes/SandboxDiagnosticsPanel";

interface SandboxFilesTabProps {
  sandboxId: string;
  className?: string;
}

export const SandboxFilesTab: React.FC<SandboxFilesTabProps> = ({
  sandboxId,
  className,
}) => (
  <div className={className ?? "h-full overflow-auto p-3"}>
    <SandboxDiagnosticsPanel
      sandboxId={sandboxId}
      view="filesystem"
      showLogs={false}
      showResetButton={false}
    />
  </div>
);

export default SandboxFilesTab;
