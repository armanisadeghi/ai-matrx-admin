import { supabase } from "@/utils/supabase/client";
import { statusOf, type StepAgentStatus } from "./plan-progress";

export interface StepAgentInfo {
  id: string;
  name: string | null;
  status: StepAgentStatus;
}

/** Name and status of the agents a plan's steps use: one read, only when a plan is open. */
export async function readStepAgents(ids: string[]): Promise<Map<string, StepAgentInfo>> {
  const out = new Map<string, StepAgentInfo>();
  if (ids.length === 0) return out;
  const { data, error } = await supabase
    .schema("agent")
    .from("definition")
    .select("id, name, is_active, is_archived, deleted_at")
    .in("id", ids);
  if (error) throw error;
  const rows = new Map((data ?? []).map((r) => [r.id, r]));
  for (const id of ids) {
    const r = rows.get(id);
    out.set(id, { id, name: r?.name ?? null, status: statusOf(r) });
  }
  return out;
}
