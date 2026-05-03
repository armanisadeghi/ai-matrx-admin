-- ============================================================
-- Transcript Studio — Phase 1 schema
-- ============================================================
-- Eight tables for the 4-column live capture + multi-agent workspace.
--   1. studio_sessions          (parent)
--   2. studio_recording_segments (one per start/stop)
--   3. studio_raw_segments       (Column 1 — append-only chunk log)
--   4. studio_cleaned_segments   (Column 2 — versioned, supersession via supersededAt)
--   5. studio_concept_items      (Column 3)
--   6. studio_module_segments    (Column 4 — pluggable, polymorphic payload)
--   7. studio_runs               (agent invocation audit trail)
--   8. studio_session_settings   (1:1 with session — per-session overrides)
--
-- RLS follows the canonical check_resource_access(...) pattern in use on
-- code_files / code_repositories. Child tables inherit access via EXISTS
-- on the parent studio_sessions row.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. studio_sessions (parent)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.studio_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-scope (matches code_files / shared resource pattern)
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  project_id      uuid,
  is_public       boolean NOT NULL DEFAULT false,

  -- Bidirectional bridge to features/transcripts/
  transcript_id   uuid REFERENCES public.transcripts(id) ON DELETE SET NULL,

  -- Studio-specific
  title             text NOT NULL DEFAULT 'New Session',
  status            text NOT NULL DEFAULT 'idle'
                    CHECK (status IN ('idle','recording','paused','stopped','errored')),
  module_id         text NOT NULL DEFAULT 'tasks',
  started_at        timestamptz NOT NULL DEFAULT now(),
  ended_at          timestamptz,
  total_duration_ms integer NOT NULL DEFAULT 0,
  audio_storage_path text,
  is_deleted        boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_sessions_user_updated
  ON public.studio_sessions(user_id, updated_at DESC)
  WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_studio_sessions_org
  ON public.studio_sessions(organization_id)
  WHERE organization_id IS NOT NULL AND is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_studio_sessions_project
  ON public.studio_sessions(project_id)
  WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_studio_sessions_transcript
  ON public.studio_sessions(transcript_id)
  WHERE transcript_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_studio_sessions_public
  ON public.studio_sessions(id)
  WHERE is_public = true AND is_deleted = false;

DROP TRIGGER IF EXISTS studio_sessions_updated_at ON public.studio_sessions;
CREATE TRIGGER studio_sessions_updated_at
  BEFORE UPDATE ON public.studio_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.studio_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "studio_sessions_public_read" ON public.studio_sessions;
DROP POLICY IF EXISTS "studio_sessions_select"      ON public.studio_sessions;
DROP POLICY IF EXISTS "studio_sessions_insert"      ON public.studio_sessions;
DROP POLICY IF EXISTS "studio_sessions_update"      ON public.studio_sessions;
DROP POLICY IF EXISTS "studio_sessions_delete"      ON public.studio_sessions;
DROP POLICY IF EXISTS "studio_sessions_service_role" ON public.studio_sessions;

CREATE POLICY "studio_sessions_public_read" ON public.studio_sessions
  FOR SELECT TO anon, authenticated
  USING (is_public = true AND is_deleted = false);

CREATE POLICY "studio_sessions_select" ON public.studio_sessions
  FOR SELECT TO authenticated
  USING (check_resource_access(
    'studio_sessions', id, 'viewer', user_id, NULL::uuid, project_id, organization_id
  ));

CREATE POLICY "studio_sessions_insert" ON public.studio_sessions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "studio_sessions_update" ON public.studio_sessions
  FOR UPDATE TO authenticated
  USING (check_resource_access(
    'studio_sessions', id, 'editor', user_id, NULL::uuid, project_id, organization_id
  ))
  WITH CHECK (check_resource_access(
    'studio_sessions', id, 'editor', user_id, NULL::uuid, project_id, organization_id
  ));

CREATE POLICY "studio_sessions_delete" ON public.studio_sessions
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR check_resource_access(
      'studio_sessions', id, 'admin', user_id, NULL::uuid, project_id, organization_id
    )
  );

CREATE POLICY "studio_sessions_service_role" ON public.studio_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE  public.studio_sessions IS
  'Transcript Studio: parent session row. One per recording workspace. transcript_id back-links to a regular transcripts row when the session was promoted from one or saved back as one.';
