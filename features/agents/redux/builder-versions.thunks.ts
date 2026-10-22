/**
 * BUILDER TIER (chat-package P25) — agent version reads (history list, snapshot,
 * version-id lookup). Nothing in @ai-matrx/chat calls these; they left the package
 * with the builder. Action types are unchanged.
 */

import { createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "@ai-matrx/chat/host/db";
import {
  listAgentVersions,
  readAgentVersionSnapshot,
  resolveAgentVersionId as readAgentVersionId,
  type VersionsClient,
} from "@ai-matrx/agents/versions";
import type { ChatDispatch, ChatRootState } from "@ai-matrx/chat/store/root-state";
import type { DbRpcRow } from "@/types/supabase-rpc";
import type {
  AgentVersionHistoryItem,
  AgentVersionLookup,
} from "@ai-matrx/chat/agents/types/agent-definition.types";
import { upsertAgent } from "@ai-matrx/chat/agents/redux/agent-definition/slice";
import { parseAgentVersionSnapshot } from "@ai-matrx/chat/agents/redux/agent-definition/parse-output-snapshot";
import { versionSnapshotRowToAgentDefinition } from "@ai-matrx/chat/agents/redux/agent-definition/converters";

export type { AgentVersionHistoryItem };

type ThunkApi = { dispatch: ChatDispatch; state: ChatRootState };

/** The reads go through THE versions door (@ai-matrx/agents/versions) on the web's client. */
const versionsDb = supabase as unknown as VersionsClient;

/** Same generator-vs-table reconciliation as the snapshot row's shim. */
type AgentVersionHistoryItemDbProjection = Omit<
  AgentVersionHistoryItem,
  | "change_note"
  | "contract_change"
  | "contract_break_declared"
  | "input_contract_hash"
  | "output_contract_hash"
> & {
  change_note: string;
  contract_change: string;
  contract_break_declared: string;
  input_contract_hash: string;
  output_contract_hash: string;
};
type _Check_AgentVersionHistoryItem =
  AgentVersionHistoryItemDbProjection extends DbRpcRow<"agx_get_version_history", "agent">
    ? true
    : false;
declare const _agentVersionHistoryItem: _Check_AgentVersionHistoryItem;
true satisfies typeof _agentVersionHistoryItem;

// AgentVersionSnapshot interface + compile-time check now live in
// features/agents/types/agent-definition.types.ts

/**
 * Paginated version history for the agent editor's version panel.
 * Returns the list directly — not stored in Redux (ephemeral UI state).
 */
export const fetchAgentVersionHistory = createAsyncThunk<
  AgentVersionHistoryItem[],
  { agentId: string; limit?: number; offset?: number },
  ThunkApi
>(
  "agentDefinition/fetchVersionHistory",
  async ({ agentId, limit = 50, offset = 0 }) =>
    (await listAgentVersions(versionsDb, { agentId, limit, offset })) as AgentVersionHistoryItem[],
);

/**
 * Resolves an immutable agent-version UUID to its parent agent and numeric
 * version. Unlike version history, callers do not need to know the parent
 * agent first. RLS on agent.definition_version remains the authorization
 * boundary for this lookup.
 */
export const resolveAgentVersionId = createAsyncThunk<
  AgentVersionLookup | null,
  string,
  ThunkApi
>("agentDefinition/resolveVersionId", async (versionId) =>
  readAgentVersionId(versionsDb, versionId),
);

/**
 * Fetches a full version snapshot for diff/preview.
 * Stores it in the agents map with isVersion = true, keyed by agx_version.id.
 * Same record shape — no special handling needed in selectors or UI.
 */
export const fetchAgentVersionSnapshot = createAsyncThunk<
  void,
  { agentId: string; version: number },
  ThunkApi
>(
  "agentDefinition/fetchVersionSnapshot",
  async ({ agentId, version }, { dispatch }) => {
    const raw = await readAgentVersionSnapshot(versionsDb, { agentId, version });
    if (!raw) return;
    const row = parseAgentVersionSnapshot(raw);

    dispatch(upsertAgent(versionSnapshotRowToAgentDefinition(agentId, row)));
  },
);
