/**
 * features/transcript-studio/service/studioService.ts
 *
 * Supabase CRUD for transcript-studio. Phase 1 covers studio_sessions only.
 * Child tables (raw / cleaned / concept / module / runs / settings) get
 * their own service helpers in subsequent phases.
 *
 * snake_case (DB) ↔ camelCase (domain) mapping happens here so callers
 * never see DB casing.
 */

import { supabase } from "@/utils/supabase/client";
import {
  NEW_SESSION_DEFAULT_TITLE,
  DEFAULT_MODULE_ID,
} from "../constants";
import type {
  CreateSessionInput,
  StudioSession,
  UpdateSessionInput,
} from "../types";

// The studio_* tables were created after the last DB types regeneration.
// Cast `from("studio_sessions")` through `unknown` to silence the strict
// table-name check until a follow-up regenerates types/database.types.ts.
// Runtime is unaffected — Supabase accepts any string.
type LooseSupabase = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};
const db = supabase as unknown as LooseSupabase;

// ── Mappers ───────────────────────────────────────────────────────────

interface SessionRow {
  id: string;
  user_id: string;
  organization_id: string | null;
  project_id: string | null;
  is_public: boolean;
  transcript_id: string | null;
  title: string;
  status: StudioSession["status"];
  module_id: string;
  started_at: string;
  ended_at: string | null;
  total_duration_ms: number;
  audio_storage_path: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

function rowToSession(row: SessionRow): StudioSession {
  return {
    id: row.id,
    userId: row.user_id,
    organizationId: row.organization_id,
    projectId: row.project_id,
    isPublic: row.is_public,
    transcriptId: row.transcript_id,
    title: row.title,
    status: row.status,
    moduleId: row.module_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    totalDurationMs: row.total_duration_ms,
    audioStoragePath: row.audio_storage_path,
    isDeleted: row.is_deleted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── studio_sessions ───────────────────────────────────────────────────

export async function listSessions(): Promise<StudioSession[]> {
  const { data, error } = await db
    .from("studio_sessions")
    .select("*")
    .eq("is_deleted", false)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(`[studio] listSessions failed: ${error.message}`);
  }
  return (data ?? []).map((row) => rowToSession(row as SessionRow));
}

export async function getSession(id: string): Promise<StudioSession | null> {
  const { data, error } = await db
    .from("studio_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`[studio] getSession failed: ${error.message}`);
  }
  return data ? rowToSession(data as SessionRow) : null;
}

export async function createSession(
  input: CreateSessionInput,
  userId: string,
): Promise<StudioSession> {
  const insert = {
    user_id: userId,
    organization_id: input.organizationId ?? null,
    project_id: input.projectId ?? null,
    transcript_id: input.transcriptId ?? null,
    title: input.title?.trim() || NEW_SESSION_DEFAULT_TITLE,
    module_id: input.moduleId ?? DEFAULT_MODULE_ID,
  };

  const { data, error } = await db
    .from("studio_sessions")
    .insert(insert)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(
      `[studio] createSession failed: ${error?.message ?? "no row returned"}`,
    );
  }
  return rowToSession(data as SessionRow);
}

export async function updateSession(
  id: string,
  patch: UpdateSessionInput,
): Promise<StudioSession> {
  const update: Record<string, unknown> = {};
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.moduleId !== undefined) update.module_id = patch.moduleId;
  if (patch.endedAt !== undefined) update.ended_at = patch.endedAt;
  if (patch.totalDurationMs !== undefined)
    update.total_duration_ms = patch.totalDurationMs;
  if (patch.audioStoragePath !== undefined)
    update.audio_storage_path = patch.audioStoragePath;
  if (patch.transcriptId !== undefined) update.transcript_id = patch.transcriptId;
  if (patch.isDeleted !== undefined) update.is_deleted = patch.isDeleted;

  const { data, error } = await db
    .from("studio_sessions")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(
      `[studio] updateSession failed: ${error?.message ?? "no row returned"}`,
    );
  }
  return rowToSession(data as SessionRow);
}

/**
 * Soft delete — flips is_deleted = true. Hard delete is reserved for admin.
 */
export async function softDeleteSession(id: string): Promise<void> {
  const { error } = await db
    .from("studio_sessions")
    .update({ is_deleted: true })
    .eq("id", id);
  if (error) {
    throw new Error(`[studio] softDeleteSession failed: ${error.message}`);
  }
}

// Server-side fetch for SSR hydration. Pass a server Supabase client built
// via utils/supabase/server.ts.
export async function listSessionsServer(
  serverClient: { from: (table: string) => unknown },
): Promise<StudioSession[]> {
  const looseClient = serverClient as unknown as LooseSupabase;
  const { data, error } = await looseClient
    .from("studio_sessions")
    .select("*")
    .eq("is_deleted", false)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) {
    throw new Error(`[studio] listSessionsServer failed: ${error.message}`);
  }
  return ((data ?? []) as SessionRow[]).map(rowToSession);
}

