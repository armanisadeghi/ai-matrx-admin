"use client";

import { WindowPanel } from "@/features/window-panels/WindowPanel";
import { ProvisionWindowBody } from "@/features/provision-window/ProvisionWindowBody";

interface ProvisionWindowProps {
  isOpen: boolean;
  onClose: () => void;
  snapshotId: string | null;
  title?: string;
}

export default function ProvisionWindow({ isOpen, onClose, snapshotId, title }: ProvisionWindowProps) {
  if (!isOpen || !snapshotId) return null;
  return <ProvisionWindowInner onClose={onClose} snapshotId={snapshotId} title={title} />;
}

function ProvisionWindowInner({ onClose, snapshotId, title }: Omit<ProvisionWindowProps, "isOpen"> & { snapshotId: string }) {
  const collectData = (): Record<string, unknown> => ({ snapshotId, title: title ?? null });
  return (
    <WindowPanel
      title={title ?? "Provision"}
      id="provision-window"
      minWidth={420}
      minHeight={320}
      width={720}
      height={640}
      position="center"
      onClose={onClose}
      overlayId="provisionWindow"
      onCollectData={collectData}
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
    >
      <ProvisionWindowBody snapshotId={snapshotId} />
    </WindowPanel>
  );
}
