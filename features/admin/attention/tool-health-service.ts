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
  // access-errors: ok — a super-admin read; the dock source reports a failed read loudly (loud: true)
  if (error) throw new Error(error.message);
  return (data ?? []) as ToolHealthRow[];
}

type LooseDecideRpc = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

/** Approve or decline one upkeep proposal by its alarm id (`tool.control_decide_proposal`, super-admin only). */
export async function decideToolProposal(alarmId: string, decision: "approve" | "decline", note?: string): Promise<{ note: string }> {
  const { data, error } = await (createClient().schema("tool") as unknown as LooseDecideRpc).rpc("control_decide_proposal", {
    p_alarm: alarmId,
    p_decision: decision,
    p_note: note ?? null,
  });
  // access-errors: ok — the database refuses in its own sentence; the record page shows it as an error toast
  if (error) throw new Error(error.message);
  return data as { note: string };
}
