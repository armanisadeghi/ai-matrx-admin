"use client";

import React, { useState } from "react";
import { HierarchyContextSelector } from "@/features/context/components/HierarchyContextSelector";
import { useNavTree } from "@/features/context/hooks/useNavTree";
import { FolderKanban, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

function CompactProjectItem({ project }: { project: any }) {
  return (
    <div className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md border text-sm transition-colors cursor-pointer group">
      <div className="flex items-center gap-2 min-w-0">
        <FolderKanban className="h-4 w-4 text-primary shrink-0" />
        <span className="truncate font-medium">{project.name}</span>
      </div>
      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Button>
    </div>
  );
}

export function ProjectsWorkspace() {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);

  const { flatProjects } = useNavTree();

  const activeProjects = flatProjects.filter(p => p.workspace_id === selectedWorkspaceId);

  return (
    <div className="flex flex-col min-h-0 h-full bg-card">
      <div className="px-2 py-2 border-b shrink-0 bg-muted/10">
        <HierarchyContextSelector 
          levels={["organization", "workspace"]}
          selectedOrgId={selectedOrgId}
          onOrgChange={setSelectedOrgId}
          selectedWorkspaceId={selectedWorkspaceId}
          onWorkspaceChange={setSelectedWorkspaceId}
          showAddOption={true}
        />
      </div>

      <div className="px-2 py-2 border-b shrink-0 bg-muted/5">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Projects ({activeProjects.length})
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
        {selectedWorkspaceId ? (
          activeProjects.length > 0 ? (
            activeProjects.map(project => (
              <CompactProjectItem key={project.id} project={project} />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground px-4">
              <FolderKanban className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm font-medium">No projects found</p>
              <p className="text-xs mt-1">Create one using the dropdown above.</p>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground px-4">
            <FolderKanban className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Select a workspace to view projects</p>
          </div>
        )}
      </div>
    </div>
  );
}
