/**
 * Agent Factory builds — reads straight from the execution spine (React →
 * Supabase; the platform-admin read policy on `runtime.*` is what lets the
 * admin seat see every build), and the ONE write (start a build) through
 * aidream's `POST /agent-factory/builds`, because a build is server work.
 *
 * Reads never go through `GET /agent-factory/builds/{id}`: it returns the same
 * latest checkpoint this reads directly (data-flow law: the Python server is
 * not a DB gateway).
 */

import { plainBuildState } from "./plain-stop-reason";
import { mandateDisplayName } from "@/features/mandates/mandate-words";
import { createClient } from "@/utils/supabase/client";
import { operationFailed } from "@/utils/errors";
import { keepBuild, startBuild } from "@ai-matrx/api/agents";
import { serverApi, callOptionsFrom } from "@/lib/api/server-api";
import { readAllRows } from "@ai-matrx/data/db";
import type { AppDispatch } from "@/lib/redux/store";
import { getStoreSingleton } from "@/lib/redux/store-singleton";
import { resolveBuildEngine } from "./build-engine";
import { startBuildRun } from "./build-run-service";
import { followServerWork } from "@/features/ai-watch/followed-work";
import { storedMandateKey, type AnyMandateKey } from "@ai-matrx/agents/mandates";
import { applyServerTableState, type ServerTableSpec } from "@/features/admin/shared/server-table/postgrest";
import type { MatrxDataTableQueryState } from "@ai-matrx/design-system/data-table/types";
import type { FactoryBuildDetail, FactoryBuildRow, FactoryBuildState } from "./types";

export const AGENT_FACTORY_BUILD_TYPE = "agent_factory_build";

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

interface CheckpointSummary {
  created_at: string;
  status: unknown;
  current_step: unknown;
  outcome: unknown;
  send_backs: unknown;
  agent_id: unknown;
  mandate_key: unknown;
  name: unknown;
  display_name: unknown;
  verdict: unknown;
  error: unknown;
  door: unknown;
  engine: unknown;
  origin: unknown;
  idem: unknown;
}

/**
 * Each build with only the facts the list shows, read as JSON paths off its
 * newest checkpoint (one embedded row) — never the whole multi-KB state.
 * Typed as `string` on purpose: the JSON-path select is past what the
 * generated select parser can instantiate (TS2589); the row is read below.
 */
const LIST_SELECT: string =
  "id, status, created_at, started_at, ended_at, user_id:context->>user_id, origin_class:context->>origin_class, global_execution_checkpoint(created_at, status:state->>status, current_step:state->>current_step, outcome:state->>outcome, send_backs:state->send_backs, agent_id:state->>agent_id, mandate_key:state->request->>mandate_key, name:state->request->spec->>name, display_name:state->request->spec->>display_name, verdict:state->steps->proof_review->answer->>verdict, error:state->>error, door:state->request->>door, engine:state->>engine, origin:state->request->>origin, idem:state->request->>idempotency_key)";

interface ListRow {
  id: string;
  status: string;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  user_id: string | null;
  origin_class: string | null;
  global_execution_checkpoint: CheckpointSummary[] | null;
}

/** The key family: the part of an idempotency key before its first colon (`system-plan`, `admin-factory`, `person-build`). */
function keyFamilyOf(key: string | null): string | null {
  if (!key) return null;
  const head = key.split(":")[0];
  return head || null;
}

function mapRows(rows: ListRow[]): FactoryBuildRow[] {
  return (rows as ListRow[]).map((row) => {
    const checkpoints = row.global_execution_checkpoint ?? [];
    const cp = checkpoints[0];
    const sendBacks = cp && typeof cp.send_backs === "number" ? cp.send_backs : 0;
    return {
      id: row.id,
      spineStatus: row.status,
      createdAt: row.created_at,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      mandateKey: str(cp?.mandate_key) ? storedMandateKey(str(cp?.mandate_key)!) : null,
      name: str(cp?.display_name) ?? str(cp?.name),
      currentStep: str(cp?.current_step),
      // Old builds (and a worker that died before writing one) carry no outcome: a spine row that
      // ended failed/cancelled reads "failed"; a running one has none yet.
      outcome: str(cp?.outcome) ?? (row.status === "failed" || row.status === "cancelled" ? "failed" : null),
      sendBacks,
      verdict: str(cp?.verdict),
      agentId: str(cp?.agent_id),
      error: str(cp?.error),
      door: str(cp?.door),
      engine: str(cp?.engine) ?? "pipeline",
      origin: str(cp?.origin),
      keyFamily: keyFamilyOf(str(cp?.idem)),
      originClass: str(row.origin_class),
      userId: str(row.user_id),
      cost: null,
    };
  });
}

/** Builds this admin query state asks for, one page; search/filter/sort/page are answered by the database. */
const BUILD_WHO = "metadata->>build_who";
const BUILD_PLACE = "metadata->>build_place";
const BUILD_MANDATE = "metadata->>build_mandate_key";
const BUILD_AGENT_NAME = "metadata->>build_agent_name";
const BUILD_OUTCOME = "metadata->>build_outcome";

