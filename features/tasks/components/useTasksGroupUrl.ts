"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectGroupBy, setGroupBy } from "@/features/tasks/redux/taskUiSlice";
import { TASK_GROUP_PARAM, groupByFromParam } from "./tasksGrouping";

const DEFAULT_GROUP = "project";

/**
 * `?group=` <-> the sidebar's Group choice (Redux), so the table's bands survive reload, sharing
 * and Back. Same one-bridge shape as TaskUrlSync: whichever side moved last wins. The default
 * (Project) leaves the address bare.
 */
export function useTasksGroupUrl() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const groupBy = useAppSelector(selectGroupBy);
  const last = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const param = searchParams.get(TASK_GROUP_PARAM);
    if (param !== last.current) {
      // The address moved (first load, a pasted link, Back): adopt it.
      last.current = param;
      const asked = groupByFromParam(param);
      if (asked && asked !== groupBy) dispatch(setGroupBy(asked));
      return;
    }
    const wanted = groupBy === DEFAULT_GROUP ? null : groupBy;
    if (wanted === param) return;
    last.current = wanted;
    const next = new URLSearchParams(searchParams.toString());
    if (wanted) next.set(TASK_GROUP_PARAM, wanted);
    else next.delete(TASK_GROUP_PARAM);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [groupBy, searchParams, router, pathname, dispatch]);
}
