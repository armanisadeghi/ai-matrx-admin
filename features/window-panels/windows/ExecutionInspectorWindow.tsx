"use client";

import { WindowPanel } from "../WindowPanel";
import ExecutionInstanceInspector from "@/components/admin/state-analyzer/execution-inspector/ExecutionInstanceInspector";

interface ExecutionInspectorWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExecutionInspectorWindow({
  isOpen,
  onClose,
}: ExecutionInspectorWindowProps) {
  if (!isOpen) return null;

  return (
    <WindowPanel
      id="execution-inspector-window"
      title="Execution Inspector"
      onClose={onClose}
      width="80vw"
      height="75vh"
      minWidth={900}
      minHeight={500}
      urlSyncKey="exec-inspector"
      urlSyncId="execution-inspector-window"
      urlSyncArgs={{ m: "ei" }}
    >
      <ExecutionInstanceInspector className="flex-1 h-full" />
    </WindowPanel>
  );
}
