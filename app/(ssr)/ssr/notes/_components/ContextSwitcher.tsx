"use client";

import {
  HierarchyCommand,
  useHierarchyReduxBridge,
} from "@/features/agent-context/components/hierarchy-selection";

export default function ContextSwitcher() {
  const { value, onChange } = useHierarchyReduxBridge();

  return (
    <HierarchyCommand
      levels={["organization", "project", "task"]}
      value={value}
      onChange={onChange}
      triggerClassName="h-7 text-[11px] w-full border-dashed"
    />
  );
}
