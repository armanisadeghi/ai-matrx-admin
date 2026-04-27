/** Shared with `slice.ts` extraReducers matchers so the slice does not import `thunks.ts` (breaks circular deps). */
export const GET_OR_FETCH_SELECTED_RECORDS_THUNK = "entities/getOrFetchSelectedRecordsThunk" as const;
