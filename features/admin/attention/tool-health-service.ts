import { createClient } from "@/utils/supabase/client";
import type { ToolHealthRow } from "./sources/tool-health";

/**
 * The generated database types predate this function (tool.control_for_attention); the next
 * regeneration of types/database.types.ts adds it. The call is typed by hand until then.
 */
type LooseRpc = {
  rpc: (fn: string) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

/** Every Tool source (or vendor account) the breaker switched off that no verification run has put back on yet. */
export async function fetchToolHealth(): Promise<ToolHealthRow[]> {
  const { data, error } = await (createClient().schema("tool") as unknown as LooseRpc).rpc("control_for_attention");
  if (error) throw new Error(error.message);
  return (data ?? []) as ToolHealthRow[];
}
