"use client";

import { CopyForAiButton } from "@/components/agent-copy/CopyForAiButton";
import { fetchProjectExportBundle } from "@/features/tasks/services/aiExportService";
import { serializeProjectForAi } from "@/features/tasks/utils/serializeProjectTaskForAi";
import { recordUnavailable } from "@/lib/records/recordUnavailable";
import { copyText } from "@ai-matrx/kit/clipboard";
import { copyNotify } from "@/lib/clipboard/copy-notify";

/** The project's AI payload — what the button copies; also a header action's "Copy for AI". */
async function projectAiPayload(projectId: string, location: string): Promise<string> {
  const bundle = await fetchProjectExportBundle(projectId);
  if (!bundle) {
    throw recordUnavailable({
      entity: "project",
      reason: "unknown",
      recordId: projectId,
      token: "project",
    });
  }
  return serializeProjectForAi(bundle, location);
}

/** "Copy for AI" as an action (a header's "…" item): the same payload as the button. */
export async function copyProjectForAi(projectId: string, projectName: string | undefined, location: string): Promise<boolean> {
  const label = projectName?.trim() || "Project";
  try {
    return await copyText(await projectAiPayload(projectId, location), { notify: copyNotify, successMessage: `${label} copied for AI` });
  } catch (error) {
    copyNotify(error instanceof Error ? error.message : `Could not copy ${label}`, "error");
    return false;
  }
}

export function ProjectCopyForAiButton({
  projectId,
  projectName,
  location,
  size = "sm",
  className,
  showLabel = true,
  disabled,
}: {
  projectId: string;
  projectName?: string;
  location: string;
  size?: "icon" | "sm";
  className?: string;
  showLabel?: boolean;
  disabled?: boolean;
}) {
  const label = projectName?.trim() || "Project";

  return (
    <CopyForAiButton
      label={label}
      size={size}
      className={className}
      showLabel={showLabel}
      disabled={disabled}
      agent={() => projectAiPayload(projectId, location)}
    />
  );
}
