/**
 * features/admin/repair-runs/api.ts — the three calls behind the Repair Runs page.
 *
 * React → Python directly (CLAUDE.md data flow). Server: aidream
 * `aidream/api/routers/admin_platform_repair.py` (super admin only), logic in
 * `aidream/services/platform_repair/service.py`. The descriptors ride the ONE client
 * (`serverApi`); swap them for the generated `@ai-matrx/api/architecture` operations once the
 * package carries them.
 */

import type { OperationDescriptor } from "@ai-matrx/api";
import { serverApi } from "@/lib/api/server-api";

export type SubjectKind = "system_error" | "feedback" | "check_finding";
/** `mine`: the admin's own box (their vault, cloud browser, GitHub). `platform`: the platform's box. */
export type BoxChoice = "mine" | "platform";

export interface StartRunInput {
  agentId: string;
  instructions: string;
  subjectKind: SubjectKind | null;
  box: BoxChoice;
  subjectId: string | null;
}

export interface StartedRun {
  conversation_id: string;
  request_id: string;
  sandbox_instance_id: string;
  sandbox_id: string;
  box: BoxChoice;
  agent_id: string;
  agent_name: string;
  title: string;
}

export interface RepairBirth {
  launched_by?: string;
  launched_at?: string;
  sandbox_instance_id?: string;
  sandbox_id?: string;
  box?: BoxChoice;
  subject?: { kind: SubjectKind; id: string; label: string; title: string } | null;
}

export interface RepairRun {
  id: string;
  title: string | null;
  created_by: string | null;
  initial_agent_id: string | null;
  sandbox_instance_id: string | null;
  last_request_status: string | null;
  last_activity_at: string | null;
  created_at: string | null;
  message_count: number | null;
  repair: RepairBirth | null;
}

export interface PlatformBox {
  owner_user_id: string;
  organization_id: string;
  box: {
    id: string;
    sandbox_id: string | null;
    status: string | null;
    tier: string | null;
    template: string | null;
    last_heartbeat_at: string | null;
  } | null;
}

const START_RUN: OperationDescriptor = {
  m: "POST",
  p: "/admin/platform-repair/runs",
  d: "aidream",
  a: "admin",
  o: "required",
  n: "architecture.start_repair_run",
};
const LIST_RUNS: OperationDescriptor = {
  m: "GET",
  p: "/admin/platform-repair/runs",
  d: "aidream",
  a: "admin",
  o: "exempt",
  n: "architecture.list_repair_runs",
};
const PLATFORM_BOX: OperationDescriptor = {
  m: "GET",
  p: "/admin/platform-repair/box",
  d: "aidream",
  a: "admin",
  o: "exempt",
  n: "architecture.platform_box",
};

export async function startRepairRun(input: StartRunInput): Promise<StartedRun> {
  return serverApi.call<StartedRun>(START_RUN, {
    body: {
      agent_id: input.agentId,
      instructions: input.instructions,
      subject_kind: input.subjectKind,
      subject_id: input.subjectId,
      box: input.box,
    },
  });
}

export async function listRepairRuns(): Promise<RepairRun[]> {
  const data = await serverApi.call<{ runs: RepairRun[] }>(LIST_RUNS, { query: { limit: 100 } });
  return data.runs;
}

export async function readPlatformBox(): Promise<PlatformBox> {
  return serverApi.call<PlatformBox>(PLATFORM_BOX, {});
}
