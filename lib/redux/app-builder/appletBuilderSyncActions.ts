import { createAction } from "@reduxjs/toolkit";

/** Sync action used by thunks and UI; lives outside the slice to avoid appletBuilderThunks → slice import cycles. */
export const setActiveApplet = createAction<string | null>("appletBuilder/setActiveApplet");
