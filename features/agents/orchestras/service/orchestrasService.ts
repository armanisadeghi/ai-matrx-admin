// features/agents/orchestras/service/orchestrasService.ts
//
// Service layer for Orchestras. This is a THIN orchestration over the canonical
// association chokepoint — it owns NO new mutation path:
//
//   • Writes → `associationsService` (assoc_add / assoc_remove / assoc_set_targets)
//   • List   → the `orchestra_list()` RPC (the one read the assoc_* family lacks)
//
// An Orchestra = an conductor agent + edges:
//   marker : (agent:X) --role 'orchestra'--> (agent:X)   [config + existence]
//   member : (agent:X) --role 'member'-----> (agent:Y)   [ordered by position]

//
// Like associationsService, every method returns a `RecordsResult` and NEVER
// throws. See features/agents/docs/ORCHESTRAS.md.

"use client";

import { mapThrownError } from "@ai-matrx/records/core";
import { isRecordsErr, type RecordsResult } from "@ai-matrx/records";
import { supabase } from "@/utils/supabase/client";
import { requireUserId } from "@/utils/auth/getUserId";
import { ok, err } from "@/features/scopes/service/rpcResult";
import { associationsService } from "@/features/scopes/service/associationsService";
import { fromAssociations } from "@/features/scopes/service/associationResult";
import type { Json } from "@/types/database.types";
import {
  AGENT_TOKEN,
  MEMBER_ROLE,
  POSITION_TOKEN,
  seatMemberRefusal,
  ORCHESTRA_MARKER_ROLE,
  isOrchestraMarkerRole,
  isOrchestraDepthBudget,
  isOrchestraMode,
  isOrchestraResultMode,
  DEFAULT_ORCHESTRA_RESULT_MODE,
} from "../constants";
import { parseMemberContext, memberContextToWire, type MemberContext } from "../memberContext";
import type {
  OrchestraConfig,
  OrchestraDetail,
  OrchestraListRow,
  OrchestraMember,
  OrchestraMemberMeta,
  OrchestraSeatMember,
  OrchestraSummary,
} from "../types";

// ─── mappers ──────────────────────────────────────────────────────────

function asRecord(meta: Json | null | undefined): Record<string, unknown> {
  return meta && typeof meta === "object" && !Array.isArray(meta)
    ? (meta as Record<string, unknown>)
    : {};
}

function metaToConfig(meta: Json | null | undefined): OrchestraConfig {
  const m = asRecord(meta);
  const cfg: OrchestraConfig = {};
  if (typeof m.accent === "string") cfg.accent = m.accent as OrchestraConfig["accent"];
  if (typeof m.tagline === "string") cfg.tagline = m.tagline;
  if (isOrchestraMode(m.mode)) cfg.mode = m.mode;
  // Wire key is snake_case (the server reads metadata.depth_budget); tolerate
  // jsonb float widening, ignore anything the server would reject.
  const rawBudget =
    typeof m.depth_budget === "number" && Number.isInteger(m.depth_budget)
      ? m.depth_budget
      : undefined;
  if (isOrchestraDepthBudget(rawBudget)) cfg.depthBudget = rawBudget;
  if (m.conductorPos && typeof m.conductorPos === "object") {
    const p = m.conductorPos as Record<string, unknown>;
    if (typeof p.x === "number" && typeof p.y === "number") {
      cfg.conductorPos = { x: p.x, y: p.y };
    }
  }
  return cfg;
}

// The ONE OrchestraConfig -> marker-metadata serializer. camelCase fields ride
// verbatim; server-read keys keep their wire names (`depth_budget` — the
// aidream runtime strict-parses it, so an out-of-range value is never written).
function configToMeta(cfg: OrchestraConfig): Json {
  const { depthBudget, ...rest } = cfg;
  return {
    ...rest,
    ...(isOrchestraDepthBudget(depthBudget) ? { depth_budget: depthBudget } : {}),
  } as Json;
}

/** The member-edge metadata keys the builder edits; every other key is carried through. */
const BUILDER_MEMBER_META_KEYS = new Set(["gap", "pos", "required", "result_mode"]);

