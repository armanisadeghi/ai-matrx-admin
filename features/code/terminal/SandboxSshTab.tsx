"use client";

/**
 * SandboxSshTab — embeds the existing SshAccessPanel inside the
 * bottom-panel "SSH" tab. The panel is already standalone and handles its
 * own credentials lifecycle (generate → copy → download .pem); we just
 * pass the active sandbox id through.
 */

import React from "react";
import { SshAccessPanel } from "@/components/sandbox/ssh-access-panel";

interface SandboxSshTabProps {
  sandboxId: string;
  className?: string;
}

export const SandboxSshTab: React.FC<SandboxSshTabProps> = ({
  sandboxId,
  className,
}) => {
  return (
    <div className={className ?? "h-full overflow-auto p-3"}>
      <SshAccessPanel sandboxId={sandboxId} />
    </div>
  );
};

export default SandboxSshTab;
