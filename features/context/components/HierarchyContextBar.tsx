"use client";

/**
 * HierarchyContextBar
 *
 * A top-of-page bar that lets users pick their active Org → Workspace → Project
 * from the app-wide context. Reads the navTree from Redux and writes selections
 * back to appContextSlice.
 *
 * Usage:
 *   <HierarchyContextBar showProject />
 *   <HierarchyContextBar showProject requireProject onMissingContext={...} />
 */

import React from "react";
import {
  Building2,
  FolderKanban,
  Layers,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectOrganizationId,
  selectWorkspaceId,
  selectProjectId,
  selectOrganizationName,
  selectWorkspaceName,
  selectProjectName,
  setOrganization,
  setWorkspace,
  setProject,
} from "@/features/context/redux/appContextSlice";
import { useNavTree } from "@/features/context/hooks/useNavTree";

interface HierarchyContextBarProps {
  /** Whether to show the Project selector (default: true) */
  showProject?: boolean;
  /** If true, shows a warning when no project is selected */
  requireProject?: boolean;
  /** Called when the full context changes */
  onChange?: (ids: {
    organizationId: string | null;
    workspaceId: string | null;
    projectId: string | null;
  }) => void;
  className?: string;
}

export function HierarchyContextBar({
  showProject = true,
  requireProject = false,
  onChange,
  className = "",
}: HierarchyContextBarProps) {
  const dispatch = useAppDispatch();
  const { orgs, flatWorkspaces, flatProjects, isLoading } = useNavTree();

  const activeOrgId = useAppSelector(selectOrganizationId);
  const activeWorkspaceId = useAppSelector(selectWorkspaceId);
  const activeProjectId = useAppSelector(selectProjectId);
  const activeOrgName = useAppSelector(selectOrganizationName);
  const activeWorkspaceName = useAppSelector(selectWorkspaceName);
  const activeProjectName = useAppSelector(selectProjectName);

  // Workspaces filtered to active org
  const workspacesForOrg = activeOrgId
    ? flatWorkspaces.filter((w) => w.org_id === activeOrgId)
    : [];

  // Projects filtered to active workspace (if set) or active org (if no workspace)
  const projectsForContext = (() => {
    if (activeWorkspaceId) {
      return flatProjects.filter((p) => p.workspace_id === activeWorkspaceId);
    }
    if (activeOrgId) {
      return flatProjects.filter((p) => p.org_id === activeOrgId);
    }
    return flatProjects;
  })();

  const handleOrgChange = (orgId: string) => {
    const org = orgs.find((o) => o.id === orgId);
    dispatch(setOrganization({ id: orgId, name: org?.name ?? null }));
    onChange?.({ organizationId: orgId, workspaceId: null, projectId: null });
  };

  const handleWorkspaceChange = (wsId: string) => {
    const ws = flatWorkspaces.find((w) => w.id === wsId);
    dispatch(setWorkspace({ id: wsId, name: ws?.name ?? null }));
    onChange?.({
      organizationId: activeOrgId,
      workspaceId: wsId,
      projectId: null,
    });
  };

  const handleProjectChange = (pId: string) => {
    const p = flatProjects.find((proj) => proj.id === pId);
    dispatch(setProject({ id: pId, name: p?.name ?? null }));
    onChange?.({
      organizationId: activeOrgId,
      workspaceId: activeWorkspaceId,
      projectId: pId,
    });
  };

  const missingProject = requireProject && showProject && !activeProjectId;

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 border-b border-border bg-card flex-wrap ${className}`}
    >
      {/* Org selector */}
      <div className="flex items-center gap-1.5 min-w-0">
        <Building2 size={14} className="text-muted-foreground flex-shrink-0" />
        <Select
          value={activeOrgId ?? ""}
          onValueChange={handleOrgChange}
          disabled={isLoading || orgs.length === 0}
        >
          <SelectTrigger className="h-7 text-xs border-dashed min-w-[120px] max-w-[180px]">
            <SelectValue
              placeholder={isLoading ? "Loading…" : "Select organization"}
            >
              {activeOrgName ??
                (isLoading ? "Loading…" : "Select organization")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {orgs.map((org) => (
              <SelectItem key={org.id} value={org.id} className="text-xs">
                {org.name}
                {org.is_personal && (
                  <span className="ml-1 text-muted-foreground">(personal)</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Workspace selector (only shown when org is set and org has workspaces) */}
      {activeOrgId && workspacesForOrg.length > 0 && (
        <>
          <ChevronRight
            size={12}
            className="text-muted-foreground flex-shrink-0"
          />
          <div className="flex items-center gap-1.5 min-w-0">
            <Layers size={14} className="text-muted-foreground flex-shrink-0" />
            <Select
              value={activeWorkspaceId ?? "__none__"}
              onValueChange={(v) =>
                v === "__none__"
                  ? dispatch(setWorkspace({ id: null }))
                  : handleWorkspaceChange(v)
              }
            >
              <SelectTrigger className="h-7 text-xs border-dashed min-w-[120px] max-w-[180px]">
                <SelectValue placeholder="All workspaces">
                  {activeWorkspaceName ?? "All workspaces"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  value="__none__"
                  className="text-xs text-muted-foreground"
                >
                  All workspaces
                </SelectItem>
                {workspacesForOrg.map((ws) => (
                  <SelectItem key={ws.id} value={ws.id} className="text-xs">
                    {ws.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* Project selector */}
      {showProject && activeOrgId && (
        <>
          <ChevronRight
            size={12}
            className="text-muted-foreground flex-shrink-0"
          />
          <div className="flex items-center gap-1.5 min-w-0">
            <FolderKanban
              size={14}
              className={
                missingProject
                  ? "text-destructive flex-shrink-0"
                  : "text-muted-foreground flex-shrink-0"
              }
            />
            <Select
              value={activeProjectId ?? ""}
              onValueChange={handleProjectChange}
              disabled={projectsForContext.length === 0}
            >
              <SelectTrigger
                className={`h-7 text-xs border-dashed min-w-[120px] max-w-[200px] ${
                  missingProject ? "border-destructive text-destructive" : ""
                }`}
              >
                <SelectValue placeholder="Select project">
                  {activeProjectName ?? "Select project"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {projectsForContext.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    No projects in this context
                  </div>
                ) : (
                  projectsForContext.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* Warning banner when project required but missing */}
      {missingProject && (
        <div className="flex items-center gap-1.5 ml-2 text-xs text-destructive">
          <AlertTriangle size={13} />
          <span>Select a project to create tasks</span>
        </div>
      )}
    </div>
  );
}
