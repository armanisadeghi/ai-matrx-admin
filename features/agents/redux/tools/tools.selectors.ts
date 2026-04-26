import type { RootState } from "@/lib/redux/store.types";

export const selectAllTools = (state: RootState) => state.tools.tools;
export const selectToolsStatus = (state: RootState) => state.tools.status;
export const selectToolsError = (state: RootState) => state.tools.error;
export const selectToolsReady = (state: RootState) =>
  state.tools.status === "succeeded";
