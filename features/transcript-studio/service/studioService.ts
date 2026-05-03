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
