import { createSlice } from "@reduxjs/toolkit";
import { fetchAvailableTools } from "./tools.thunks";
import type { DatabaseTool } from "@/utils/supabase/tools-service";

interface ToolsSliceState {
  tools: DatabaseTool[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: ToolsSliceState = {
  tools: [],
  status: "idle",
  error: null,
};

const toolsSlice = createSlice({
  name: "tools",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAvailableTools.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchAvailableTools.fulfilled, (state, action) => {
        state.tools = action.payload;
        state.status = "succeeded";
      })
      .addCase(fetchAvailableTools.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message ?? "Failed to fetch tools";
      });
  },
});

export default toolsSlice.reducer;
