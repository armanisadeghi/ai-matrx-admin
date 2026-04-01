import type { RootState } from "@/lib/redux/store";
import type { ActiveRequest } from "@/features/agents/types/request.types";

export const selectRequest =
  (requestId: string) =>
  (state: RootState): ActiveRequest | undefined =>
    state.activeRequests.byRequestId[requestId];

export const selectRequestsForInstance =
  (instanceId: string) =>
  (state: RootState): ActiveRequest[] => {
    const ids = state.activeRequests.byInstanceId[instanceId] ?? [];
    return ids
      .map((id) => state.activeRequests.byRequestId[id])
      .filter((r): r is ActiveRequest => r != null);
  };

/**
 * Get the primary (most recent) request for an instance.
 */
export const selectPrimaryRequest =
  (instanceId: string) =>
  (state: RootState): ActiveRequest | undefined => {
    const ids = state.activeRequests.byInstanceId[instanceId] ?? [];
    if (ids.length === 0) return undefined;
    return state.activeRequests.byRequestId[ids[ids.length - 1]];
  };

export const selectRequestStatus = (requestId: string) => (state: RootState) =>
  state.activeRequests.byRequestId[requestId]?.status;

export const selectAccumulatedText =
  (requestId: string) =>
  (state: RootState): string =>
    state.activeRequests.byRequestId[requestId]?.accumulatedText ?? "";

/**
 * The conversation ID for a specific request.
 * Named selectRequestConversationId to avoid collision with appContextSlice's
 * selectConversationId (which returns the global app-level conversation context).
 */
export const selectRequestConversationId =
  (requestId: string) =>
  (state: RootState): string | null =>
    state.activeRequests.byRequestId[requestId]?.conversationId ?? null;

/**
 * Pending tool calls that haven't been resolved yet.
 */
export const selectUnresolvedToolCalls =
  (requestId: string) => (state: RootState) => {
    const request = state.activeRequests.byRequestId[requestId];
    if (!request) return [];
    return request.pendingToolCalls.filter((c) => !c.resolved);
  };

/**
 * Build the conversation tree for an instance.
 * Returns requests grouped by parent-child relationship.
 */
export const selectConversationTree =
  (instanceId: string) =>
  (
    state: RootState,
  ): {
    root: ActiveRequest | null;
    children: Record<string, ActiveRequest[]>;
  } => {
    const requests = (state.activeRequests.byInstanceId[instanceId] ?? [])
      .map((id) => state.activeRequests.byRequestId[id])
      .filter((r): r is ActiveRequest => r != null);

    const root = requests.find((r) => r.parentConversationId === null) ?? null;
    const children: Record<string, ActiveRequest[]> = {};

    for (const req of requests) {
      if (req.parentConversationId) {
        if (!children[req.parentConversationId]) {
          children[req.parentConversationId] = [];
        }
        children[req.parentConversationId].push(req);
      }
    }

    return { root, children };
  };

/**
 * Are there any active (in-flight) requests across all instances?
 */
export const selectHasActiveRequests = (state: RootState): boolean =>
  Object.values(state.activeRequests.byRequestId).some(
    (r) =>
      r.status === "pending" ||
      r.status === "connecting" ||
      r.status === "streaming" ||
      r.status === "awaiting-tools",
  );
