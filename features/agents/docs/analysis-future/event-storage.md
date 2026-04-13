Here's the full picture:

---

**State location — `state.activeRequests`**

The Redux slice is at `features/agents/redux/execution-system/active-requests/active-requests.slice.ts`.

The top-level state shape:

```56:59:features/agents/redux/execution-system/active-requests/active-requests.slice.ts
export interface ActiveRequestsState {
  byRequestId: Record<string, ActiveRequest>;
  byConversationId: Record<string, string[]>;
}
```

- `byConversationId` maps a `conversationId → string[]` (list of `requestId`s for that conversation)
- `byRequestId` maps a `requestId → ActiveRequest` (the full request object with all its stream data)

**Inside each `ActiveRequest` there are two event stores:**

- `timeline` — structured, processed events. Every event type (phase, text_start/end, tool_event, init, completion, error, etc.) is parsed and normalized into typed `TimelineEntry` objects and pushed here. This is what the Timeline tab shows.

- `rawEvents` — the raw unprocessed events exactly as they came off the wire, pushed here before any interpretation. This is what the Raw tab shows.

**The selectors for them:**

```696:712:features/agents/redux/execution-system/active-requests/active-requests.selectors.ts
/** The full timeline for a request. Stable ref — only grows. */
export const selectTimeline =
  (requestId: string) =>
  (state: RootState): TimelineEntry[] | undefined =>
    state.activeRequests.byRequestId[requestId]?.timeline;

/** The raw event log — every event before processing. Stable ref — only grows. */
export const selectRawEvents =
  (requestId: string) =>
  (state: RootState): RawStreamEvent[] | undefined =>
    state.activeRequests.byRequestId[requestId]?.rawEvents;

/** Timeline length. Primitive — safe for useAppSelector. */
export const selectTimelineLength =
  (requestId: string) =>
  (state: RootState): number =>
    state.activeRequests.byRequestId[requestId]?.timeline.length ?? 0;
```

Both take a `requestId` (not `conversationId`). To get the request ID for a conversation, you first do:

```66:76:features/agents/redux/execution-system/active-requests/active-requests.selectors.ts
export const selectRequestsForInstance = (conversationId: string) =>
  createSelector(
    (state: RootState) => state.activeRequests.byConversationId[conversationId],
    (state: RootState) => state.activeRequests.byRequestId,
    (ids, byRequestId): ActiveRequest[] => {
      if (!ids || ids.length === 0) return [];
      return ids
        .map((id) => byRequestId[id])
        .filter((r): r is ActiveRequest => r != null);
    },
  );
```

Or if you just want the latest one:

```78:83:features/agents/redux/execution-system/active-requests/active-requests.selectors.ts
export const selectPrimaryRequest =
  (conversationId: string) =>
  (state: RootState): ActiveRequest | undefined => {
    const ids = state.activeRequests.byConversationId[conversationId];
    if (!ids || ids.length === 0) return undefined;
    return state.activeRequests.byRequestId[ids[ids.length - 1]];
  };
```

So the typical usage pattern is: `conversationId → requestId(s) → request.timeline / request.rawEvents`.