COMMENT ON COLUMN public.studio_sessions.transcript_id IS
  'Optional bidirectional link to public.transcripts. NULL = standalone studio session.';
COMMENT ON COLUMN public.studio_sessions.module_id IS
  'Active module for Column 4 (e.g. tasks, flashcards, decisions, quiz). Module switch keeps prior segments tagged with their original module_id.';

-- ============================================================
-- Reusable helper: child-table policy macros via EXISTS on parent
-- ============================================================
-- We can't easily DRY this in SQL, so each child table gets the same
-- five policies inline. Pattern: parent's check_resource_access decides.

-- ------------------------------------------------------------
-- 2. studio_recording_segments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.studio_recording_segments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES public.studio_sessions(id) ON DELETE CASCADE,
  segment_index integer NOT NULL,
  t_start     numeric(12,3) NOT NULL,
  t_end       numeric(12,3),
  audio_path  text,
  started_at  timestamptz NOT NULL,
  ended_at    timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, segment_index)
);

CREATE INDEX IF NOT EXISTS idx_studio_recording_segments_session
  ON public.studio_recording_segments(session_id, segment_index);

DROP TRIGGER IF EXISTS studio_recording_segments_updated_at ON public.studio_recording_segments;
CREATE TRIGGER studio_recording_segments_updated_at
  BEFORE UPDATE ON public.studio_recording_segments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.studio_recording_segments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "studio_recording_segments_public_read" ON public.studio_recording_segments;
DROP POLICY IF EXISTS "studio_recording_segments_select"      ON public.studio_recording_segments;
DROP POLICY IF EXISTS "studio_recording_segments_insert"      ON public.studio_recording_segments;
DROP POLICY IF EXISTS "studio_recording_segments_update"      ON public.studio_recording_segments;
DROP POLICY IF EXISTS "studio_recording_segments_delete"      ON public.studio_recording_segments;
DROP POLICY IF EXISTS "studio_recording_segments_service_role" ON public.studio_recording_segments;

CREATE POLICY "studio_recording_segments_public_read" ON public.studio_recording_segments
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_recording_segments.session_id
      AND s.is_public = true AND s.is_deleted = false
  ));

CREATE POLICY "studio_recording_segments_select" ON public.studio_recording_segments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_recording_segments.session_id
      AND check_resource_access(
        'studio_sessions', s.id, 'viewer', s.user_id, NULL::uuid, s.project_id, s.organization_id
      )
  ));

CREATE POLICY "studio_recording_segments_insert" ON public.studio_recording_segments
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_recording_segments.session_id
      AND check_resource_access(
        'studio_sessions', s.id, 'editor', s.user_id, NULL::uuid, s.project_id, s.organization_id
      )
  ));

CREATE POLICY "studio_recording_segments_update" ON public.studio_recording_segments
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_recording_segments.session_id
      AND check_resource_access(
        'studio_sessions', s.id, 'editor', s.user_id, NULL::uuid, s.project_id, s.organization_id
      )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_recording_segments.session_id
      AND check_resource_access(
        'studio_sessions', s.id, 'editor', s.user_id, NULL::uuid, s.project_id, s.organization_id
      )
  ));

CREATE POLICY "studio_recording_segments_delete" ON public.studio_recording_segments
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_recording_segments.session_id
      AND check_resource_access(
        'studio_sessions', s.id, 'admin', s.user_id, NULL::uuid, s.project_id, s.organization_id
      )
  ));

CREATE POLICY "studio_recording_segments_service_role" ON public.studio_recording_segments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- 3. studio_raw_segments (Column 1)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.studio_raw_segments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            uuid NOT NULL REFERENCES public.studio_sessions(id) ON DELETE CASCADE,
  recording_segment_id  uuid REFERENCES public.studio_recording_segments(id) ON DELETE SET NULL,
  chunk_index           integer NOT NULL,
  t_start               numeric(12,3) NOT NULL,
  t_end                 numeric(12,3) NOT NULL,
  text                  text NOT NULL,
  speaker               text,
  source                text NOT NULL DEFAULT 'chunk' CHECK (source IN ('chunk','fallback','imported','manual')),
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_raw_segments_session_time
  ON public.studio_raw_segments(session_id, t_start);
