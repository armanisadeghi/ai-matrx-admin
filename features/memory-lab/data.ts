/**
 * Memory Lab — data. Trials and steps are read and written directly in Supabase (admin reads ride
 * the admin lane on /administration). The client creates trials, edits title / agents / bindings /
 * notes and archives; it never writes `files` or a step — the server's apply door does.
 * Server: aidream/services/agent_memory (capture points + POST /memory-lab/trials/{id}/apply).
 */
import { mergeJsonColumn, readAllRows } from "@ai-matrx/data/db";
import { extractErrorMessage } from "@/utils/errors";
import { callApi } from "@/lib/api/call-api";
import type { AppDispatch } from "@/lib/redux/store";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { loadProvisionSnapshot, type ProvisionSnapshot } from "@/features/provision-window/data";
import type { Json } from "@/types/database.types";
import { supabase } from "@/utils/supabase/client";
import {
  asRecord,
  parseBindings,
  parseFiles,
  parseOutput,
  parsePendingRuns,
  parseResults,
  parseRole,
  parseStepStatus,
  stringList,
  variableNames,
  type CandidateConversation,
  type LabAgent,
  type MemoryRole,
  type MemoryTrial,
  type MemoryTrialStep,
  type PendingRun,
  type TrialBindings,
} from "./types";

const chat = () => supabase.schema("chat");

const TRIAL_COLUMNS =
  "id, title, subject_user_id, status, files, reviewer_agent_id, reflect_agent_id, steward_agent_id, bindings, notes, organization_id, metadata, created_at, updated_at";