export const FACTORY_BUILD_TABLE_SPEC: ServerTableSpec = {
  // Door, starter, job and outcome are stamped on the build's root row (`metadata.build_*`, aidream
  // agent_factory/root_facts.py), so the database filters, sorts and searches them.
  searchColumns: [BUILD_WHO, BUILD_MANDATE, BUILD_AGENT_NAME, BUILD_PLACE],
  text: { who: BUILD_WHO, mandate: BUILD_MANDATE },
  select: { status: "status", door: BUILD_PLACE, outcome: BUILD_OUTCOME },
  date: { started: "created_at" },
  sort: {
    started: "created_at",
    status: "status",
    who: BUILD_WHO,
    door: BUILD_PLACE,
    mandate: BUILD_MANDATE,
    outcome: BUILD_OUTCOME,
  },
  defaultSort: { column: "created_at", ascending: false },
};

export async function listFactoryBuildsPage(
  state: MatrxDataTableQueryState,
): Promise<{ rows: FactoryBuildRow[]; total: number }> {
  const supabase = createClient();
  const base = supabase
    .schema("runtime")
    .from("global_execution")
    .select(LIST_SELECT, { count: "exact" })
    .eq("type", AGENT_FACTORY_BUILD_TYPE)
    .order("created_at", { referencedTable: "global_execution_checkpoint", ascending: false })
    .limit(1, { referencedTable: "global_execution_checkpoint" });
  const { data, error, count } = await applyServerTableState(base, state, FACTORY_BUILD_TABLE_SPEC);
  if (error) throw operationFailed("load the Agent Factory builds", error);
  return { rows: mapRows((data ?? []) as unknown as ListRow[]), total: count ?? 0 };
}

/** Every build started in the last `days` days, for the doors table's counts (not a page: counts must cover them all). */
export async function listFactoryBuildsSince(days: number): Promise<FactoryBuildRow[]> {
  const supabase = createClient();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const rows = await readAllRows<ListRow>(
    ({ from, to }) =>
      supabase
        .schema("runtime")
        .from("global_execution")
        .select(LIST_SELECT, { count: "exact" })
        .eq("type", AGENT_FACTORY_BUILD_TYPE)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .order("created_at", { referencedTable: "global_execution_checkpoint", ascending: false })
        .limit(1, { referencedTable: "global_execution_checkpoint" })
        .range(from, to) as never,
    { label: "runtime.global_execution (agent_factory_build)" },
  );
  return mapRows(rows);
}

export async function getFactoryBuild(buildId: string, signal?: AbortSignal): Promise<FactoryBuildDetail | null> {
  const supabase = createClient();
  let execQuery = supabase
    .schema("runtime")
    .from("global_execution")
    .select("id, status, created_at, started_at, ended_at")
    .eq("id", buildId)
    .eq("type", AGENT_FACTORY_BUILD_TYPE);
  if (signal) execQuery = execQuery.abortSignal(signal);
  const { data: exec, error: execError } = await execQuery.maybeSingle();
  if (execError) throw operationFailed("load the Agent Factory build", execError);
  if (!exec) return null;
  // Opening a build is following it: its steps' AI calls show in Watch AI and the Builder panel.
  followServerWork({ kind: "factory_build", id: exec.id, label: "Agent Factory build", source: "build page" });

  let cpQuery = supabase
    .schema("runtime")
    .from("global_execution_checkpoint")
    .select("state, created_at")
    .eq("execution_id", buildId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (signal) cpQuery = cpQuery.abortSignal(signal);
  const { data: cp, error: cpError } = await cpQuery.maybeSingle();
  if (cpError) throw operationFailed("load the Agent Factory build's progress", cpError);

  return {
    id: exec.id,
    spineStatus: exec.status,
    createdAt: exec.created_at,
    startedAt: exec.started_at,
    endedAt: exec.ended_at,
    checkpointAt: cp?.created_at ?? null,
    state: plainBuildState((cp?.state ?? null) as FactoryBuildState | null),
  };
}

/** Which of these step conversations were kept (a system run may keep none). */
export async function keptConversationIds(ids: string[]): Promise<Set<string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Set();
  const supabase = createClient();
  const rows = await readAllRows<{ id: string }>(
    ({ from, to }) =>
      supabase
        .schema("chat")
        .from("conversation")
        .select("id", { count: "exact" })
        .in("id", unique)
        .order("id", { ascending: true })
        .range(from, to),
    { label: "chat.conversation" },
  );
  return new Set(rows.map((r) => r.id));
}

export interface FactoryMandateOption {
  key: AnyMandateKey;
  label: string;
  outputKind: string | null;
  hasHolder: boolean;
}

/**
 * Mandates a build can target. Every live mandate is offered; one with no
 * Holder is marked (the brief: "ignore things that have mandates and they
 * simply don't have agents yet" — they stay pickable, never hidden).
 */