CREATE INDEX IF NOT EXISTS idx_studio_raw_segments_recording
  ON public.studio_raw_segments(recording_segment_id)
  WHERE recording_segment_id IS NOT NULL;

ALTER TABLE public.studio_raw_segments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "studio_raw_segments_public_read" ON public.studio_raw_segments;
DROP POLICY IF EXISTS "studio_raw_segments_select"      ON public.studio_raw_segments;
DROP POLICY IF EXISTS "studio_raw_segments_insert"      ON public.studio_raw_segments;
DROP POLICY IF EXISTS "studio_raw_segments_update"      ON public.studio_raw_segments;
DROP POLICY IF EXISTS "studio_raw_segments_delete"      ON public.studio_raw_segments;
DROP POLICY IF EXISTS "studio_raw_segments_service_role" ON public.studio_raw_segments;

CREATE POLICY "studio_raw_segments_public_read" ON public.studio_raw_segments
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_raw_segments.session_id
      AND s.is_public = true AND s.is_deleted = false
  ));

CREATE POLICY "studio_raw_segments_select" ON public.studio_raw_segments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_raw_segments.session_id
      AND check_resource_access(
        'studio_sessions', s.id, 'viewer', s.user_id, NULL::uuid, s.project_id, s.organization_id
      )
  ));

CREATE POLICY "studio_raw_segments_insert" ON public.studio_raw_segments
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_raw_segments.session_id
      AND check_resource_access(
        'studio_sessions', s.id, 'editor', s.user_id, NULL::uuid, s.project_id, s.organization_id
      )
  ));

CREATE POLICY "studio_raw_segments_update" ON public.studio_raw_segments
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_raw_segments.session_id
      AND check_resource_access(
        'studio_sessions', s.id, 'editor', s.user_id, NULL::uuid, s.project_id, s.organization_id
      )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_raw_segments.session_id
      AND check_resource_access(
        'studio_sessions', s.id, 'editor', s.user_id, NULL::uuid, s.project_id, s.organization_id
      )
  ));

CREATE POLICY "studio_raw_segments_delete" ON public.studio_raw_segments
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_raw_segments.session_id
      AND check_resource_access(
        'studio_sessions', s.id, 'admin', s.user_id, NULL::uuid, s.project_id, s.organization_id
      )
  ));

CREATE POLICY "studio_raw_segments_service_role" ON public.studio_raw_segments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- 7. studio_runs (agent invocation audit) — declared early because cleaned/concept/module reference it
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.studio_runs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        uuid NOT NULL REFERENCES public.studio_sessions(id) ON DELETE CASCADE,
  column_idx        smallint NOT NULL CHECK (column_idx IN (2,3,4)),
  conversation_id   uuid,
  shortcut_id       uuid,
  trigger_cause     text NOT NULL CHECK (trigger_cause IN ('interval','session-start','session-stop','manual','module-switch')),
  input_char_range  int4range,
  resume_marker     text,
  status            text NOT NULL DEFAULT 'queued'
                    CHECK (status IN ('queued','running','complete','failed')),
  started_at        timestamptz,
  ended_at          timestamptz,
  error             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_runs_session_col
  ON public.studio_runs(session_id, column_idx, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_studio_runs_status
  ON public.studio_runs(status)
  WHERE status IN ('queued','running');

ALTER TABLE public.studio_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "studio_runs_public_read" ON public.studio_runs;
DROP POLICY IF EXISTS "studio_runs_select"      ON public.studio_runs;
DROP POLICY IF EXISTS "studio_runs_insert"      ON public.studio_runs;
DROP POLICY IF EXISTS "studio_runs_update"      ON public.studio_runs;
DROP POLICY IF EXISTS "studio_runs_delete"      ON public.studio_runs;
DROP POLICY IF EXISTS "studio_runs_service_role" ON public.studio_runs;

CREATE POLICY "studio_runs_public_read" ON public.studio_runs
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_runs.session_id
      AND s.is_public = true AND s.is_deleted = false
  ));

CREATE POLICY "studio_runs_select" ON public.studio_runs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_runs.session_id
      AND check_resource_access(
        'studio_sessions', s.id, 'viewer', s.user_id, NULL::uuid, s.project_id, s.organization_id
      )
  ));

