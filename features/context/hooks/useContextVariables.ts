"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUser } from "@/lib/redux/slices/userSlice";
import { contextVariableService } from "../service/contextVariableService";
import type { ContextVariableFormData } from "../service/contextVariableService";
import type { ContextScopeLevel } from "../types";

const KEYS = {
  scopeVars: (scopeType: string, scopeId: string) =>
    ["ctx-vars-scope", scopeType, scopeId] as const,
  resolved: (scopeType: string, scopeId: string) =>
    ["ctx-vars-resolved", scopeType, scopeId] as const,
};

// ─── Variables defined at exactly this scope ─────────────────────────

export function useScopeVariables(
  scopeType: ContextScopeLevel,
  scopeId: string,
) {
  return useQuery({
    queryKey: KEYS.scopeVars(scopeType, scopeId),
    queryFn: () =>
      contextVariableService.fetchScopeVariables(scopeType, scopeId),
    enabled: !!scopeId && scopeId !== "default",
  });
}

// ─── Resolved variables (cascaded from all ancestor scopes) ──────────

export function useResolvedVariables(
  scopeType: ContextScopeLevel,
  scopeId: string,
  scopeIds?: {
    userId?: string;
    organizationId?: string | null;
    projectId?: string | null;
    taskId?: string | null;
  },
) {
  const { id: reduxUserId } = useAppSelector(selectUser);
  const resolvedUserId = scopeIds?.userId ?? reduxUserId;

  return useQuery({
    queryKey: KEYS.resolved(scopeType, scopeId),
    queryFn: async () => {
      if (!resolvedUserId) throw new Error("Not authenticated");
      return contextVariableService.resolveVariables({
        userId: resolvedUserId,
        organizationId: scopeIds?.organizationId,
        projectId: scopeIds?.projectId,
        taskId: scopeIds?.taskId,
      });
    },
    enabled: !!scopeId && scopeId !== "default" && !!resolvedUserId,
  });
}

// ─── Mutations ──────────────────────────────────────────────────────

export function useCreateContextVariable(
  scopeType: ContextScopeLevel,
  scopeId: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: ContextVariableFormData) =>
      contextVariableService.createVariable(scopeType, scopeId, formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.scopeVars(scopeType, scopeId) });
      qc.invalidateQueries({ queryKey: KEYS.resolved(scopeType, scopeId) });
      toast.success("Variable created");
    },
    onError: (err: Error) =>
      toast.error("Failed to create variable", { description: err.message }),
  });
}

export function useUpdateContextVariable(
  scopeType: ContextScopeLevel,
  scopeId: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<ContextVariableFormData>;
    }) => contextVariableService.updateVariable(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.scopeVars(scopeType, scopeId) });
      qc.invalidateQueries({ queryKey: KEYS.resolved(scopeType, scopeId) });
      toast.success("Variable updated");
    },
    onError: (err: Error) =>
      toast.error("Failed to update variable", { description: err.message }),
  });
}

export function useDeleteContextVariable(
  scopeType: ContextScopeLevel,
  scopeId: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => contextVariableService.deleteVariable(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.scopeVars(scopeType, scopeId) });
      qc.invalidateQueries({ queryKey: KEYS.resolved(scopeType, scopeId) });
      toast.success("Variable deleted");
    },
    onError: (err: Error) =>
      toast.error("Failed to delete variable", { description: err.message }),
  });
}
