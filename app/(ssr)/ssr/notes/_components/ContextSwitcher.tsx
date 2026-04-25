"use client";

import { HierarchyCommand } from "@/features/agent-context/components/hierarchy-selection/HierarchyCommand";
import { useHierarchyReduxBridge } from "@/features/agent-context/components/hierarchy-selection/useReduxBridge";

export default function ContextSwitcher() {
  const { value, onChange } = useHierarchyReduxBridge();

  return (
    <HierarchyCommand
      levels={["organization", "scope", "project", "task"]}
      value={value}
      onChange={onChange}
      triggerClassName="h-7 text-[11px] w-full border-dashed"
    />
  );
}