CREATE POLICY "studio_runs_insert" ON public.studio_runs
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_runs.session_id
      AND check_resource_access(
        'studio_sessions', s.id, 'editor', s.user_id, NULL::uuid, s.project_id, s.organization_id
      )
  ));

CREATE POLICY "studio_runs_update" ON public.studio_runs
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_runs.session_id
      AND check_resource_access(
        'studio_sessions', s.id, 'editor', s.user_id, NULL::uuid, s.project_id, s.organization_id
      )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_runs.session_id
      AND check_resource_access(
        'studio_sessions', s.id, 'editor', s.user_id, NULL::uuid, s.project_id, s.organization_id
      )
  ));

CREATE POLICY "studio_runs_delete" ON public.studio_runs
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_runs.session_id
      AND check_resource_access(
        'studio_sessions', s.id, 'admin', s.user_id, NULL::uuid, s.project_id, s.organization_id
      )
  ));

CREATE POLICY "studio_runs_service_role" ON public.studio_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- 4. studio_cleaned_segments (Column 2)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.studio_cleaned_segments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES public.studio_sessions(id) ON DELETE CASCADE,
  run_id          uuid REFERENCES public.studio_runs(id) ON DELETE SET NULL,
  pass_index      integer NOT NULL,
  t_start         numeric(12,3) NOT NULL,
  t_end           numeric(12,3) NOT NULL,
  text            text NOT NULL,
  trigger_cause   text NOT NULL CHECK (trigger_cause IN ('interval','session-start','session-stop','manual','module-switch')),
  superseded_at   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_cleaned_session_active_time
  ON public.studio_cleaned_segments(session_id, t_start)
  WHERE superseded_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_studio_cleaned_run
  ON public.studio_cleaned_segments(run_id)
  WHERE run_id IS NOT NULL;

ALTER TABLE public.studio_cleaned_segments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "studio_cleaned_segments_public_read" ON public.studio_cleaned_segments;
DROP POLICY IF EXISTS "studio_cleaned_segments_select"      ON public.studio_cleaned_segments;
DROP POLICY IF EXISTS "studio_cleaned_segments_insert"      ON public.studio_cleaned_segments;
DROP POLICY IF EXISTS "studio_cleaned_segments_update"      ON public.studio_cleaned_segments;
DROP POLICY IF EXISTS "studio_cleaned_segments_delete"      ON public.studio_cleaned_segments;
DROP POLICY IF EXISTS "studio_cleaned_segments_service_role" ON public.studio_cleaned_segments;

CREATE POLICY "studio_cleaned_segments_public_read" ON public.studio_cleaned_segments
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_cleaned_segments.session_id
      AND s.is_public = true AND s.is_deleted = false
  ));

CREATE POLICY "studio_cleaned_segments_select" ON public.studio_cleaned_segments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_cleaned_segments.session_id
      AND check_resource_access(
        'studio_sessions', s.id, 'viewer', s.user_id, NULL::uuid, s.project_id, s.organization_id
      )
  ));

CREATE POLICY "studio_cleaned_segments_insert" ON public.studio_cleaned_segments
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_cleaned_segments.session_id
      AND check_resource_access(
        'studio_sessions', s.id, 'editor', s.user_id, NULL::uuid, s.project_id, s.organization_id
      )
  ));

CREATE POLICY "studio_cleaned_segments_update" ON public.studio_cleaned_segments
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_cleaned_segments.session_id
      AND check_resource_access(
        'studio_sessions', s.id, 'editor', s.user_id, NULL::uuid, s.project_id, s.organization_id
      )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_cleaned_segments.session_id
      AND check_resource_access(
        'studio_sessions', s.id, 'editor', s.user_id, NULL::uuid, s.project_id, s.organization_id
      )
  ));

CREATE POLICY "studio_cleaned_segments_delete" ON public.studio_cleaned_segments
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_cleaned_segments.session_id
      AND check_resource_access(
        'studio_sessions', s.id, 'admin', s.user_id, NULL::uuid, s.project_id, s.organization_id
      )
  ));

CREATE POLICY "studio_cleaned_segments_service_role" ON public.studio_cleaned_segments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- 5. studio_concept_items (Column 3)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.studio_concept_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES public.studio_sessions(id) ON DELETE CASCADE,
  run_id          uuid REFERENCES public.studio_runs(id) ON DELETE SET NULL,
  pass_index      integer NOT NULL,
  t_start         numeric(12,3),
  t_end           numeric(12,3),
  kind            text NOT NULL CHECK (kind IN ('theme','key_idea','entity','question','other')),
  label           text NOT NULL,
  description     text,
  confidence      real,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_concepts_session_time
  ON public.studio_concept_items(session_id, t_start);
