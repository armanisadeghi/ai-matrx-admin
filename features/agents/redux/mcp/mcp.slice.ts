import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store.types";
import type { McpCatalogEntry } from "@/features/agents/types/mcp.types";
import {
  fetchMcpCatalog,
  connectMcpServer as connectMcpServerService,
  disconnectMcpServer as disconnectMcpServerService,
} from "@/features/agents/services/mcp.service";
import type { UpsertConnectionParams } from "@/features/agents/services/mcp.service";
import type { McpToolSchema } from "@/features/agents/services/mcp-client/tool-discovery";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** Discovered tools/resources/prompts for a single MCP server */
export interface McpServerDiscovery {
  tools: McpToolSchema[];
  resources: Array<{
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
  }>;
  prompts: Array<{ name: string; description?: string }>;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  discoveredAt: string | null;
}

interface McpSliceState {
  catalog: McpCatalogEntry[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  connectingServerId: string | null;
  /** Per-server discovered capabilities, keyed by serverId */
  discoveries: Record<string, McpServerDiscovery>;
}

const initialState: McpSliceState = {
  catalog: [],
  status: "idle",
  error: null,
  connectingServerId: null,
  discoveries: {},
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

/** Discover tools/resources/prompts from a connected MCP server via the API route. */
export const discoverServerTools = createAsyncThunk(
  "mcp/discoverServerTools",
  async (serverId: string) => {
    const response = await fetch(`/api/mcp/servers/${serverId}/tools`);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error ?? `Discovery failed (${response.status})`);
    }
    return (await response.json()) as {
      serverId: string;
      serverName: string;
      serverSlug: string;
      tools: McpToolSchema[];
      resources: Array<{
        uri: string;
        name: string;
        description?: string;
        mimeType?: string;
      }>;
      prompts: Array<{ name: string; description?: string }>;
    };
  },
);

/** Refresh the OAuth token for a server. */
export const refreshServerToken = createAsyncThunk(
  "mcp/refreshServerToken",
  async (serverId: string) => {
    const response = await fetch(`/api/mcp/servers/${serverId}/refresh`, {
      method: "POST",
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error ?? `Refresh failed (${response.status})`);
    }
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
    clearServerDiscovery(state, action: PayloadAction<string>) {
      delete state.discoveries[action.payload];
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
        // Clear discovered tools when disconnecting
        delete state.discoveries[action.payload];
      })
      // ── discoverServerTools ──
      .addCase(discoverServerTools.pending, (state, action) => {
        state.discoveries[action.meta.arg] = {
          tools: [],
          resources: [],
          prompts: [],
          status: "loading",
          error: null,
          discoveredAt: null,
        };
      })
      .addCase(discoverServerTools.fulfilled, (state, action) => {
        state.discoveries[action.meta.arg] = {
          tools: action.payload.tools,
          resources: action.payload.resources,
          prompts: action.payload.prompts,
          status: "succeeded",
          error: null,
          discoveredAt: new Date().toISOString(),
        };
      })
      .addCase(discoverServerTools.rejected, (state, action) => {
        const existing = state.discoveries[action.meta.arg];
        state.discoveries[action.meta.arg] = {
          tools: existing?.tools ?? [],
          resources: existing?.resources ?? [],
          prompts: existing?.prompts ?? [],
          status: "failed",
          error: action.error.message ?? "Discovery failed",
          discoveredAt: existing?.discoveredAt ?? null,
        };
      });
  },
});

export const { clearMcpError, updateCatalogEntry, clearServerDiscovery } =
  mcpSlice.actions;
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

// ── Discovery selectors ──

export const selectMcpDiscoveries = (state: RootState) =>
  selectMcpState(state).discoveries;

export const selectMcpServerDiscovery = (state: RootState, serverId: string) =>
  selectMcpState(state).discoveries[serverId] ?? null;

export const selectMcpServerTools = (state: RootState, serverId: string) =>
  selectMcpState(state).discoveries[serverId]?.tools ?? [];

export const selectMcpServerDiscoveryStatus = (
  state: RootState,
  serverId: string,
) => selectMcpState(state).discoveries[serverId]?.status ?? "idle";

/**
 * Returns all discovered tools across all connected MCP servers,
 * tagged with their server ID for routing.
 */
export const selectAllDiscoveredMcpTools = (state: RootState) => {
  const discoveries = selectMcpState(state).discoveries;
  const allTools: Array<
    McpToolSchema & { serverId: string; serverName: string }
  > = [];

  for (const [serverId, discovery] of Object.entries(discoveries)) {
    if (discovery.status !== "succeeded") continue;
    const catalogEntry = state.mcp.catalog.find((e) => e.serverId === serverId);
    const serverName = catalogEntry?.name ?? serverId;
    for (const tool of discovery.tools) {
      allTools.push({ ...tool, serverId, serverName });
    }
  }

  return allTools;
};