export async function listFactoryMandates(): Promise<FactoryMandateOption[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .schema("mandate")
    .from("definition")
    .select("mandate_key, label, output_kind, default_holder_id")
    .is("deleted_at", null)
    .order("mandate_key", { ascending: true })
    .limit(2000);
  if (error) throw operationFailed("load the mandates", error);
  return (data ?? []).map((m) => ({
    key: storedMandateKey(m.mandate_key),
    label: mandateDisplayName(storedMandateKey(m.mandate_key), m.label),
    outputKind: m.output_kind ?? null,
    hasHolder: Boolean(m.default_holder_id),
  }));
}

export interface StartFactoryBuildInput {
  mandateKey: AnyMandateKey;
  /** Caller lock: the model the built agent must use. */
  modelId?: string | null;
}

/** POST /agent-factory/builds → the new build id (202; the build runs detached). */
export async function startFactoryBuild(input: StartFactoryBuildInput): Promise<string> {
  const slug = input.mandateKey.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
  const body = {
    spec: {
      name: `${slug}_factory`,
      display_name: `${input.mandateKey} (Agent Factory build)`,
      ...(input.modelId ? { model_id: input.modelId } : {}),
    },
    mandate_key: input.mandateKey,
    idempotency_key: `admin-factory:${input.mandateKey}:${crypto.randomUUID()}`,
  };
  const data = await startBuild(serverApi, { body: body as never }, callOptionsFrom());
  if (!data?.build_id) throw new Error("The Agent Factory did not return a build id");
  followServerWork({ kind: "factory_build", id: data.build_id, label: "Agent Factory build", source: "Agent Factory admin" });
  return data.build_id;
}

/* ------------------------------------------------- person-owned build doors */

export interface StartAgentBuildInput {
  /** The spec as the server's `AgentSpec` (name, purpose, variables, sample_inputs …). */
  spec: Record<string, unknown>;
  mandateKey?: AnyMandateKey | null;
  /** R34 "Build unproven": save with fewer than 3 examples, judged on its first 3 runs. */
  unproven?: boolean;
  idempotencyKey?: string;
  /** The browser door starting it (aidream `pipeline_door.DOORS`), recorded on the build. */
  door?: string | null;
  /** A platform builtin (a mandate's system rung). The server honors it for admins only. */
  builtin?: boolean;
  /** The organization the agent is born in, when the door names one (an org rung). */
  organizationId?: string;
}

/**
 * POST /agent-factory/builds for the signed-in person (202; the build is theirs and
 * runs detached). Every door's UI starts builds through this one call.
 */
/**
 * The key family a person's build runs under. A Studio build opened from an Orchestra Studio plan
 * (`?from=system-plan`) is `system-plan`, so the factory page can count Orchestra Studio's builds
 * from what each build recorded rather than guess.
 */
export function personBuildKeyFamily(door: string | null | undefined, search?: string): string {
  const query = search ?? (typeof window === "undefined" ? "" : window.location.search);
  if (door === "studio" && new URLSearchParams(query).get("from") === "system-plan") return "system-plan";
  return "person-build";
}

export async function startAgentBuild(input: StartAgentBuildInput): Promise<string> {
  const dispatch = getStoreSingleton()?.dispatch as AppDispatch | undefined;
  // The door's engine (see build-engine.ts). An admin's builtin build (a mandate's system rung) stays on the
  // server route: it is the one build the old pipeline still runs, until the owner rules on it (lane 3A-k).
  if (!input.builtin && dispatch && input.organizationId && (await resolveBuildEngine(input.door)) === "workflow") {
    return startBuildRun(dispatch, {
      spec: input.spec,
      mandateKey: input.mandateKey ?? null,
      unproven: input.unproven,
      door: input.door,
      organizationId: input.organizationId,
    });
  }
  const data = await startBuild(
    serverApi,
    {
      body: {
        spec: input.spec,
        mandate_key: input.mandateKey ?? null,
        unproven: input.unproven ?? false,
        idempotency_key: input.idempotencyKey ?? `${personBuildKeyFamily(input.door)}:${crypto.randomUUID()}`,
        ...(input.door ? { door: input.door } : {}),
        ...(input.builtin ? { builtin: true } : {}),
      } as never,
    },
    callOptionsFrom(input.organizationId ? { organizationId: input.organizationId } : {}),
  );
  if (!data?.build_id) throw new Error("The Agent Factory did not return a build id");
  followServerWork({ kind: "factory_build", id: data.build_id, label: "Agent Factory build", source: input.door ?? "agent build" });
  return data.build_id;
}

/**
 * Keep it anyway on an old build (D7): the pipeline's own keep door (`POST /agent-factory/builds/{id}/keep`).
 * The server un-archives the draft through the agent service's update (`crud.update_agent`), marks it
 * `kept_unproven` and queues the first-runs judgment, and refuses a reader who may not edit the agent.
 * The client never writes `agent.definition` itself.
 */
export async function keepBuildAnyway(buildId: string): Promise<string> {
  const data = await keepBuild(serverApi, { path: { build_id: buildId } });
  if (!data?.agent_id) throw new Error("The Agent Factory did not return the kept agent");
  return data.agent_id;
}
