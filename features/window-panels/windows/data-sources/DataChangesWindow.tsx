"use client";

/**
 * What a refresh changed, as a floating window (phone: full screen). The body IS `ChangesPanel`;
 * this file only frames it.
 */

import { WindowPanel } from "@/features/window-panels/WindowPanel";
import { ChangesPanel } from "@/features/data-sources/ChangesPanel";
import { useLibraryOrganizationId } from "@/features/data-sources/library/hooks";

const OVERLAY_ID = "dataChangesWindow";

export default function DataChangesWindow({
  isOpen,
  onClose,
  tableId,
  organizationId,
  jobId,
  tableName,
}: {
  isOpen: boolean;
  onClose: () => void;
  tableId: string;
  organizationId: string | null;
  jobId?: string | null;
  tableName?: string | null;
}) {
  // A restored window (from its address) carries no organization: the person's own is used.
  const ownOrganizationId = useLibraryOrganizationId();
  if (!isOpen) return null;
  return (
    <WindowPanel
      id="data-changes-window"
      overlayId={OVERLAY_ID}
      urlSyncId={tableId}
      title={tableName ? `Changes · ${tableName}` : "Changes"}
      width={560}
      height="76dvh"
      position="top-right"
      minWidth={380}
      minHeight={360}
      onClose={onClose}
      bodyClassName="flex flex-col overflow-hidden"
    >
      <ChangesPanel tableId={tableId} organizationId={organizationId ?? ownOrganizationId} jobId={jobId ?? null} />
    </WindowPanel>
  );
}
