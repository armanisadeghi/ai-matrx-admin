"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  HierarchyCommand,
  HierarchyCommandContent,
} from "@/features/agent-context/components/hierarchy-selection/HierarchyCommand";
import { useHierarchyReduxBridge } from "@/features/agent-context/components/hierarchy-selection/useReduxBridge";
import { FULL_HIERARCHY_LEVELS } from "@/features/agent-context/components/hierarchy-selection/useHierarchySelection";
import { useSidebarExpanded } from "../../hooks/useSidebarExpanded";

export default function SidebarContextSelector() {
  const { value, onChange } = useHierarchyReduxBridge();
  const isExpanded = useSidebarExpanded();
  const [open, setOpen] = useState(false);

  const displayLabel = (() => {
    const parts: string[] = [];
    if (value.organizationName) parts.push(value.organizationName);
    if (value.projectName) parts.push(value.projectName);
    if (value.taskName) parts.push(value.taskName);
    return parts.length > 0 ? parts.join(" / ") : "Select context...";
  })();

  if (isExpanded) {
    return (
      <div className="px-1 py-1">
        <HierarchyCommand
          levels={FULL_HIERARCHY_LEVELS}
          value={value}
          onChange={onChange}
          triggerClassName="w-full h-7 text-[11px] border-dashed justify-between"
          align="start"
        />
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="shell-nav-item shell-tactile-subtle w-full"
          aria-label="Select context"
          title={displayLabel}
        >
          <span className="shell-nav-icon">
            <Globe size={18} strokeWidth={1.75} />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[300px] p-0"
        align="start"
        side="right"
        sideOffset={8}
      >
        <HierarchyCommandContent
          levels={FULL_HIERARCHY_LEVELS}
          value={value}
          onChange={onChange}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