// ── studio_raw_segments ───────────────────────────────────────────────

interface RawSegmentRow {
  id: string;
  session_id: string;
  recording_segment_id: string | null;
  chunk_index: number;
  t_start: number | string;
  t_end: number | string;
  text: string;
  speaker: string | null;
  source: import("../types").RawSegmentSource;
}

function rowToRawSegment(
  row: RawSegmentRow,
): import("../types").RawSegment {
  return {
    id: row.id,
    sessionId: row.session_id,
    recordingSegmentId: row.recording_segment_id,
    chunkIndex: row.chunk_index,
    tStart: typeof row.t_start === "string" ? Number(row.t_start) : row.t_start,
    tEnd: typeof row.t_end === "string" ? Number(row.t_end) : row.t_end,
    text: row.text,
    speaker: row.speaker,
    source: row.source,
  };
}

export interface InsertRawSegmentInput {
  sessionId: string;
  chunkIndex: number;
  tStart: number;
  tEnd: number;
  text: string;
  recordingSegmentId?: string | null;
  speaker?: string | null;
  source?: import("../types").RawSegmentSource;
}

export async function insertRawSegment(
  input: InsertRawSegmentInput,
): Promise<import("../types").RawSegment> {
  const { data, error } = await db
    .from("studio_raw_segments")
    .insert({
      session_id: input.sessionId,
      recording_segment_id: input.recordingSegmentId ?? null,
      chunk_index: input.chunkIndex,
      t_start: input.tStart,
      t_end: input.tEnd,
      text: input.text,
      speaker: input.speaker ?? null,
      source: input.source ?? "chunk",
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(
      `[studio] insertRawSegment failed: ${error?.message ?? "no row"}`,
    );
  }
  return rowToRawSegment(data as RawSegmentRow);
}

export async function listRawSegments(
  sessionId: string,
): Promise<import("../types").RawSegment[]> {
  const { data, error } = await db
    .from("studio_raw_segments")
    .select("*")
    .eq("session_id", sessionId)
    .order("t_start", { ascending: true });
  if (error) {
    throw new Error(`[studio] listRawSegments failed: ${error.message}`);
  }
  return ((data ?? []) as RawSegmentRow[]).map(rowToRawSegment);
}

export async function listRawSegmentsServer(
  serverClient: { from: (table: string) => unknown },
  sessionId: string,
): Promise<import("../types").RawSegment[]> {
  const looseClient = serverClient as unknown as LooseSupabase;
  const { data, error } = await looseClient
    .from("studio_raw_segments")
    .select("*")
    .eq("session_id", sessionId)
    .order("t_start", { ascending: true });
  if (error) {
    throw new Error(
      `[studio] listRawSegmentsServer failed: ${error.message}`,
    );
  }
  return ((data ?? []) as RawSegmentRow[]).map(rowToRawSegment);
}

// ── studio_runs ───────────────────────────────────────────────────────

interface AgentRunRow {
  id: string;
  session_id: string;
  column_idx: number;
  conversation_id: string | null;
  shortcut_id: string | null;
  trigger_cause: import("../types").TriggerCause;
  input_char_range: string | null;
  resume_marker: string | null;
  status: import("../types").RunStatus;
  started_at: string | null;
  ended_at: string | null;
  error: string | null;
}

function rowToAgentRun(row: AgentRunRow): import("../types").AgentRun {
  // Postgres int4range serializes as "[a,b)" — parse if present.
  let inputCharRange: [number, number] | null = null;
  if (row.input_char_range) {
    const m = row.input_char_range.match(/^[\[(](\d+),(\d+)[\])]$/);
    if (m) inputCharRange = [Number(m[1]), Number(m[2])];
  }
  return {
    id: row.id,
    sessionId: row.session_id,
    columnIdx: row.column_idx as 2 | 3 | 4,
    conversationId: row.conversation_id,
    shortcutId: row.shortcut_id,
    triggerCause: row.trigger_cause,
    inputCharRange,
    resumeMarker: row.resume_marker,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    error: row.error,
  };
}

export interface InsertAgentRunInput {
  sessionId: string;
  columnIdx: 2 | 3 | 4;
  shortcutId: string;
  triggerCause: import("../types").TriggerCause;
  resumeMarker?: string | null;
  inputCharRange?: [number, number] | null;
}

export async function insertAgentRun(
  input: InsertAgentRunInput,
): Promise<import("../types").AgentRun> {
  const insert: Record<string, unknown> = {
    session_id: input.sessionId,
    column_idx: input.columnIdx,
    shortcut_id: input.shortcutId,
    trigger_cause: input.triggerCause,
    status: "running",
    started_at: new Date().toISOString(),
  };
  if (input.resumeMarker !== undefined) insert.resume_marker = input.resumeMarker;
  if (input.inputCharRange) {
    insert.input_char_range = `[${input.inputCharRange[0]},${input.inputCharRange[1]})`;
  }
  const { data, error } = await db
    .from("studio_runs")
    .insert(insert)
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(
      `[studio] insertAgentRun failed: ${error?.message ?? "no row"}`,
    );
  }
  return rowToAgentRun(data as AgentRunRow);
}