CREATE INDEX IF NOT EXISTS idx_studio_concepts_run
  ON public.studio_concept_items(run_id)
  WHERE run_id IS NOT NULL;

ALTER TABLE public.studio_concept_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "studio_concept_items_public_read" ON public.studio_concept_items;
DROP POLICY IF EXISTS "studio_concept_items_select"      ON public.studio_concept_items;
DROP POLICY IF EXISTS "studio_concept_items_insert"      ON public.studio_concept_items;
DROP POLICY IF EXISTS "studio_concept_items_update"      ON public.studio_concept_items;
DROP POLICY IF EXISTS "studio_concept_items_delete"      ON public.studio_concept_items;
DROP POLICY IF EXISTS "studio_concept_items_service_role" ON public.studio_concept_items;

CREATE POLICY "studio_concept_items_public_read" ON public.studio_concept_items
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_concept_items.session_id
      AND s.is_public = true AND s.is_deleted = false
  ));

CREATE POLICY "studio_concept_items_select" ON public.studio_concept_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_concept_items.session_id
      AND check_resource_access(
        'studio_sessions', s.id, 'viewer', s.user_id, NULL::uuid, s.project_id, s.organization_id
      )
  ));

CREATE POLICY "studio_concept_items_insert" ON public.studio_concept_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_concept_items.session_id
      AND check_resource_access(
        'studio_sessions', s.id, 'editor', s.user_id, NULL::uuid, s.project_id, s.organization_id
      )
  ));

CREATE POLICY "studio_concept_items_update" ON public.studio_concept_items
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_concept_items.session_id
      AND check_resource_access(
        'studio_sessions', s.id, 'editor', s.user_id, NULL::uuid, s.project_id, s.organization_id
      )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_concept_items.session_id
      AND check_resource_access(
        'studio_sessions', s.id, 'editor', s.user_id, NULL::uuid, s.project_id, s.organization_id
      )
  ));

CREATE POLICY "studio_concept_items_delete" ON public.studio_concept_items
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_concept_items.session_id
      AND check_resource_access(
        'studio_sessions', s.id, 'admin', s.user_id, NULL::uuid, s.project_id, s.organization_id
      )
  ));

CREATE POLICY "studio_concept_items_service_role" ON public.studio_concept_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- 6. studio_module_segments (Column 4 — polymorphic)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.studio_module_segments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES public.studio_sessions(id) ON DELETE CASCADE,
  run_id          uuid REFERENCES public.studio_runs(id) ON DELETE SET NULL,
  pass_index      integer NOT NULL,
  module_id       text NOT NULL,
  block_type      text NOT NULL,
  t_start         numeric(12,3),
  t_end           numeric(12,3),
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_module_session_module_time
  ON public.studio_module_segments(session_id, module_id, t_start);
CREATE INDEX IF NOT EXISTS idx_studio_module_run
  ON public.studio_module_segments(run_id)
  WHERE run_id IS NOT NULL;

ALTER TABLE public.studio_module_segments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "studio_module_segments_public_read" ON public.studio_module_segments;
DROP POLICY IF EXISTS "studio_module_segments_select"      ON public.studio_module_segments;
DROP POLICY IF EXISTS "studio_module_segments_insert"      ON public.studio_module_segments;
DROP POLICY IF EXISTS "studio_module_segments_update"      ON public.studio_module_segments;
DROP POLICY IF EXISTS "studio_module_segments_delete"      ON public.studio_module_segments;
DROP POLICY IF EXISTS "studio_module_segments_service_role" ON public.studio_module_segments;

CREATE POLICY "studio_module_segments_public_read" ON public.studio_module_segments
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_module_segments.session_id
      AND s.is_public = true AND s.is_deleted = false
  ));

CREATE POLICY "studio_module_segments_select" ON public.studio_module_segments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_module_segments.session_id
      AND check_resource_access(
        'studio_sessions', s.id, 'viewer', s.user_id, NULL::uuid, s.project_id, s.organization_id
      )
  ));

