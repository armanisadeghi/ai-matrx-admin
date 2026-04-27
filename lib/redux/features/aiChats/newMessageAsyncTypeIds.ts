/**
 * createAsyncThunk typePrefix strings (single source of truth).
 * Used by the slice extraReducers via action.type string matching to avoid
 * newMessageSlice ⟷ thunks circular imports.
 */
export const newMessageAsyncTypePrefix = {
  start: "newMessage/startNewMessage",
  submit: "newMessage/submitMessage",
} as const;
