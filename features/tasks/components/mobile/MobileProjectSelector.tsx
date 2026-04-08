"use client";

import React from "react";
import {
  HierarchyCascade,
  EMPTY_SELECTION,
} from "@/features/context/components/hierarchy-selection";

interface MobileProjectSelectorProps {
  selectedProjectId: string | null;
  onSelectProject: (projectId: string | null) => void;
}

export default function MobileProjectSelector({
  selectedProjectId,
  onSelectProject,
}: MobileProjectSelectorProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 pb-4 border-b border-border">
        <h2 className="text-xl font-semibold text-foreground">
          Select Project
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose an organization and project to view its tasks
        </p>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-1">
        <HierarchyCascade
          levels={["organization", "project"]}
          value={{
            ...EMPTY_SELECTION,
            projectId: selectedProjectId,
          }}
          onChange={(sel) => {
            onSelectProject(sel.projectId);
          }}
          layout="vertical"
        />
      </div>
    </div>
  );
}
