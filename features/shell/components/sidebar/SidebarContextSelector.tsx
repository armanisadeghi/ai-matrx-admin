"use client";

import {
  HierarchyCommand,
  useHierarchyReduxBridge,
} from "@/features/agent-context/components/hierarchy-selection";

export default function SidebarContextSelector() {
  const { value, onChange } = useHierarchyReduxBridge();

  return (
    <div className="px-1 py-1">
      <HierarchyCommand
        levels={["organization", "project", "task"]}
        value={value}
        onChange={onChange}
        triggerClassName="w-full h-7 text-[11px] border-dashed justify-between"
        align="start"
      />
    </div>
  );
}
