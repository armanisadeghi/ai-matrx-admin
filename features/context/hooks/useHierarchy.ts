"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAppDispatch } from "@/lib/redux/hooks";
import { hierarchyService } from "../service/hierarchyService";
import type {
  HierarchyNode,
  HierarchyNodeType,
} from "../service/hierarchyService";
import {
  invalidateAndRefetchNavTree,
  invalidateAndRefetchFullContext,
  invalidateAndRefetchAll,
} from "@/features/context/redux/hierarchyThunks";

const KEYS = {
  tree: () => ["hierarchy-tree"] as const,
  orgs: () => ["hierarchy-orgs"] as const,
  projects: (parentId: string) => ["hierarchy-projects", parentId] as const,
  tasks: (projectId: string) => ["hierarchy-tasks", projectId] as const,
  ancestors: (type: string, id: string) =>
    ["hierarchy-ancestors", type, id] as const,
};

// ─── Full tree (legacy HierarchyNode shape for HierarchyTreePage) ────

export function useHierarchyTree() {
  return useQuery({
    queryKey: KEYS.tree(),
    queryFn: () => hierarchyService.fetchFullTree(),
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Organizations ──────────────────────────────────────────────────

export function useUserOrganizations() {
  return useQuery({
    queryKey: KEYS.orgs(),
    queryFn: () => hierarchyService.fetchUserOrganizations(),
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Projects ───────────────────────────────────────────────────────

export function useOrgProjects(orgId: string | null) {
  return useQuery({
    queryKey: KEYS.projects(`org-${orgId ?? ""}`),
    queryFn: () => hierarchyService.fetchProjects({ orgId: orgId! }),
    enabled: !!orgId,
  });
}

// ─── Tasks ──────────────────────────────────────────────────────────

export function useProjectTasks(projectId: string | null) {
  return useQuery({
    queryKey: KEYS.tasks(projectId ?? ""),
    queryFn: () => hierarchyService.fetchProjectTasks(projectId!),
    enabled: !!projectId,
  });
}

// ─── Ancestors (for breadcrumbs) ─────────────────────────────────────

export function useAncestors(type: HierarchyNodeType, id: string | null) {
  return useQuery({
    queryKey: KEYS.ancestors(type, id ?? ""),
    queryFn: () => hierarchyService.resolveAncestors(type, id!),
    enabled: !!id && type !== "user",
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Shared invalidation helper ──────────────────────────────────────

function useInvalidateAll() {
  const qc = useQueryClient();
  const dispatch = useAppDispatch();
  return useCallback(() => {
    qc.invalidateQueries({ queryKey: KEYS.tree() });
    dispatch(invalidateAndRefetchNavTree() as any);
  }, [qc, dispatch]);
}

function useInvalidateAfterTaskMutation() {
  const qc = useQueryClient();
  const dispatch = useAppDispatch();
  return useCallback(() => {
    qc.invalidateQueries({ queryKey: KEYS.tree() });
    dispatch(invalidateAndRefetchFullContext() as any);
  }, [qc, dispatch]);
}

// ─── Mutations ──────────────────────────────────────────────────────

export function useCreateOrganization() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (data: { name: string; slug: string; description?: string }) =>
      hierarchyService.createOrganization(data),
    onSuccess: () => {
      invalidate();
      toast.success("Organization created");
    },
    onError: (err: Error) =>
      toast.error("Failed to create organization", {
        description: err.message,
      }),
  });
}

export function useCreateProject() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (data: {
      name: string;
      organization_id?: string;
      description?: string;
    }) => hierarchyService.createProject(data),
    onSuccess: () => {
      invalidate();
      toast.success("Project created");
    },
    onError: (err: Error) =>
      toast.error("Failed to create project", { description: err.message }),
  });
}

export function useCreateTask() {
  const invalidate = useInvalidateAfterTaskMutation();
  return useMutation({
    mutationFn: (data: {
      title: string;
      project_id: string;
      parent_task_id?: string;
      description?: string;
      status?: string;
      priority?: string;
    }) => hierarchyService.createTask(data),
    onSuccess: () => {
      invalidate();
      toast.success("Task created");
    },
    onError: (err: Error) =>
      toast.error("Failed to create task", { description: err.message }),
  });
}

export function useUpdateEntity() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (params: {
      type: HierarchyNodeType;
      id: string;
      data: Record<string, unknown>;
    }) => {
      const { type, id, data } = params;
      switch (type) {
        case "organization":
          return hierarchyService.updateOrganization(id, data as any);
        case "project":
          return hierarchyService.updateProject(id, data as any);
        case "task":
          return hierarchyService.updateTask(id, data as any);
        default:
          throw new Error(`Cannot update type: ${type}`);
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success("Updated successfully");
    },
    onError: (err: Error) =>
      toast.error("Failed to update", { description: err.message }),
  });
}

export function useDeleteEntity() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (params: { type: HierarchyNodeType; id: string }) => {
      const { type, id } = params;
      switch (type) {
        case "task":
          return hierarchyService.deleteTask(id);
        case "project":
          return hierarchyService.deleteProject(id);
        case "organization":
          return hierarchyService.deleteOrganization(id);
        default:
          throw new Error(`Delete not supported for: ${type}`);
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success("Deleted successfully");
    },
    onError: (err: Error) =>
      toast.error("Failed to delete", { description: err.message }),
  });
}

export function useMoveProject() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (params: {
      projectId: string;
      target: { organization_id?: string | null };
    }) => hierarchyService.moveProject(params.projectId, params.target),
    onSuccess: () => {
      invalidate();
      toast.success("Project moved");
    },
    onError: (err: Error) =>
      toast.error("Failed to move project", { description: err.message }),
  });
}

export function useMoveTask() {
  const invalidate = useInvalidateAfterTaskMutation();
  return useMutation({
    mutationFn: (params: {
      taskId: string;
      target: { project_id?: string | null; parent_task_id?: string | null };
    }) => hierarchyService.moveTask(params.taskId, params.target),
    onSuccess: () => {
      invalidate();
      toast.success("Task moved");
    },
    onError: (err: Error) =>
      toast.error("Failed to move task", { description: err.message }),
  });
}

// ─── Utility: filter tree by search ─────────────────────────────────

export function filterHierarchyTree(
  nodes: HierarchyNode[],
  query: string,
): HierarchyNode[] {
  if (!query.trim()) return nodes;
  const q = query.toLowerCase();

  function prune(node: HierarchyNode): HierarchyNode | null {
    if (
      node.name.toLowerCase().includes(q) ||
      node.description?.toLowerCase().includes(q)
    ) {
      return node;
    }
    const filteredChildren = node.children
      .map(prune)
      .filter(Boolean) as HierarchyNode[];
    if (filteredChildren.length > 0) {
      return {
        ...node,
        children: filteredChildren,
        childCount: filteredChildren.length,
      };
    }
    return null;
  }

  return nodes.map(prune).filter(Boolean) as HierarchyNode[];
}

// ─── Utility: count all descendant nodes ────────────────────────────

export function countDescendants(node: HierarchyNode): number {
  let count = 0;
  for (const child of node.children) {
    count += 1 + countDescendants(child);
  }
  return count;
}
