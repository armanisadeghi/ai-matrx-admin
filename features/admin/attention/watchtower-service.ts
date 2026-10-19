import { createClient } from "@/utils/supabase/client";
import type { WatchtowerRow } from "./sources/watchtower";

type LooseRpc = {
  rpc: (fn: string) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

/** Failing or degraded features plus the daily note (`tool.watchtower_for_attention`, super-admin only). */
export async function fetchWatchtower(): Promise<WatchtowerRow[]> {
  const { data, error } = await (createClient().schema("tool") as unknown as LooseRpc).rpc("watchtower_for_attention");
  // access-errors: ok — a super-admin read; the dock source reports a failed read loudly (loud: true)
  if (error) throw new Error(error.message);
  return (data ?? []) as WatchtowerRow[];
}