type TrialRow = {
  id: string;
  title: string;
  subject_user_id: string;
  status: string;
  files: Json;
  reviewer_agent_id: string | null;
  reflect_agent_id: string | null;
  steward_agent_id: string | null;
  bindings: Json;
  notes: string | null;
  organization_id: string;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

function toTrial(row: TrialRow): MemoryTrial {
  const metadata = asRecord(row.metadata) as Record<string, Json | undefined>;
  return {
    id: row.id,
    title: row.title,
    subjectUserId: row.subject_user_id,
    subjectLabel: typeof metadata.subject_label === "string" ? metadata.subject_label : "",
    status: row.status === "archived" ? "archived" : "open",
    files: parseFiles(row.files),
    agents: {
      review: row.reviewer_agent_id,
      reflect: row.reflect_agent_id,
      steward: row.steward_agent_id,
    },
    bindings: parseBindings(row.bindings),
    notes: row.notes ?? "",
    organizationId: row.organization_id,
    pendingRuns: parsePendingRuns(metadata),
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Every trial (open or archived), newest first. */
export async function listTrials(): Promise<MemoryTrial[]> {
  const rows = await readAllRows<TrialRow>(
    ({ from, to }) =>
      chat()
        .from("memory_trial")
        .select(TRIAL_COLUMNS, { count: "exact" })
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    { label: "chat.memory_trial" },
  );
  return rows.map(toTrial);
}

export async function loadTrial(id: string): Promise<MemoryTrial | null> {
  const { data, error } = await chat().from("memory_trial").select(TRIAL_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toTrial(data) : null;
}

export async function createTrial(input: {
  title: string;
  subjectUserId: string;
  subjectLabel: string;
}): Promise<MemoryTrial> {
  // The admin's active organization owns the trial (a write always carries an explicit org).
  const organizationId = await ensureOrgId(null);
  const { data, error } = await chat()
    .from("memory_trial")
    .insert({
      title: input.title,
      subject_user_id: input.subjectUserId,
      organization_id: organizationId,
      metadata: { subject_label: input.subjectLabel },
    })
    .select(TRIAL_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toTrial(data);
}

export type TrialPatch = {
  title?: string;
  notes?: string;
  status?: "open" | "archived";
  bindings?: TrialBindings;
  agent?: { role: MemoryRole; agentId: string | null };
};

export async function updateTrial(trial: MemoryTrial, patch: TrialPatch): Promise<MemoryTrial> {
  const update: {
    title?: string;
    notes?: string;
    status?: string;
    bindings?: Json;
    reviewer_agent_id?: string | null;
    reflect_agent_id?: string | null;
    steward_agent_id?: string | null;
  } = {};
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.notes !== undefined) update.notes = patch.notes;
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.bindings !== undefined) update.bindings = patch.bindings as Json;
  if (patch.agent) {
    const { role, agentId } = patch.agent;
    if (role === "review") update.reviewer_agent_id = agentId;
    else if (role === "reflect") update.reflect_agent_id = agentId;
    else update.steward_agent_id = agentId;
  }
  const { data, error } = await chat()
    .from("memory_trial")
    .update(update)
    .eq("id", trial.id)
    .select(TRIAL_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toTrial(data);
}

/**
 * Runs started and not yet applied live on `metadata.pending_runs`, so a reload can finish them.
 * A guarded jsonb merge: the server writes the same row (files) while a run applies.
 */
export async function savePendingRuns(
  trial: MemoryTrial,
  mutate: (pending: PendingRun[]) => PendingRun[],
): Promise<MemoryTrial> {
  type Versioned = TrialRow & { version: number };
  const columns = `${TRIAL_COLUMNS}, version`;
  const result = await mergeJsonColumn<Versioned>({
    fetchCurrent: () => chat().from("memory_trial").select(columns).eq("id", trial.id).maybeSingle(),
    readColumn: (row) => row.metadata,
    merge: (current) => ({ ...current, pending_runs: mutate(parsePendingRuns(current)) }),
    applyUpdate: ({ value, expectedVersion, nextVersion }) =>
      chat()
        .from("memory_trial")
        .update({ metadata: value as Json, version: nextVersion })
        .eq("id", trial.id)
        .eq("version", expectedVersion)
        .select(columns)
        .maybeSingle(),
  });
  if (result.status === "saved") return toTrial(result.row);
  if (result.status === "not_found") throw new Error("This trial no longer exists.");
  if (result.status === "conflict") throw new Error("The trial kept changing; try again.");
  throw new Error(extractErrorMessage(result.error));
}

const STEP_COLUMNS =
  "id, trial_id, seq, role, subject_conversation_id, agent_id, run_conversation_id, request_text, provision_snapshot_ids, status, output, results, files_before, files_after, error, created_at";

type StepRow = {
  id: string;
  trial_id: string;
  seq: number;
  role: string;
  subject_conversation_id: string | null;
  agent_id: string | null;
  run_conversation_id: string | null;
  request_text: string | null;
  provision_snapshot_ids: Json;
  status: string;
  output: Json | null;
  results: Json;
  files_before: Json;
  files_after: Json;
  error: string | null;
  created_at: string;
};

export function toStep(raw: unknown): MemoryTrialStep {
  const row = asRecord(raw) as Partial<StepRow>;
  const out = parseOutput(row.output);
  return {
    id: String(row.id ?? ""),
    trialId: String(row.trial_id ?? ""),
    seq: typeof row.seq === "number" ? row.seq : 0,
    role: parseRole(row.role),
    subjectConversationId: row.subject_conversation_id ?? null,
    agentId: row.agent_id ?? null,
    runConversationId: row.run_conversation_id ?? null,
    requestText: row.request_text ?? null,
    provisionSnapshotIds: stringList(row.provision_snapshot_ids),
    status: parseStepStatus(row.status),
    edits: out.edits,
    questions: out.questions,
    nothingBecause: out.nothingBecause,
    results: parseResults(row.results),
    filesBefore: parseFiles(row.files_before),
    filesAfter: parseFiles(row.files_after),
    error: row.error ?? null,
    createdAt: String(row.created_at ?? ""),
  };
}

/** Every step of a trial, in order. */
export async function listSteps(trialId: string): Promise<MemoryTrialStep[]> {
  const rows = await readAllRows<StepRow>(
    ({ from, to }) =>
      chat()
        .from("memory_trial_step")
        .select(STEP_COLUMNS, { count: "exact" })
        .eq("trial_id", trialId)
        .is("deleted_at", null)
        .order("seq", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    { label: "chat.memory_trial_step" },
  );
  return rows.map(toStep);
}

type AgentRow = {
  id: string;
  name: string;
  agent_type: string | null;
  is_chat_agent: boolean;
  variable_definitions: Json | null;
};

function toAgent(row: AgentRow): LabAgent {
  return {
    id: row.id,
    name: row.name,
    agentType: row.agent_type,
    isChatAgent: row.is_chat_agent,
    variables: variableNames(row.variable_definitions),
  };
}

/** Agents by id (name, chat flag, declared variables). */
export async function loadAgents(ids: string[]): Promise<Map<string, LabAgent>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const out = new Map<string, LabAgent>();
  // 200 ids per request keeps the PostgREST URL short.
  for (let i = 0; i < unique.length; i += 200) {
    const batch = unique.slice(i, i + 200);
    const { data, error } = await supabase
      .schema("agent")
      .from("definition")
      .select("id, name, agent_type, is_chat_agent, variable_definitions")
      .in("id", batch);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) out.set(row.id, toAgent(row));
  }
  return out;
}

type ConversationRow = {
  id: string;
  title: string | null;
  created_at: string;
  message_count: number;
  initial_agent_id: string | null;
};

/** The person's normal conversations, oldest first, each with its agent (two reads, no cross-schema join). */
export async function listPersonConversations(personId: string): Promise<CandidateConversation[]> {
  const rows = await readAllRows<ConversationRow>(
    ({ from, to }) =>
      chat()
        .from("conversation")
        .select("id, title, created_at, message_count, initial_agent_id", { count: "exact" })
        .eq("created_by", personId)
        .eq("conversation_type", "standard")
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    { label: "chat.conversation" },
  );
  const agents = await loadAgents(rows.map((r) => r.initial_agent_id ?? ""));
  return rows.map((r) => {
    const agent = r.initial_agent_id ? agents.get(r.initial_agent_id) : undefined;
    return {
      id: r.id,
      title: r.title,
      createdAt: r.created_at,
      messageCount: r.message_count,
      agentId: r.initial_agent_id,
      agentName: agent?.name ?? null,
      agentType: agent?.agentType ?? null,
      // A plain chat with no agent counts as a chat conversation (PLAN §2).
      isChat: r.initial_agent_id ? agent?.isChatAgent === true : true,
    };
  });
}

/**
 * Capture a memory provision point with FULL values. The lab always asks for values
 * (`debug_view=1`): it exists for an admin to read exactly what an agent would be sent. The saved
 * snapshot is then read back through the provision window's one parser.
 */
export async function captureLabProvision(
  dispatch: AppDispatch,
  pointKey: string,
  subjectId: string,
  organizationId: string,
): Promise<ProvisionSnapshot> {
  const result = await dispatch(
    callApi({
      // Not in the published api-types yet; the path is the server's (provision window door).
      path: "/provision-window/{point_key}/capture" as never,
      method: "POST",
      pathParams: { point_key: pointKey } as never,
      scopeOverrides: { organization_id: organizationId },
      body: { subject_id: subjectId, trigger: "manual" } as never,
      queryParams: { debug_view: "1" } as never,
    }),
  );
  if (result.error) throw new Error(result.error.message || "The provision could not be captured.");
  const id = asRecord(result.data).id;
  if (typeof id !== "string" || !id) throw new Error("The server captured no snapshot id.");
  return loadProvisionSnapshot(id);
}

export interface ApplyInput {
  role: MemoryRole;
  runConversationId: string;
  agentId: string;
  subjectConversationId: string | null;
  requestText: string | null;
  provisionSnapshotIds: string[];
}

/** Apply a finished run's `memory_edits` to the trial's sandbox store; returns the new step. */
export async function applyRun(
  dispatch: AppDispatch,
  trial: MemoryTrial,
  input: ApplyInput,
): Promise<MemoryTrialStep> {
  const result = await dispatch(
    callApi({
      path: "/memory-lab/trials/{trial_id}/apply" as never,
      method: "POST",
      pathParams: { trial_id: trial.id } as never,
      scopeOverrides: { organization_id: trial.organizationId },
      body: {
        role: input.role,
        run_conversation_id: input.runConversationId,
        agent_id: input.agentId,
        subject_conversation_id: input.subjectConversationId,
        request_text: input.requestText,
        provision_snapshot_ids: input.provisionSnapshotIds,
      } as never,
    }),
  );
  if (result.error) throw new Error(result.error.message || "The run could not be applied.");
  return toStep(result.data);
}