export interface FinalizeAgentRunInput {
  id: string;
  status: "complete" | "failed";
  conversationId?: string | null;
  error?: string | null;
}

export async function finalizeAgentRun(
  input: FinalizeAgentRunInput,
): Promise<import("../types").AgentRun> {
  const update: Record<string, unknown> = {
    status: input.status,
    ended_at: new Date().toISOString(),
  };
  if (input.conversationId !== undefined)
    update.conversation_id = input.conversationId;
  if (input.error !== undefined) update.error = input.error;
  const { data, error } = await db
    .from("studio_runs")
    .update(update)
    .eq("id", input.id)
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(
      `[studio] finalizeAgentRun failed: ${error?.message ?? "no row"}`,
    );
  }
  return rowToAgentRun(data as AgentRunRow);
}

// ── studio_cleaned_segments ──────────────────────────────────────────

interface CleanedSegmentRow {
  id: string;
  session_id: string;
  run_id: string | null;
  pass_index: number;
  t_start: number | string;
  t_end: number | string;
  text: string;
  trigger_cause: import("../types").TriggerCause;
  superseded_at: string | null;
}

function rowToCleanedSegment(
  row: CleanedSegmentRow,
): import("../types").CleanedSegment {
  return {
    id: row.id,
    sessionId: row.session_id,
    runId: row.run_id,
    passIndex: row.pass_index,
    tStart: typeof row.t_start === "string" ? Number(row.t_start) : row.t_start,
    tEnd: typeof row.t_end === "string" ? Number(row.t_end) : row.t_end,
    text: row.text,
    triggerCause: row.trigger_cause,
    supersededAt: row.superseded_at,
  };
}

export async function listCleanedSegments(
  sessionId: string,
): Promise<import("../types").CleanedSegment[]> {
  // Active rows only — superseded ones stay in the DB for audit but never
  // surface to the UI.
  const { data, error } = await db
    .from("studio_cleaned_segments")
    .select("*")
    .eq("session_id", sessionId)
    .is("superseded_at", null)
    .order("t_start", { ascending: true });
  if (error) {
    throw new Error(
      `[studio] listCleanedSegments failed: ${error.message}`,
    );
  }
  return ((data ?? []) as CleanedSegmentRow[]).map(rowToCleanedSegment);
}

export async function listCleanedSegmentsServer(
  serverClient: { from: (table: string) => unknown },
  sessionId: string,
): Promise<import("../types").CleanedSegment[]> {
  const looseClient = serverClient as unknown as LooseSupabase;
  const { data, error } = await looseClient
    .from("studio_cleaned_segments")
    .select("*")
    .eq("session_id", sessionId)
    .is("superseded_at", null)
    .order("t_start", { ascending: true });
  if (error) {
    throw new Error(
      `[studio] listCleanedSegmentsServer failed: ${error.message}`,
    );
  }
  return ((data ?? []) as CleanedSegmentRow[]).map(rowToCleanedSegment);
}

/**
 * Atomically insert a new cleaned segment AND mark prior overlapping segments
 * as superseded. The supersede pass stamps any active row whose `t_start >=
 * replaceFromTime` so the next list query returns only the latest pass for
 * each time range.
 *
 * Performed as two sequential statements (Supabase doesn't expose explicit
 * transactions over PostgREST). The supersede update happens FIRST so a
 * concurrent reader can never see two overlapping active rows.
 */
export interface ApplyCleanupRunInput {
  sessionId: string;
  runId: string;
  passIndex: number;
  tStart: number;
  tEnd: number;
  text: string;
  triggerCause: import("../types").TriggerCause;
}

export async function applyCleanupRun(
  input: ApplyCleanupRunInput,
): Promise<import("../types").CleanedSegment> {
  const supersedeAt = new Date().toISOString();

  // Step 1: stamp prior overlapping rows as superseded.
  const { error: supersedeError } = await db
    .from("studio_cleaned_segments")
    .update({ superseded_at: supersedeAt })
    .eq("session_id", input.sessionId)
    .is("superseded_at", null)
    .gte("t_start", input.tStart);
  if (supersedeError) {
    throw new Error(
      `[studio] applyCleanupRun supersede failed: ${supersedeError.message}`,
    );
  }

  // Step 2: insert the new active row.
  const { data, error: insertError } = await db
    .from("studio_cleaned_segments")
    .insert({
      session_id: input.sessionId,
      run_id: input.runId,
      pass_index: input.passIndex,
      t_start: input.tStart,
      t_end: input.tEnd,
      text: input.text,
      trigger_cause: input.triggerCause,
    })
    .select("*")
    .single();
  if (insertError || !data) {
    throw new Error(
      `[studio] applyCleanupRun insert failed: ${insertError?.message ?? "no row"}`,
    );
  }
  return rowToCleanedSegment(data as CleanedSegmentRow);
}
