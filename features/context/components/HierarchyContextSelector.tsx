"use client";

import React, { useEffect, useState } from "react";
import { useNavTree } from "@/features/context/hooks/useNavTree";
import { useProjectTasks } from "@/features/context/hooks/useHierarchy";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectSeparator,
} from "@/components/ui/select";
import { Building2, Users, FolderKanban, CheckSquare, Plus } from "lucide-react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { openOverlay } from "@/lib/redux/slices/overlaySlice";

export type HierarchyLevel = "organization" | "workspace" | "project" | "task";

export interface HierarchyContextSelectorProps {
  levels?: HierarchyLevel[];
  showAddOption?: boolean;
  
  selectedOrgId?: string | null;
  onOrgChange?: (id: string | null) => void;
  
  selectedWorkspaceId?: string | null;
  onWorkspaceChange?: (id: string | null) => void;
  
  selectedProjectId?: string | null;
  onProjectChange?: (id: string | null) => void;

  selectedTaskId?: string | null;
  onTaskChange?: (id: string | null) => void;
}

export function HierarchyContextSelector({
  levels = ["organization", "workspace", "project"],
  showAddOption = true,
  selectedOrgId: externalOrgId,
  onOrgChange,
  selectedWorkspaceId: externalWorkspaceId,
  onWorkspaceChange,
  selectedProjectId: externalProjectId,
  onProjectChange,
  selectedTaskId: externalTaskId,
  onTaskChange,
}: HierarchyContextSelectorProps) {
  const dispatch = useAppDispatch();
  const { orgs, flatWorkspaces, flatProjects, isSuccess } = useNavTree();

  // Internal state for uncontrolled mode
  const [internalOrgId, setInternalOrgId] = useState<string | null>(null);
  const [internalWorkspaceId, setInternalWorkspaceId] = useState<string | null>(null);
  const [internalProjectId, setInternalProjectId] = useState<string | null>(null);
  const [internalTaskId, setInternalTaskId] = useState<string | null>(null);

  const activeOrgId = externalOrgId !== undefined ? externalOrgId : internalOrgId;
  const activeWorkspaceId = externalWorkspaceId !== undefined ? externalWorkspaceId : internalWorkspaceId;
  const activeProjectId = externalProjectId !== undefined ? externalProjectId : internalProjectId;
  const activeTaskId = externalTaskId !== undefined ? externalTaskId : internalTaskId;

  const { data: projectTasks } = useProjectTasks(activeProjectId);

  // Auto-select initial org
  useEffect(() => {
    if (isSuccess && !activeOrgId && orgs.length > 0) {
      handleOrgChange(orgs[0].id);
    }
  }, [isSuccess, orgs, activeOrgId]);

  // Auto-select workspace when org changes
  useEffect(() => {
    if (activeOrgId) {
      const wks = flatWorkspaces.filter(w => w.org_id === activeOrgId);
      if (wks.length > 0 && (!activeWorkspaceId || !wks.find(w => w.id === activeWorkspaceId))) {
        handleWorkspaceChange(wks[0].id);
      }
    }
  }, [activeOrgId, flatWorkspaces, activeWorkspaceId]);

  // Auto-select project when workspace changes
  useEffect(() => {
    if (activeWorkspaceId) {
      const projs = flatProjects.filter(p => p.workspace_id === activeWorkspaceId);
      if (projs.length > 0 && (!activeProjectId || !projs.find(p => p.id === activeProjectId))) {
        handleProjectChange(projs[0].id);
      }
    }
  }, [activeWorkspaceId, flatProjects, activeProjectId]);

  const handleOrgChange = (id: string | null) => {
    setInternalOrgId(id);
    onOrgChange?.(id);
  };

  const handleWorkspaceChange = (id: string | null) => {
    setInternalWorkspaceId(id);
    onWorkspaceChange?.(id);
  };

  const handleProjectChange = (id: string | null) => {
    setInternalProjectId(id);
    onProjectChange?.(id);
  };

  const handleTaskChange = (id: string | null) => {
    setInternalTaskId(id);
    onTaskChange?.(id);
  };

  const handleCreateNew = (type: HierarchyLevel) => {
    dispatch(
      openOverlay({
        overlayId: "hierarchyCreationWindow",
        data: {
          entityType: type,
          presetContext: {
            organization_id: activeOrgId,
            workspace_id: activeWorkspaceId,
            project_id: activeProjectId,
          },
        },
      })
    );
  };

  const activeOrgs = orgs || [];
  const activeWorkspaces = flatWorkspaces.filter(w => w.org_id === activeOrgId);
  const activeProjects = flatProjects.filter(p => p.workspace_id === activeWorkspaceId);
  const activeTasks = projectTasks || [];

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {levels.includes("organization") && (
        <Select
          value={activeOrgId || ""}
          onValueChange={(val) => {
            if (val === "___NEW___") handleCreateNew("organization");
            else handleOrgChange(val);
          }}
        >
          <SelectTrigger className="h-7 text-xs w-full">
            <div className="flex items-center gap-1.5 truncate">
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {activeOrgs.find(o => o.id === activeOrgId)?.name || "Select Organization"}
              </span>
            </div>
          </SelectTrigger>
          <SelectContent>
            {activeOrgs.map(o => (
              <SelectItem key={o.id} value={o.id} className="text-xs">{o.name}</SelectItem>
            ))}
            {showAddOption && (
              <>
                {activeOrgs.length > 0 && <SelectSeparator />}
                <SelectItem value="___NEW___" className="text-xs text-primary font-medium focus:bg-primary/10">
                  <span className="flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Create New Organization
                  </span>
                </SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      )}

      {levels.includes("workspace") && (
        <Select
          value={activeWorkspaceId || ""}
          onValueChange={(val) => {
            if (val === "___NEW___") handleCreateNew("workspace");
            else handleWorkspaceChange(val);
          }}
          disabled={!activeOrgId}
        >
          <SelectTrigger className="h-7 text-xs w-full">
            <div className="flex items-center gap-1.5 truncate">
              <Users className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {activeWorkspaces.find(w => w.id === activeWorkspaceId)?.name || "Select Workspace"}
              </span>
            </div>
          </SelectTrigger>
          <SelectContent>
            {activeWorkspaces.map(w => (
              <SelectItem key={w.id} value={w.id} className="text-xs">{w.name}</SelectItem>
            ))}
            {showAddOption && (
              <>
                {activeWorkspaces.length > 0 && <SelectSeparator />}
                <SelectItem value="___NEW___" className="text-xs text-primary font-medium focus:bg-primary/10">
                  <span className="flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Create New Workspace
                  </span>
                </SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      )}

      {levels.includes("project") && (
        <Select
          value={activeProjectId || ""}
          onValueChange={(val) => {
            if (val === "___NEW___") handleCreateNew("project");
            else handleProjectChange(val);
          }}
          disabled={!activeWorkspaceId}
        >
          <SelectTrigger className="h-7 text-xs w-full border-primary/20 bg-primary/5">
            <div className="flex items-center gap-1.5 truncate">
              <FolderKanban className="h-3 w-3 text-primary shrink-0" />
              <span className="truncate">
                {activeProjects.find(p => p.id === activeProjectId)?.name || "Select Project"}
              </span>
            </div>
          </SelectTrigger>
          <SelectContent>
            {activeProjects.map(p => (
              <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
            ))}
            {showAddOption && (
              <>
                {activeProjects.length > 0 && <SelectSeparator />}
                <SelectItem value="___NEW___" className="text-xs text-primary font-medium focus:bg-primary/10">
                  <span className="flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Create New Project
                  </span>
                </SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      )}

      {levels.includes("task") && (
        <Select
          value={activeTaskId || ""}
          onValueChange={(val) => {
            if (val === "___NEW___") handleCreateNew("task");
            else handleTaskChange(val);
          }}
          disabled={!activeProjectId}
        >
          <SelectTrigger className="h-7 text-xs w-full border-primary/20 bg-primary/5">
            <div className="flex items-center gap-1.5 truncate">
              <CheckSquare className="h-3 w-3 text-primary shrink-0" />
              <span className="truncate">
                {activeTasks.find(t => t.id === activeTaskId)?.title || "Select Task"}
              </span>
            </div>
          </SelectTrigger>
          <SelectContent>
             {activeTasks.map(t => (
              <SelectItem key={t.id} value={t.id} className="text-xs">{t.title}</SelectItem>
            ))}
            {showAddOption && (
              <>
                {activeTasks.length > 0 && <SelectSeparator />}
                <SelectItem value="___NEW___" className="text-xs text-primary font-medium focus:bg-primary/10">
                  <span className="flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Create New Task
                  </span>
                </SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
