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
import { Building2, FolderKanban, CheckSquare, Plus } from "lucide-react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { openOverlay } from "@/lib/redux/slices/overlaySlice";

export type HierarchyLevel = "organization" | "project" | "task";

export interface HierarchyContextSelectorProps {
  levels?: HierarchyLevel[];
  showAddOption?: boolean;
  
  selectedOrgId?: string | null;
  onOrgChange?: (id: string | null) => void;
  
  selectedProjectId?: string | null;
  onProjectChange?: (id: string | null) => void;

  selectedTaskId?: string | null;
  onTaskChange?: (id: string | null) => void;
}

export function HierarchyContextSelector({
  levels = ["organization", "project"],
  showAddOption = true,
  selectedOrgId: externalOrgId,
  onOrgChange,
  selectedProjectId: externalProjectId,
  onProjectChange,
  selectedTaskId: externalTaskId,
  onTaskChange,
}: HierarchyContextSelectorProps) {
  const dispatch = useAppDispatch();
  const { orgs, flatProjects, isSuccess } = useNavTree();

  const [internalOrgId, setInternalOrgId] = useState<string | null>(null);
  const [internalProjectId, setInternalProjectId] = useState<string | null>(null);
  const [internalTaskId, setInternalTaskId] = useState<string | null>(null);

  const activeOrgId = externalOrgId !== undefined ? externalOrgId : internalOrgId;
  const activeProjectId = externalProjectId !== undefined ? externalProjectId : internalProjectId;
  const activeTaskId = externalTaskId !== undefined ? externalTaskId : internalTaskId;

  const { data: projectTasks } = useProjectTasks(activeProjectId);

  useEffect(() => {
    if (isSuccess && !activeOrgId && orgs.length > 0) {
      handleOrgChange(orgs[0].id);
    }
  }, [isSuccess, orgs, activeOrgId]);

  useEffect(() => {
    if (activeOrgId) {
      const projs = flatProjects.filter(p => p.org_id === activeOrgId);
      if (projs.length > 0 && (!activeProjectId || !projs.find(p => p.id === activeProjectId))) {
        handleProjectChange(projs[0].id);
      }
    }
  }, [activeOrgId, flatProjects, activeProjectId]);

  const handleOrgChange = (id: string | null) => {
    setInternalOrgId(id);
    onOrgChange?.(id);
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
            project_id: activeProjectId,
          },
        },
      })
    );
  };

  const activeOrgs = orgs || [];
  const activeProjects = flatProjects.filter(p => p.org_id === activeOrgId);
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

      {levels.includes("project") && (
        <Select
          value={activeProjectId || ""}
          onValueChange={(val) => {
            if (val === "___NEW___") handleCreateNew("project");
            else handleProjectChange(val);
          }}
          disabled={!activeOrgId}
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
