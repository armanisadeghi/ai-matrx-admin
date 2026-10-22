"use client";

/**
 * `GET /workflows/{id}/overview` — the plain-words picture of a workflow
 * (legible-diagrams L6). Reading never waits on an organization (access belongs
 * to the person); the id and the organization are effect dependencies only so a
 * read refreshes when context arrives.
 */

import { useCallback, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import { callApi } from "@/lib/api/call-api";
import { parseWorkflowOverview, type WorkflowOverview } from "./overview-model";

export type WorkflowOverviewState =
  | { status: "loading" }
  | { status: "ready"; overview: WorkflowOverview }
  | { status: "error"; message: string };

export function useWorkflowOverview(definitionId: string): {
  state: WorkflowOverviewState;
  retry: () => void;
} {
  const dispatch = useAppDispatch();
  const organizationId = useAppSelector(selectOrganizationId);
  const [attempt, setAttempt] = useState(0);
  const [answered, setAnswered] = useState<{ key: string; state: WorkflowOverviewState }>({
    key: "",
    state: { status: "loading" },
  });
  const key = `${definitionId}:${attempt}`;

  useEffect(() => {
    let live = true;
    void (async () => {
      const result = await dispatch(
        callApi({
          path: "/workflows/{definition_id}/overview",
          method: "GET",
          pathParams: { definition_id: definitionId },
        }),
      );
      if (!live) return;
      const overview = result.error ? null : parseWorkflowOverview(result.data);
      setAnswered({
        key,
        state: overview
          ? { status: "ready", overview }
          : {
              status: "error",
              message: result.error?.message || "The overview could not be read.",
            },
      });
    })();
    return () => {
      live = false;
    };
  }, [dispatch, definitionId, organizationId, key]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state: answered.key === key ? answered.state : { status: "loading" }, retry };
}
