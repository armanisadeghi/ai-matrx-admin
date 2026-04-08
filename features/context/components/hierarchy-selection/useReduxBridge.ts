"use client";

import { useCallback, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectAppContext,
  setOrganization,
  setProject,
  setTask,
  clearContext,
} from "@/features/context/redux/appContextSlice";
import type { HierarchySelection } from "./types";
import { EMPTY_SELECTION } from "./types";

/**
 * Bridges HierarchySelection state to/from the global appContextSlice in Redux.
 * Use this when you need the selection to be global (affects sidebar, other features).
 *
 * Returns { value, onChange } — pass directly to any HierarchySelection variant.
 */
export function useHierarchyReduxBridge() {
  const dispatch = useAppDispatch();
  const ctx = useAppSelector(selectAppContext);

  const value: HierarchySelection = useMemo(
    () => ({
      organizationId: ctx.organization_id,
      organizationName: ctx.organization_name ?? null,
      projectId: ctx.project_id,
      projectName: ctx.project_name ?? null,
      taskId: ctx.task_id,
      taskName: ctx.task_name ?? null,
    }),
    [ctx],
  );

  const onChange = useCallback(
    (sel: HierarchySelection) => {
      if (sel.organizationId !== ctx.organization_id) {
        dispatch(
          setOrganization({
            id: sel.organizationId,
            name: sel.organizationName,
          }),
        );
      }
      if (sel.projectId !== ctx.project_id) {
        dispatch(setProject({ id: sel.projectId, name: sel.projectName }));
      }
      if (sel.taskId !== ctx.task_id) {
        dispatch(setTask({ id: sel.taskId, name: sel.taskName }));
      }
      if (!sel.organizationId && !sel.projectId && !sel.taskId) {
        dispatch(clearContext());
      }
    },
    [dispatch, ctx.organization_id, ctx.project_id, ctx.task_id],
  );

  return { value, onChange };
}
