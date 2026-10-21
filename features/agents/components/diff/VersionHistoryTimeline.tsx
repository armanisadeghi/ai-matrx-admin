"use client";

// The web's binding of THE version timeline (@ai-matrx/agents/versions/react): the web keeps the
// snapshot store (Redux, useSmartVersionFetch), the Duplicate dialog, its toasts and its error menu;
// the timeline and the contract-break door come from the package.

import { Copy } from "lucide-react";
import { declareContractBreak, type AgentVersionHistoryEntry } from "@ai-matrx/agents/versions";
import { VersionHistoryTimeline as PackageVersionHistoryTimeline } from "@ai-matrx/agents/versions/react";
import { supabase } from "@ai-matrx/chat/host/db";
import { toast } from "@ai-matrx/chat/host/notify";
import { ErrorAlchemyMenu } from "@ai-matrx/chat/host/ui-slots";
import { useAgentDuplicateFlow } from "@/features/agents/hooks/useAgentDuplicateFlow";
import { useSmartVersionFetch } from "@/features/agents/hooks/useSmartVersionFetch";

interface VersionHistoryTimelineProps {
  agentId: string;
  versions: AgentVersionHistoryEntry[];
  currentVersion: number | null;
  onCompare: (version: number, compareToVersion: number | "current") => void;
}

export function VersionHistoryTimeline({ agentId, versions, currentVersion, onCompare }: VersionHistoryTimelineProps) {
  const history = useSmartVersionFetch(agentId, versions);
  // Any row copies into a NEW agent through the one Duplicate dialog, with that version preselected.
  const duplicateFlow = useAgentDuplicateFlow();
  const byNumber = new Map(history.enrichedVersions.map((v) => [v.version_number, v]));

  return (
    <PackageVersionHistoryTimeline
      agentId={agentId}
      versions={versions}
      currentVersion={currentVersion}
      onCompare={onCompare}
      history={history}
      onDeclareContractBreak={(version, kind) =>
        declareContractBreak(supabase as never, { agentId, version, kind })
      }
      notify={toast}
      ErrorMenu={ErrorAlchemyMenu}
      rowActions={(entry) => [
        {
          id: "duplicate",
          icon: Copy,
          label: `Duplicate v${entry.number} as a new agent`,
          disabled: duplicateFlow.isDuplicating,
          onClick: () => {
            const version = byNumber.get(entry.number);
            if (version) void duplicateFlow.openDuplicate({ agentId, versionId: version.version_id });
          },
        },
      ]}
      footer={duplicateFlow.dialog}
    />
  );
}