function extraMemberMeta(meta: Json | null | undefined): Record<string, Json> {
  const out: Record<string, Json> = {};
  for (const [k, v] of Object.entries(asRecord(meta))) {
    if (!BUILDER_MEMBER_META_KEYS.has(k)) out[k] = v as Json;
  }
  return out;
}

/** Each member edge's typed payload (the connection setting), read beside the edge list. */
async function memberPayloads(
  edgeIds: string[],
): Promise<Map<string, { payload_kind: string | null; payload: unknown }>> {
  const out = new Map<string, { payload_kind: string | null; payload: unknown }>();
  for (let i = 0; i < edgeIds.length; i += 200) {
    const { data, error } = await supabase
      .schema("platform")
      .from("associations")
      .select("id, payload_kind, payload")
      .in("id", edgeIds.slice(i, i + 200))
      .is("deleted_at", null);
    if (error) throw error;
    for (const row of (data ?? []) as { id: string; payload_kind: string | null; payload: unknown }[]) {
      out.set(row.id, { payload_kind: row.payload_kind, payload: row.payload });
    }
  }
  return out;
}

// Per-member metadata jsonb holds ONLY gap + saved position. The member's role
// title lives in the association's `label` column (see load()/addMember()).
function metaToMemberMeta(
  meta: Json | null | undefined,
): Pick<OrchestraMemberMeta, "gap" | "pos" | "required" | "resultMode"> {
  const m = asRecord(meta);
  const out: Pick<OrchestraMemberMeta, "gap" | "pos" | "required" | "resultMode"> = {};
  if (typeof m.gap === "string") out.gap = m.gap;
  // Strict bool — mirrors the server's strict parse (a string "true" is not a declaration).
  if (m.required === true) out.required = true;
  // Wire key is snake_case (the server reads metadata.result_mode). Strict —
  // the server REFUSES to run an unrecognized value, so the builder must never
  // present one as if it were saved.
  if (isOrchestraResultMode(m.result_mode)) out.resultMode = m.result_mode;
  if (m.pos && typeof m.pos === "object") {
    const p = m.pos as Record<string, unknown>;
    if (typeof p.x === "number" && typeof p.y === "number") out.pos = { x: p.x, y: p.y };
  }
  return out;
}

