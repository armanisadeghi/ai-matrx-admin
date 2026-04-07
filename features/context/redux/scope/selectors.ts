"use client";

import { createSelector } from "@reduxjs/toolkit";
import {
  selectAllAssignments,
  selectAssignmentCountByScope,
} from "./scopeAssignmentsSlice";
import { selectAllScopes } from "./scopesSlice";
import { selectAllScopeTypes, selectScopeTypesByOrg } from "./scopeTypesSlice";
import type {
  EntityScopeLabel,
  SidebarScopeSection,
  ScopePickerOption,
  Scope,
} from "./types";

type ScopeRootState = {
  scopeTypes: ReturnType<typeof import("./scopeTypesSlice").default>;
  scopes: ReturnType<typeof import("./scopesSlice").default>;
  scopeAssignments: ReturnType<
    typeof import("./scopeAssignmentsSlice").default
  >;
  scopeContext: ReturnType<typeof import("./scopeContextSlice").default>;
};

export const selectEntityScopesWithLabels = createSelector(
  [
    (state: ScopeRootState) => selectAllAssignments(state),
    (state: ScopeRootState) => selectAllScopes(state),
    (state: ScopeRootState) => selectAllScopeTypes(state),
    (_state: ScopeRootState, entityType: string) => entityType,
    (_state: ScopeRootState, _entityType: string, entityId: string) => entityId,
  ],
  (assignments, scopes, types, entityType, entityId): EntityScopeLabel[] => {
    const entityAssignments = assignments.filter(
      (a) => a.entity_type === entityType && a.entity_id === entityId,
    );
    const scopeMap = new Map(scopes.map((s) => [s.id, s]));
    const typeMap = new Map(types.map((t) => [t.id, t]));

    return entityAssignments.map((a) => {
      const scope = scopeMap.get(a.scope_id);
      const type = scope ? typeMap.get(scope.scope_type_id) : undefined;
      return {
        assignment_id: a.id,
        scope_id: a.scope_id,
        scope_name: scope?.name ?? "Unknown",
        type_id: scope?.scope_type_id ?? "",
        type_label: type?.label_singular ?? "Unknown",
        type_color: type?.color ?? "",
        type_icon: type?.icon ?? "folder",
      };
    });
  },
);

export const selectOrgSidebarStructure = createSelector(
  [
    (state: ScopeRootState, orgId: string) =>
      selectScopeTypesByOrg(state, orgId),
    (state: ScopeRootState) => selectAllScopes(state),
    (state: ScopeRootState) => selectAssignmentCountByScope(state),
  ],
  (types, allScopes, countMap): SidebarScopeSection[] => {
    return types.map((type) => {
      const typeScopes = allScopes.filter((s) => s.scope_type_id === type.id);

      const buildTree = (
        parentId: string | null,
      ): SidebarScopeSection["scopes"] =>
        typeScopes
          .filter((s) => s.parent_scope_id === parentId)
          .map((s) => ({
            id: s.id,
            name: s.name,
            assignment_count: countMap[s.id] ?? 0,
            children: buildTree(s.id),
          }));

      return {
        type_id: type.id,
        label_singular: type.label_singular,
        label_plural: type.label_plural,
        icon: type.icon,
        color: type.color,
        parent_type_id: type.parent_type_id,
        scopes: buildTree(null),
      };
    });
  },
);

export const selectScopePickerOptions = createSelector(
  [
    (state: ScopeRootState, orgId: string) =>
      selectScopeTypesByOrg(state, orgId),
    (state: ScopeRootState) => selectAllScopes(state),
  ],
  (types, allScopes): ScopePickerOption[] => {
    return types.map((type) => ({
      type_id: type.id,
      label: type.label_plural,
      icon: type.icon,
      color: type.color,
      max_assignments: type.max_assignments_per_entity,
      options: allScopes
        .filter((s) => s.scope_type_id === type.id)
        .map((s) => ({
          value: s.id,
          label: s.name,
          parent_scope_id: s.parent_scope_id,
        })),
    }));
  },
);

export const selectProjectsByScopes = createSelector(
  [
    selectAllAssignments,
    (_state: ScopeRootState, scopeIds: string[]) => scopeIds,
    (_state: ScopeRootState, _scopeIds: string[], matchAll: boolean) =>
      matchAll,
  ],
  (assignments, scopeIds, matchAll): string[] => {
    const projectAssignments = assignments.filter(
      (a) => a.entity_type === "project",
    );

    const projectScopeMap = new Map<string, Set<string>>();
    projectAssignments.forEach((a) => {
      if (!projectScopeMap.has(a.entity_id)) {
        projectScopeMap.set(a.entity_id, new Set());
      }
      projectScopeMap.get(a.entity_id)!.add(a.scope_id);
    });

    const matchingProjectIds: string[] = [];
    projectScopeMap.forEach((scopeSet, projectId) => {
      const matches = matchAll
        ? scopeIds.every((id) => scopeSet.has(id))
        : scopeIds.some((id) => scopeSet.has(id));
      if (matches) matchingProjectIds.push(projectId);
    });

    return matchingProjectIds;
  },
);
