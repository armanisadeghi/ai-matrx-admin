import { createAction } from "@reduxjs/toolkit";

/** Sync action used by thunks and UI; lives outside the slice to avoid fieldBuilderThunks → slice import cycles. */
export const setActiveField = createAction<string | null>("fieldBuilder/setActiveField");
