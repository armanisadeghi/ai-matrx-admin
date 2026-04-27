import { createAction } from "@reduxjs/toolkit";

/** Sync action used by thunks and UI; lives outside the slice to avoid appBuilderThunks → slice import cycles. */
export const setActiveApp = createAction<string | null>("appBuilder/setActiveApp");
