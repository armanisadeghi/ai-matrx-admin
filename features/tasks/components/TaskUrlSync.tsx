"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectSelectedTaskId,
  setSelectedTaskId,
} from "@/features/tasks/redux/taskUiSlice";
import { useNavTree } from "@/features/agent-context/hooks/useNavTree";

/**
 * Bridges `?task=` ↔ Redux `selectedTaskId` so the editor column can survive
 * page reloads and cmd+click. Renders nothing.
 *
 * Also kicks off the shared `useNavTree()` hierarchy hydration so all three
 * columns (sidebar / list / editor) see project + scope data.
 */
export function TaskUrlSync() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedTaskId = useAppSelector(selectSelectedTaskId);

  useNavTree();

  // ?task= → Redux on mount only. Subsequent URL changes from this component
  // are pushed by the second effect; we never want this to overwrite the
  // user's selection mid-session.
  useEffect(() => {
    const param = searchParams.get("task");
    if (param && param !== selectedTaskId) {
      dispatch(setSelectedTaskId(param));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redux selectedTaskId → ?task= so reload + cmd+click survive.
  useEffect(() => {
    const current = searchParams.get("task");
    if (selectedTaskId === current) return;
    const params = new URLSearchParams(searchParams.toString());
    if (selectedTaskId) params.set("task", selectedTaskId);
    else params.delete("task");
    const qs = params.toString();
    router.replace(qs ? `/tasks?${qs}` : "/tasks", { scroll: false });
  }, [selectedTaskId, searchParams, router]);

  return null;
}
