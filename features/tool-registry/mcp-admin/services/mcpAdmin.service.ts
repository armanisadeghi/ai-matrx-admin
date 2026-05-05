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
