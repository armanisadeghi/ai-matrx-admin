import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store";
import type { NetRequest } from "./netRequestsSlice";

const selectNetRequestsRoot = (state: RootState) =>
  (state as RootState & { netRequests?: { byId: Record<string, NetRequest> } })
    .netRequests;

const selectNetHealthRoot = (state: RootState) =>
  (
    state as RootState & {
      netHealth?: {
        online: boolean;
        recentFailures: number;
        recentSuccesses: number;
        lastActivityAt: number | null;
      };
    }
  ).netHealth;

export const selectNetRequestById = (id: string | undefined | null) =>
  createSelector(
    [selectNetRequestsRoot],
    (root): NetRequest | null => {
      if (!id || !root) return null;
      return root.byId[id] ?? null;
    },
  );

export const selectActiveNetRequests = createSelector(
  [selectNetRequestsRoot],
  (root): NetRequest[] => {
    if (!root) return [];
    return Object.values(root.byId).filter(
      (r) =>
        r.phase === "connecting" ||
        r.phase === "streaming" ||
        r.phase === "heartbeat-stalled",
    );
  },
);

export const selectAnyRequestStalled = createSelector(
  [selectActiveNetRequests],
  (active) => active.some((r) => r.phase === "heartbeat-stalled"),
);

export const selectNetOnline = createSelector(
  [selectNetHealthRoot],
  (root) => root?.online ?? true,
);

export const selectNetUnhealthy = createSelector(
  [selectNetHealthRoot],
  (root) => {
    if (!root) return false;
    const total = root.recentFailures + root.recentSuccesses;
    if (total < 3) return false;
    return root.recentFailures / total > 0.5;
  },
);