CREATE POLICY "studio_module_segments_insert" ON public.studio_module_segments
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_module_segments.session_id
      AND check_resource_access(
        'studio_sessions', s.id, 'editor', s.user_id, NULL::uuid, s.project_id, s.organization_id
      )
  ));

CREATE POLICY "studio_module_segments_update" ON public.studio_module_segments
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_module_segments.session_id
      AND check_resource_access(
        'studio_sessions', s.id, 'editor', s.user_id, NULL::uuid, s.project_id, s.organization_id
      )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_module_segments.session_id
      AND check_resource_access(
        'studio_sessions', s.id, 'editor', s.user_id, NULL::uuid, s.project_id, s.organization_id
      )
  ));

CREATE POLICY "studio_module_segments_delete" ON public.studio_module_segments
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_module_segments.session_id
      AND check_resource_access(
        'studio_sessions', s.id, 'admin', s.user_id, NULL::uuid, s.project_id, s.organization_id
      )
  ));

CREATE POLICY "studio_module_segments_service_role" ON public.studio_module_segments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- 8. studio_session_settings (1:1 with session)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.studio_session_settings (
  session_id              uuid PRIMARY KEY REFERENCES public.studio_sessions(id) ON DELETE CASCADE,
  cleaning_shortcut_id    uuid,
  cleaning_interval_ms    integer NOT NULL DEFAULT 30000
                          CHECK (cleaning_interval_ms BETWEEN 15000 AND 120000),
  concept_shortcut_id     uuid,
  concept_interval_ms     integer NOT NULL DEFAULT 200000
                          CHECK (concept_interval_ms BETWEEN 60000 AND 600000),
  module_id               text NOT NULL DEFAULT 'tasks',
  module_shortcut_id      uuid,
  module_interval_ms      integer
                          CHECK (module_interval_ms IS NULL OR module_interval_ms BETWEEN 15000 AND 1800000),
  column_widths           jsonb,
  show_prior_modules      boolean NOT NULL DEFAULT false,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS studio_session_settings_updated_at ON public.studio_session_settings;
CREATE TRIGGER studio_session_settings_updated_at
  BEFORE UPDATE ON public.studio_session_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.studio_session_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "studio_session_settings_public_read" ON public.studio_session_settings;
DROP POLICY IF EXISTS "studio_session_settings_select"      ON public.studio_session_settings;
DROP POLICY IF EXISTS "studio_session_settings_insert"      ON public.studio_session_settings;
DROP POLICY IF EXISTS "studio_session_settings_update"      ON public.studio_session_settings;
DROP POLICY IF EXISTS "studio_session_settings_delete"      ON public.studio_session_settings;
DROP POLICY IF EXISTS "studio_session_settings_service_role" ON public.studio_session_settings;

CREATE POLICY "studio_session_settings_public_read" ON public.studio_session_settings
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_session_settings.session_id
      AND s.is_public = true AND s.is_deleted = false
  ));

CREATE POLICY "studio_session_settings_select" ON public.studio_session_settings
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_session_settings.session_id
      AND check_resource_access(
        'studio_sessions', s.id, 'viewer', s.user_id, NULL::uuid, s.project_id, s.organization_id
      )
  ));

CREATE POLICY "studio_session_settings_insert" ON public.studio_session_settings
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_session_settings.session_id
      AND check_resource_access(
        'studio_sessions', s.id, 'editor', s.user_id, NULL::uuid, s.project_id, s.organization_id
      )
  ));

CREATE POLICY "studio_session_settings_update" ON public.studio_session_settings
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_session_settings.session_id
      AND check_resource_access(
        'studio_sessions', s.id, 'editor', s.user_id, NULL::uuid, s.project_id, s.organization_id
      )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_session_settings.session_id
      AND check_resource_access(
        'studio_sessions', s.id, 'editor', s.user_id, NULL::uuid, s.project_id, s.organization_id
      )
  ));

CREATE POLICY "studio_session_settings_delete" ON public.studio_session_settings
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.studio_sessions s
    WHERE s.id = studio_session_settings.session_id
      AND check_resource_access(
        'studio_sessions', s.id, 'admin', s.user_id, NULL::uuid, s.project_id, s.organization_id
      )
  ));

CREATE POLICY "studio_session_settings_service_role" ON public.studio_session_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;
