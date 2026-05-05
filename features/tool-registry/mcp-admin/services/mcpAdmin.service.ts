"use client";

import { createClient } from "@/utils/supabase/client";
import type { Database } from "@/types/database.types";

type Tables = Database["public"]["Tables"];
export type McpServerRow = Tables["tl_mcp_server"]["Row"];
export type McpConfigRow = Tables["tl_mcp_config"]["Row"];

const sb = () => createClient();

export async function listServers(): Promise<McpServerRow[]> {
  const { data, error } = await sb()
    .from("tl_mcp_server")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listServerConfigs(serverId: string): Promise<McpConfigRow[]> {
  const { data, error } = await sb()
    .from("tl_mcp_config")
    .select("*")
    .eq("server_id", serverId)
    .order("is_default", { ascending: false })
    .order("label", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listServerTools(slug: string): Promise<
  { id: string; name: string; description: string; is_active: boolean | null }[]
> {
  const { data, error } = await sb()
    .from("tl_def")
    .select("id, name, description, is_active")
    .like("name", `${slug}:%`)
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function countConnectedUsers(serverId: string): Promise<number> {
  const { count, error } = await sb()
    .from("tl_mcp_user_conn")
    .select("id", { count: "exact", head: true })
    .eq("server_id", serverId);
  if (error) throw error;
  return count ?? 0;
}

export async function setServerStatus(
  serverId: string,
  status: Database["public"]["Enums"]["mcp_server_status"],
): Promise<void> {
  const { error } = await sb().from("tl_mcp_server").update({ status }).eq("id", serverId);
  if (error) throw error;
}

export interface SyncFreshness {
  state: "fresh" | "stale" | "errored" | "never";
  ageSec: number | null;
  ttlSec: number;
  lastError: string | null;
}

export function computeFreshness(server: McpServerRow): SyncFreshness {
  const ttlSec = server.discovery_ttl_seconds;
  const lastError = server.last_sync_error;
  if (!server.last_synced_at) {
    return { state: "never", ageSec: null, ttlSec, lastError };
  }
  const ageMs = Date.now() - new Date(server.last_synced_at).getTime();
  const ageSec = Math.floor(ageMs / 1000);
  if (lastError) return { state: "errored", ageSec, ttlSec, lastError };
  if (ageSec > ttlSec) return { state: "stale", ageSec, ttlSec, lastError };
  return { state: "fresh", ageSec, ttlSec, lastError };
}

export function formatRelativeAge(seconds: number | null): string {
  if (seconds === null) return "never";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export async function refreshServer(serverId: string): Promise<void> {
  const res = await fetch(`/api/mcp/servers/${serverId}/refresh`, { method: "POST" });
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json()).error ?? "";
    } catch {
      /* ignore */
    }
    throw new Error(detail || `Refresh failed (${res.status})`);
  }
}

export interface ProvisionMcpServerInput {
  slug: string;
  name: string;
  vendor: string;
  category: Database["public"]["Enums"]["mcp_server_category"];
  transport: Database["public"]["Enums"]["mcp_transport"];
  authStrategy: Database["public"]["Enums"]["mcp_auth_strategy"];
  endpointUrl?: string;
  description?: string;
  iconUrl?: string;
  color?: string;
  docsUrl?: string;
  websiteUrl?: string;
  status?: Database["public"]["Enums"]["mcp_server_status"];
  isOfficial?: boolean;
  oauthScopes?: string[];
}

export interface ProvisionMcpServerResult {
  server_id: string;
  server_slug: string;
  executor_kind: string;
  bundle_id: string;
  bundle_name: string;
  lister_tool_id: string;
  lister_name: string;
  next_step: string;
}

/**
 * Atomic 5-step MCP provisioning. Inserts:
 *   1. tl_mcp_server row
 *   2. paired tl_executor_kind row named `mcp.<slug>`
 *   3. lister tool in tl_def named `bundle:list_<slug>`
 *   4. system bundle in tl_bundle named <slug>, lister linked
 *
 * Returns IDs of all created rows + the recommended next step
 * (POST /api/mcp/servers/<id>/refresh to fetch the catalog).
 */
export async function provisionMcpServer(
  input: ProvisionMcpServerInput,
): Promise<ProvisionMcpServerResult> {
  const { data, error } = await sb().rpc("provision_mcp_server", {
    p_slug: input.slug,
    p_name: input.name,
    p_vendor: input.vendor,
    p_category: input.category,
    p_transport: input.transport,
    p_auth_strategy: input.authStrategy,
    p_endpoint_url: input.endpointUrl ?? undefined,
    p_description: input.description ?? undefined,
    p_icon_url: input.iconUrl ?? undefined,
    p_color: input.color ?? undefined,
    p_docs_url: input.docsUrl ?? undefined,
    p_website_url: input.websiteUrl ?? undefined,
    p_status: input.status ?? undefined,
    p_is_official: input.isOfficial ?? undefined,
    p_oauth_scopes: input.oauthScopes ?? undefined,
  });
  if (error) throw error;
  return data as unknown as ProvisionMcpServerResult;
}