function rowToSummary(r: OrchestraListRow): OrchestraSummary {
  return {
    conductorId: r.conductor_id,
    name: r.name,
    description: r.description ?? null,
    label: r.label ?? null,
    config: metaToConfig(r.metadata),
    memberCount: r.member_count ?? 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ─── service ──────────────────────────────────────────────────────────

export const orchestrasService = {
  /** Enumerate every Orchestra the caller can see (conductors + member counts). */
  async list(): Promise<RecordsResult<OrchestraSummary[]>> {
    try {
      requireUserId();
      const { data, error } = await supabase.schema("agent").rpc("orchestra_list");
      if (error) return { ok: false as const, error: mapThrownError(error, "orchestrasService") };
      const rows = (Array.isArray(data) ? data : []) as unknown as OrchestraListRow[];
      return ok(rows.map(rowToSummary));
    } catch (e) {
      return { ok: false, error: mapThrownError(e, "orchestrasService") };
    }
  },

  /** Load one Orchestra's marker config + ordered members in a single round-trip. */
  async load(conductorId: string): Promise<RecordsResult<OrchestraDetail>> {
    const res = fromAssociations(await associationsService.listForSources(
      AGENT_TOKEN,
      [conductorId],
      AGENT_TOKEN,
    ));
    if (isRecordsErr(res)) return res;

    // People in the Orchestra: member edges to org-chart seats (agent.position).
    const seatRes = fromAssociations(await associationsService.listForSources(
      AGENT_TOKEN,
      [conductorId],
      POSITION_TOKEN,
    ));
    if (isRecordsErr(seatRes)) return seatRes;
    const seats: OrchestraSeatMember[] = seatRes.data.edges
      .filter((e) => e.role === MEMBER_ROLE)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((e, i) => ({ edgeId: e.id, positionId: e.targetId, position: e.position ?? i, roleTitle: e.label ?? null }));

    const edges = res.data.edges;
    const marker = edges.find(
      (e) => isOrchestraMarkerRole(e.role) && e.targetId === conductorId,
    );
    const memberEdges = edges.filter((e) => e.role === MEMBER_ROLE);
    let payloads: Awaited<ReturnType<typeof memberPayloads>>;
    try {
      payloads = await memberPayloads(memberEdges.map((e) => e.id));
    } catch (e) {
      return { ok: false, error: mapThrownError(e, "orchestrasService") };
    }
    const members: OrchestraMember[] = memberEdges
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((e, i) => {
        const meta = metaToMemberMeta(e.metadata);
        const stored = payloads.get(e.id);
        const parsed = parseMemberContext(stored?.payload_kind ?? null, stored?.payload ?? null);
        return {
          edgeId: e.id,
          agentId: e.targetId,
          position: e.position ?? i,
          roleTitle: e.label ?? null, // role title = the association's label column
          gap: meta.gap ?? null,
          pos: meta.pos ?? null,
          required: meta.required === true,
          resultMode: meta.resultMode ?? DEFAULT_ORCHESTRA_RESULT_MODE,
          context: parsed.context,
          contextVersion: parsed.version,
          contextError: parsed.error,
          extraMeta: extraMemberMeta(e.metadata),
        };
      });

    return ok({
      conductorId,
      exists: Boolean(marker),
      label: marker?.label ?? null,
      config: metaToConfig(marker?.metadata),
      members,
      seats,
    });
  },

  /** Create (or re-mark) an Orchestra by writing the conductor's `orchestra` self-edge. */
  async create(
    conductorId: string,
    opts?: { label?: string; config?: OrchestraConfig },
  ): Promise<RecordsResult<{ id: string }>> {
    return fromAssociations(await associationsService.add({
      sourceType: AGENT_TOKEN,
      sourceId: conductorId,
      targetType: AGENT_TOKEN,
      targetId: conductorId,
      role: ORCHESTRA_MARKER_ROLE,
      label: opts?.label,
      metadata: configToMeta(opts?.config ?? {}),
    }));
  },

  /** Persist Orchestra-level config (accent / tagline / conductor position). */
  async saveConfig(
    conductorId: string,
    args: { label?: string; config: OrchestraConfig },
  ): Promise<RecordsResult<{ id: string }>> {
    // SAVE-TIME REFUSAL: a mode that cannot wait for a person never lands on an
    // Orchestra that seats one (the run would otherwise refuse it later).
    const refusal = seatMemberRefusal(args.config?.mode);
    if (refusal) {
      const current = await orchestrasService.load(conductorId);
      if (isRecordsErr(current)) return current;
      if (current.data.seats.length > 0) return err("refused_by_rule", refusal);
    }
    return fromAssociations(await associationsService.add({
      sourceType: AGENT_TOKEN,
      sourceId: conductorId,
      targetType: AGENT_TOKEN,
      targetId: conductorId,
      role: ORCHESTRA_MARKER_ROLE,
      label: args.label,
      metadata: configToMeta(args.config ?? {}),
    }));
  },

  /** Add (or upsert) a member with its position + authored role/gap metadata. */
  async addMember(
    conductorId: string,
    memberId: string,
    args?: { position?: number; meta?: OrchestraMemberMeta; extraMeta?: Record<string, Json> },
  ): Promise<RecordsResult<{ id: string }>> {
    const meta = args?.meta ?? {};
    return fromAssociations(await associationsService.add({
      sourceType: AGENT_TOKEN,
      sourceId: conductorId,
      targetType: AGENT_TOKEN,
      targetId: memberId,
      role: MEMBER_ROLE,
      // role title → the canonical `label` column; only gap + saved position ride metadata
      label: meta.roleTitle,
      position: args?.position,
      // `required` is written ONLY as a JSON true — the server (and this
      // service's reader) strict-parse it, so no false/undefined noise on edges.
      // `result_mode` (wire key, snake_case) is written only when it is NOT the
      // default: the server treats an absent key as "inline", so an all-default
      // roster leaves edges exactly as they were before D-40.
      // assoc_add REPLACES metadata whole: every key the builder does not edit (a job link's
      // `mandate_key`, dag `depends_on` / `when`) rides back unchanged, first.
      metadata: {
        ...(args?.extraMeta ?? {}),
        gap: meta.gap,
        pos: meta.pos,
        ...(meta.required === true ? { required: true } : {}),
        ...(isOrchestraResultMode(meta.resultMode) &&
        meta.resultMode !== DEFAULT_ORCHESTRA_RESULT_MODE
          ? { result_mode: meta.resultMode }
          : {}),
      } as Json,
    }));
  },

  /**
   * Save one member's connection setting (context passthrough) through the version-checked
   * door: it lands only while the edge is still at `expectedVersion`; otherwise
   * `conflict` (someone saved since this was read — reload, never overwrite).
   */
  async saveMemberContext(
    edgeId: string,
    context: MemberContext,
    expectedVersion: number,
  ): Promise<RecordsResult<{ version: number }>> {
    try {
      const { data, error } = await supabase
        .schema("agent")
        .rpc("orchestra_member_set_context", {
          p_edge_id: edgeId,
          p_context: memberContextToWire(context),
          p_expected_version: expectedVersion,
        });
      // A stale save is PT409 → `stale_write` (the package's mapping): reload, never overwrite.
      if (error) return { ok: false as const, error: mapThrownError(error, "orchestrasService") };
      const version = (data as { version?: unknown } | null)?.version;
      return ok({ version: typeof version === "number" ? version : expectedVersion + 1 });
    } catch (e) {
      return { ok: false, error: mapThrownError(e, "orchestrasService") };
    }
  },

  /**
   * Seat a PERSON in the Orchestra: a member edge to an org-chart position. The
   * run asks whoever holds the seat when it reaches them. Refused, by name, for
   * a Supervisor Orchestra (it cannot wait for a person).
   */
  async addSeatMember(
    conductorId: string,
    positionId: string,
    args?: { position?: number; roleTitle?: string },
  ): Promise<RecordsResult<{ id: string }>> {
    const current = await orchestrasService.load(conductorId);
    if (isRecordsErr(current)) return current;
    const refusal = seatMemberRefusal(current.data.config.mode);
    if (refusal) return err("refused_by_rule", refusal);
    return fromAssociations(await associationsService.add({
      sourceType: AGENT_TOKEN,
      sourceId: conductorId,
      targetType: POSITION_TOKEN,
      targetId: positionId,
      role: MEMBER_ROLE,
      label: args?.roleTitle,
      position: args?.position ?? current.data.members.length + current.data.seats.length,
    }));
  },

  /** Take a person (seat) out of the Orchestra. */
  async removeSeatMember(conductorId: string, positionId: string): Promise<RecordsResult<null>> {
    return fromAssociations(await associationsService.remove({
      sourceType: AGENT_TOKEN,
      sourceId: conductorId,
      targetType: POSITION_TOKEN,
      targetId: positionId,
      role: MEMBER_ROLE,
    }));
  },

  /** Remove one member (role-scoped: never touches the marker self-edge). */
  async removeMember(
    conductorId: string,
    memberId: string,
  ): Promise<RecordsResult<null>> {
    return fromAssociations(await associationsService.remove({
      sourceType: AGENT_TOKEN,
      sourceId: conductorId,
      targetType: AGENT_TOKEN,
      targetId: memberId,
      role: MEMBER_ROLE,
    }));
  },

  /** Delete an Orchestra: clear all members (role-scoped) then drop the marker. */
  async deleteOrchestra(conductorId: string): Promise<RecordsResult<null>> {
    const cleared = fromAssociations(await associationsService.setTargets({
      sourceType: AGENT_TOKEN,
      sourceId: conductorId,
      targetType: AGENT_TOKEN,
      targetIds: [],
      role: MEMBER_ROLE,
    }));
    if (isRecordsErr(cleared)) return cleared;
    const seatsCleared = fromAssociations(await associationsService.setTargets({
      sourceType: AGENT_TOKEN,
      sourceId: conductorId,
      targetType: POSITION_TOKEN,
      targetIds: [],
      role: MEMBER_ROLE,
    }));
    if (isRecordsErr(seatsCleared)) return seatsCleared;
    return fromAssociations(await associationsService.remove({
      sourceType: AGENT_TOKEN,
      sourceId: conductorId,
      targetType: AGENT_TOKEN,
      targetId: conductorId,
      role: ORCHESTRA_MARKER_ROLE,
    }));
  },
};
