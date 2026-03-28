// lib/redux/thunks/agentFetchThunks.ts
//
// Async thunks for the agentCacheSlice.
//
// TTL Strategy:
//   owned prompts : 15 minutes
//   shared prompts: 15 minutes
//   builtins      : session-long (never re-fetched within a session)
//
// Stale-while-revalidate:
//   If a tab is restored after > 4 hours of inactivity, a background
//   re-fetch is triggered for all sources. This is wired in useAgentConsumer
//   via document.visibilitychange.
//
// Idempotency:
//   initializeAgents() is safe to call from multiple components on mount.
//   It checks status + TTL before dispatching any network request.

import { createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "@/utils/supabase/client";
import type { RootState, AppDispatch } from "../store";
import {
  AgentRecord,
  AgentSource,
  upsertAgentsSlim,
  upsertAgentsCore,
  upsertAgentOperational,
  setAgentFetchStatus,
  setAgentLastFetchedAt,
  setAgentCursors,
  setAgentHasMore,
  setAgentError,
} from "../slices/agentCacheSlice";

// ── Constants ─────────────────────────────────────────────────────────────────

const OWNED_TTL_MS = 15 * 60 * 1000; // 15 minutes
const SHARED_TTL_MS = 15 * 60 * 1000; // 15 minutes
const TAB_RESTORE_TTL = 4 * 60 * 60 * 1000; // 4 hours — for stale-while-revalidate

export const AGENT_PAGE_SIZE = 50;

// ── Internal freshness helpers ────────────────────────────────────────────────

function isOwnedFresh(state: RootState): boolean {
  const { fetchStatus, lastFetchedAt } = state.agentCache ?? {};
  if (
    !fetchStatus ||
    fetchStatus.owned === "idle" ||
    fetchStatus.owned === "error"
  )
    return false;
  if (fetchStatus.owned === "loading") return true; // in-flight counts as fresh
  if (!lastFetchedAt?.owned) return false;
  return Date.now() - lastFetchedAt.owned < OWNED_TTL_MS;
}

function isBuiltinsFresh(state: RootState): boolean {
  const { fetchStatus } = state.agentCache ?? {};
  if (!fetchStatus) return false;
  // Builtins are session-long — once loaded, never re-fetch unless forced
  return (
    fetchStatus.builtins === "success" || fetchStatus.builtins === "loading"
  );
}

function isSharedFresh(state: RootState): boolean {
  const { fetchStatus, lastFetchedAt } = state.agentCache ?? {};
  if (
    !fetchStatus ||
    fetchStatus.shared === "idle" ||
    fetchStatus.shared === "error"
  )
    return false;
  if (fetchStatus.shared === "loading") return true;
  if (!lastFetchedAt?.shared) return false;
  return Date.now() - lastFetchedAt.shared < SHARED_TTL_MS;
}

export function isTabStale(state: RootState): boolean {
  const { lastFetchedAt } = state.agentCache ?? {};
  if (!lastFetchedAt) return true;
  const oldest = Math.min(
    lastFetchedAt.owned ?? 0,
    lastFetchedAt.shared ?? 0,
    // builtins: use 0 if never fetched so this triggers correctly
    lastFetchedAt.builtins ?? 0,
  );
  return Date.now() - oldest > TAB_RESTORE_TTL;
}

// ── RPC row → AgentRecord mappers ─────────────────────────────────────────────

interface SlimRow {
  id: string;
  name: string;
  source: string;
}
interface SharedSlimRow extends SlimRow {
  permission_level: string;
  owner_email: string;
}
interface CoreRow {
  id: string;
  source: string;
  name: string;
  description: string | null;
  tags: string[] | null;
  category: string | null;
  is_archived: boolean;
  is_favorite: boolean;
  is_active: boolean;
  output_format: string | null;
  created_at: string;
  updated_at: string;
  version: number | null;
}
interface OperationalRow {
  id: string;
  source: string;
  variable_defaults: unknown;
  dynamic_model: boolean;
}

function mapSlimRow(row: SlimRow): AgentRecord {
  return {
    id: row.id,
    source: row.source as AgentSource,
    depth: "slim",
    name: row.name,
  };
}

function mapSharedSlimRow(row: SharedSlimRow): AgentRecord {
  return {
    id: row.id,
    source: "shared",
    depth: "slim",
    name: row.name,
    permissionLevel: row.permission_level as AgentRecord["permissionLevel"],
    ownerEmail: row.owner_email,
  };
}

function mapCoreRow(row: CoreRow): AgentRecord {
  return {
    id: row.id,
    source: row.source as AgentSource,
    depth: "core",
    name: row.name,
    description: row.description ?? undefined,
    tags: row.tags ?? undefined,
    category: row.category ?? undefined,
    isArchived: row.is_archived,
    isFavorite: row.is_favorite,
    isActive: row.is_active,
    outputFormat: row.output_format ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: row.version ?? undefined,
  };
}

function mapOperationalRow(row: OperationalRow): AgentRecord {
  return {
    id: row.id,
    source: row.source as AgentSource,
    depth: "operational",
    name: "", // will be merged with existing slim/core data
    variableDefaults: Array.isArray(row.variable_defaults)
      ? row.variable_defaults
      : [],
    dynamicModel: row.dynamic_model ?? false,
  };
}

// ── Thunk 1: fetchAgentSlimList ───────────────────────────────────────────────

/**
 * Fetch slim agent list (Layer 1) for owned prompts + builtins, or shared.
 * For owned/builtins: calls get_agents_for_chat()
 * For shared:         calls get_shared_agents_for_chat()
 */
export const fetchAgentSlimList = createAsyncThunk<
  void,
  { source: "owned" | "shared"; cursor?: string | null },
  { dispatch: AppDispatch; state: RootState }
>("agentCache/fetchSlimList", async ({ source, cursor }, { dispatch }) => {
  const reduxSource = source === "owned" ? "owned" : "shared";
  dispatch(setAgentFetchStatus({ source: reduxSource, status: "loading" }));
  if (source === "owned") {
    // Also mark builtins as loading since this RPC returns both
    dispatch(setAgentFetchStatus({ source: "builtins", status: "loading" }));
  }

  try {
    if (source === "owned") {
      const { data, error } = await supabase.rpc("get_agents_for_chat", {
        p_limit: AGENT_PAGE_SIZE,
        p_cursor: cursor ?? null,
      });
      if (error) throw error;

      const rows = (data ?? []) as SlimRow[];
      const ownedRows = rows
        .filter((r) => r.source === "prompts")
        .map(mapSlimRow);
      const builtinRows = rows
        .filter((r) => r.source === "builtins")
        .map(mapSlimRow);

      if (ownedRows.length > 0 || cursor !== null) {
        dispatch(upsertAgentsSlim(ownedRows));
      }
      if (builtinRows.length > 0) {
        dispatch(upsertAgentsSlim(builtinRows));
      }

      // Pagination: if we got a full page, there may be more
      const lastOwned = ownedRows[ownedRows.length - 1];
      const hasMore = ownedRows.length >= AGENT_PAGE_SIZE;
      dispatch(
        setAgentCursors({ owned: hasMore && lastOwned ? lastOwned.id : null }),
      );
      dispatch(setAgentHasMore({ owned: hasMore }));

      dispatch(setAgentFetchStatus({ source: "owned", status: "success" }));
      dispatch(
        setAgentLastFetchedAt({ source: "owned", timestamp: Date.now() }),
      );
      dispatch(setAgentFetchStatus({ source: "builtins", status: "success" }));
      dispatch(
        setAgentLastFetchedAt({ source: "builtins", timestamp: Date.now() }),
      );
    } else {
      const { data, error } = await supabase.rpc("get_shared_agents_for_chat");
      if (error) throw error;

      const sharedRows = ((data ?? []) as SharedSlimRow[]).map(
        mapSharedSlimRow,
      );
      dispatch(upsertAgentsSlim(sharedRows));
      dispatch(setAgentHasMore({ shared: false })); // shared is not paginated

      dispatch(setAgentFetchStatus({ source: "shared", status: "success" }));
      dispatch(
        setAgentLastFetchedAt({ source: "shared", timestamp: Date.now() }),
      );
    }

    dispatch(setAgentError(null));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    dispatch(setAgentError(message));
    dispatch(setAgentFetchStatus({ source: reduxSource, status: "error" }));
    if (source === "owned") {
      dispatch(setAgentFetchStatus({ source: "builtins", status: "error" }));
    }
    throw err;
  }
});

// ── Thunk 2: fetchAgentCoreBatch ──────────────────────────────────────────────

/**
 * Batch-upgrade agents from slim → core depth (Layer 2).
 * Automatically skips agents already at core or operational depth.
 * Call this when the agent picker opens or when the user opens a section.
 */
export const fetchAgentCoreBatch = createAsyncThunk<
  void,
  { agents: Array<{ id: string; source: AgentSource }> },
  { dispatch: AppDispatch; state: RootState }
>("agentCache/fetchCoreBatch", async ({ agents }, { dispatch, getState }) => {
  const state = getState();
  const byId = state.agentCache?.byId ?? {};

  // Filter to only agents that need upgrading
  const toFetch = agents.filter(({ id }) => {
    const existing = byId[id];
    if (!existing) return true;
    return existing.depth === "slim"; // skip core + operational
  });

  if (toFetch.length === 0) return;

  const ids = toFetch.map((a) => a.id);
  const sources = toFetch.map((a) => a.source);

  const { data, error } = await supabase.rpc("get_agent_core_batch", {
    p_ids: ids,
    p_sources: sources,
  });

  if (error) {
    dispatch(setAgentError(error.message));
    throw error;
  }

  const upgraded = ((data ?? []) as CoreRow[]).map(mapCoreRow);
  dispatch(upsertAgentsCore(upgraded));
  dispatch(setAgentError(null));
});

// ── Thunk 3: fetchAgentOperational ────────────────────────────────────────────

/**
 * Fetch operational data (Layer 3) for a single agent.
 * Called only when the user actually selects an agent to chat with.
 * Skips the fetch if the agent is already at operational depth.
 */
export const fetchAgentOperational = createAsyncThunk<
  AgentRecord | null,
  { id: string; source: AgentSource },
  { dispatch: AppDispatch; state: RootState }
>(
  "agentCache/fetchOperational",
  async ({ id, source }, { dispatch, getState }) => {
    const state = getState();
    const existing = state.agentCache?.byId[id];

    if (existing?.depth === "operational") return existing;

    const { data, error } = await supabase.rpc("get_agent_operational", {
      p_id: id,
      p_source: source,
    });

    if (error) {
      dispatch(setAgentError(error.message));
      throw error;
    }

    const rows = (data ?? []) as OperationalRow[];
    if (rows.length === 0) return null;

    const record = mapOperationalRow(rows[0]);
    dispatch(upsertAgentOperational(record));
    dispatch(setAgentError(null));
    return getState().agentCache?.byId[id] ?? null;
  },
);

// ── Thunk 4: initializeAgents ─────────────────────────────────────────────────

/**
 * Bootstrap entry point — safe to call from any component on mount.
 * Orchestrates slim fetches for all three sources in parallel.
 * Respects TTL: owned/shared = 15 min, builtins = session-long.
 *
 * Usage:
 *   useEffect(() => { dispatch(initializeAgents()); }, [dispatch]);
 */
export const initializeAgents = createAsyncThunk<
  void,
  void,
  { dispatch: AppDispatch; state: RootState }
>("agentCache/initialize", async (_, { dispatch, getState }) => {
  const state = getState();

  const ownedFresh = isOwnedFresh(state);
  const builtinsFresh = isBuiltinsFresh(state);
  const sharedFresh = isSharedFresh(state);

  if (ownedFresh && builtinsFresh && sharedFresh) return;

  const tasks: Promise<unknown>[] = [];

  // owned + builtins come from the same RPC call
  if (!ownedFresh || !builtinsFresh) {
    tasks.push(dispatch(fetchAgentSlimList({ source: "owned" })));
  }

  if (!sharedFresh) {
    tasks.push(dispatch(fetchAgentSlimList({ source: "shared" })));
  }

  await Promise.allSettled(tasks);
});

// ── Thunk 5: refreshAgents ────────────────────────────────────────────────────

/**
 * Force a full re-fetch of all sources, bypassing TTL checks.
 * Call when the user explicitly requests a refresh, or after a tab restore
 * that exceeds the stale-while-revalidate window.
 */
export const refreshAgents = createAsyncThunk<
  void,
  void,
  { dispatch: AppDispatch; state: RootState }
>("agentCache/refresh", async (_, { dispatch }) => {
  await Promise.allSettled([
    dispatch(fetchAgentSlimList({ source: "owned" })),
    dispatch(fetchAgentSlimList({ source: "shared" })),
  ]);
});

// ── Exports ───────────────────────────────────────────────────────────────────

export default {
  fetchAgentSlimList,
  fetchAgentCoreBatch,
  fetchAgentOperational,
  initializeAgents,
  refreshAgents,
};
