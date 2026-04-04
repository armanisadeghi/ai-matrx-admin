import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store";
import type { McpCatalogEntry } from "@/features/agents/types/mcp.types";
import {
  fetchMcpCatalog,
  connectMcpServer as connectMcpServerService,
  disconnectMcpServer as disconnectMcpServerService,
} from "@/features/agents/services/mcp.service";
import type { UpsertConnectionParams } from "@/features/agents/services/mcp.service";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface McpSliceState {
  catalog: McpCatalogEntry[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  connectingServerId: string | null;
}

const initialState: McpSliceState = {
  catalog: [],
  status: "idle",
  error: null,
  connectingServerId: null,
};

// ---------------------------------------------------------------------------
// Thunks
// ---------------------------------------------------------------------------

export const fetchCatalog = createAsyncThunk("mcp/fetchCatalog", async () => {
  return fetchMcpCatalog();
});

export const connectServer = createAsyncThunk(
  "mcp/connectServer",
  async (params: UpsertConnectionParams, { dispatch }) => {
    const connectionId = await connectMcpServerService(params);
    dispatch(fetchCatalog());
    return { serverId: params.serverId, connectionId };
  },
);

export const disconnectServer = createAsyncThunk(
  "mcp/disconnectServer",
  async (serverId: string, { dispatch }) => {
    await disconnectMcpServerService(serverId);
    dispatch(fetchCatalog());
    return serverId;
  },
);

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const mcpSlice = createSlice({
  name: "mcp",
  initialState,
  reducers: {
    clearMcpError(state) {
      state.error = null;
    },
    updateCatalogEntry(
      state,
      action: PayloadAction<{
        serverId: string;
        patch: Partial<McpCatalogEntry>;
      }>,
    ) {
      const idx = state.catalog.findIndex(
        (e) => e.serverId === action.payload.serverId,
      );
      if (idx !== -1) {
        state.catalog[idx] = { ...state.catalog[idx], ...action.payload.patch };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCatalog.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchCatalog.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.catalog = action.payload;
      })
      .addCase(fetchCatalog.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message ?? "Failed to fetch MCP catalog";
      })
      .addCase(connectServer.pending, (state, action) => {
        state.connectingServerId = action.meta.arg.serverId;
      })
      .addCase(connectServer.fulfilled, (state) => {
        state.connectingServerId = null;
      })
      .addCase(connectServer.rejected, (state, action) => {
        state.connectingServerId = null;
        state.error = action.error.message ?? "Failed to connect MCP server";
      })
      .addCase(disconnectServer.fulfilled, (state, action) => {
        const idx = state.catalog.findIndex(
          (e) => e.serverId === action.payload,
        );
        if (idx !== -1) {
          state.catalog[idx] = {
            ...state.catalog[idx],
            connectionStatus: "disconnected",
            connectionId: null,
          };
        }
      });
  },
});

export const { clearMcpError, updateCatalogEntry } = mcpSlice.actions;
export default mcpSlice.reducer;

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

const selectMcpState = (state: RootState) => state.mcp;

export const selectMcpCatalog = (state: RootState) =>
  selectMcpState(state).catalog;

export const selectMcpCatalogStatus = (state: RootState) =>
  selectMcpState(state).status;

export const selectMcpCatalogError = (state: RootState) =>
  selectMcpState(state).error;

export const selectMcpConnectingServerId = (state: RootState) =>
  selectMcpState(state).connectingServerId;

export const selectMcpServerById = (state: RootState, serverId: string) =>
  selectMcpState(state).catalog.find((e) => e.serverId === serverId) ?? null;

export const selectMcpCatalogByCategory = (state: RootState) => {
  const catalog = selectMcpState(state).catalog;
  const grouped: Record<string, McpCatalogEntry[]> = {};
  for (const entry of catalog) {
    if (!grouped[entry.category]) grouped[entry.category] = [];
    grouped[entry.category].push(entry);
  }
  return grouped;
};
